import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { logApiFailure, logSecurityEvent, parseBody, documentIdSchema } from './_lib/input-security.js';

const EXPECTED_PROJECT_ID = 'ixmiplace';
const APP_ORIGIN = process.env.APP_ORIGIN || 'https://ixmiplace.vercel.app';
const plainText = (min, max) => z.string().trim().min(min).max(max)
  .refine((value) => !/[\u0000-\u001F\u007F<>]/.test(value));
const optionalText = (max) => z.string().trim().max(max)
  .refine((value) => !/[\u0000-\u001F\u007F<>]/.test(value));
const cost = z.number().finite().min(0).max(100000);
const requestSchema = z.object({
  listingId: documentIdSchema,
  projectId: z.literal(EXPECTED_PROJECT_ID),
  data: z.object({
    title: plainText(8, 80),
    description: plainText(30, 1500),
    currentOccupants: z.number().int().min(1).max(30),
    roommatesWantedCount: z.number().int().min(1).max(10),
    roommatePrivateRoom: z.boolean(),
    roommateFurnished: z.boolean(),
    roommateSharedBathroom: z.boolean(),
    roommateSharedKitchen: z.boolean(),
    petsAllowed: z.boolean(),
    smokingAllowed: z.boolean(),
    alcoholConsumptionAllowed: z.boolean(),
    alcoholSalesAllowed: z.boolean(),
    commercialActivityAllowed: z.boolean(),
    commercialActivityNotes: optionalText(240).optional(),
    roommatePreferences: optionalText(300).optional(),
    waterBilling: z.enum(['included', 'extra', 'unknown']),
    waterMonthlyCost: cost.optional(),
    electricityBilling: z.enum(['included', 'extra', 'unknown']),
    electricityMonthlyCost: cost.optional(),
    internetBilling: z.enum(['included', 'extra', 'unknown']),
    internetMonthlyCost: cost.optional(),
  }).strict(),
  photos: z.array(z.string().regex(/^https:\/\/res\.cloudinary\.com\/ckaf3htn\/image\/upload\/.+$/)).min(1).max(5),
  photoPublicIds: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,150}$/)).max(5).optional(),
  availability: z.enum(['available', 'unavailable']),
}).strict().superRefine((input, context) => {
  for (const service of ['water', 'electricity', 'internet']) {
    if (input.data[`${service}Billing`] === 'extra' && input.data[`${service}MonthlyCost`] === undefined) {
      context.addIssue({ code: 'custom', path: ['data', `${service}MonthlyCost`], message: 'Indica el costo del servicio que se paga aparte.' });
    }
  }
  if (input.photoPublicIds && input.photoPublicIds.length > 0 && input.photoPublicIds.length !== input.photos.length) {
    context.addIssue({ code: 'custom', path: ['photoPublicIds'], message: 'La cantidad de identificadores de fotos no coincide.' });
  }
});

function getAdminApp() {
  const existing = getApps().find((app) => app.name === '[DEFAULT]');
  if (existing) return existing;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) throw new Error('Firebase Admin no está configurado.');
  if (projectId !== EXPECTED_PROJECT_ID) throw new Error('Firebase Admin apunta a un proyecto distinto.');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
}

function respond(res, status, body) {
  res.setHeader('Cache-Control', 'no-store, private');
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  res.setHeader('Vary', 'Origin');
  const origin = req.headers.origin;
  if (origin && origin !== APP_ORIGIN) {
    logSecurityEvent(req, 'blocked_origin');
    return respond(res, 403, { error: 'Origen no permitido.' });
  }
  if (origin) res.setHeader('Access-Control-Allow-Origin', APP_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return respond(res, 405, { error: 'Método no permitido.' });

  const authorization = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) return respond(res, 401, { error: 'Inicia sesión para editar la búsqueda.' });

  const input = parseBody(requestSchema, req.body);
  if (!input) return respond(res, 400, { error: 'Los datos de edición no son válidos. Revisa los campos y las fotos.' });

  let stage = 'verify_identity';
  try {
    const app = getAdminApp();
    const user = await getAuth(app).verifyIdToken(tokenMatch[1], true);
    if (user.aud !== EXPECTED_PROJECT_ID || user.iss !== `https://securetoken.google.com/${EXPECTED_PROJECT_ID}`) {
      return respond(res, 403, { error: 'La sesión pertenece a otro proyecto de Firebase.' });
    }
    if (user.email_verified !== true) return respond(res, 403, { error: 'Verifica tu correo antes de editar.' });
    if (typeof user.email !== 'string' || user.email.toLowerCase().endsWith('@dominio-temporal.com')) {
      return respond(res, 403, { error: 'Esta cuenta no puede editar publicaciones con un correo temporal.' });
    }

    const db = getFirestore(app);
    const userRef = db.collection('users').doc(user.uid);
    const listingRef = db.collection('listings').doc(input.listingId);
    const historyRef = db.collection('listingHistory').doc();
    stage = 'read_owner_and_listing';
    const [userSnap, listingSnap] = await Promise.all([userRef.get(), listingRef.get()]);
    const profile = userSnap.data();
    const listing = listingSnap.data();
    if (!profile || profile.isBanned === true) return respond(res, 403, { error: 'Esta cuenta no tiene permiso para editar.' });
    if (!listingSnap.exists) return respond(res, 404, { error: 'La publicación ya no existe.' });
    if (listing.ownerId !== user.uid) return respond(res, 403, { error: 'Solo quien publicó esta búsqueda puede editarla.' });
    if (listing.roommateWanted !== true || listing.category !== 'cuarto' || listing.operation !== 'renta') {
      return respond(res, 409, { error: 'Esta publicación no es una búsqueda de roomie editable por este formulario.' });
    }
    const now = Date.now();
    const { data } = input;
    const updates = {
      ownerEmailVerified: true,
      title: data.title,
      description: data.description,
      availability: input.availability,
      availabilityConfirmedAt: now,
      maxGuests: data.currentOccupants + data.roommatesWantedCount,
      currentOccupants: data.currentOccupants,
      roommatesWantedCount: data.roommatesWantedCount,
      roommatePrivateRoom: data.roommatePrivateRoom,
      roommateFurnished: data.roommateFurnished,
      roommateSharedBathroom: data.roommateSharedBathroom,
      roommateSharedKitchen: data.roommateSharedKitchen,
      roommatePreferences: data.roommatePreferences || FieldValue.delete(),
      petsAllowed: data.petsAllowed,
      smokingAllowed: data.smokingAllowed,
      alcoholConsumptionAllowed: data.alcoholConsumptionAllowed,
      alcoholSalesAllowed: data.alcoholSalesAllowed,
      commercialActivityAllowed: data.commercialActivityAllowed,
      commercialActivityNotes: data.commercialActivityAllowed && data.commercialActivityNotes
        ? data.commercialActivityNotes
        : FieldValue.delete(),
      waterBilling: data.waterBilling,
      waterMonthlyCost: data.waterBilling === 'extra' ? data.waterMonthlyCost : FieldValue.delete(),
      electricityBilling: data.electricityBilling,
      electricityMonthlyCost: data.electricityBilling === 'extra' ? data.electricityMonthlyCost : FieldValue.delete(),
      internetBilling: data.internetBilling,
      internetMonthlyCost: data.internetBilling === 'extra' ? data.internetMonthlyCost : FieldValue.delete(),
      photos: input.photos,
      photoPublicIds: input.photoPublicIds?.length ? input.photoPublicIds : FieldValue.delete(),
      updatedAt: now,
    };

    stage = 'commit_edit_and_history';
    const batch = db.batch();
    batch.update(listingRef, updates);
    batch.create(historyRef, {
      listingId: input.listingId,
      actorId: user.uid,
      actorRole: 'owner',
      action: 'updated',
      changedFields: Object.keys(updates).filter((key) => key !== 'updatedAt'),
      summary: 'El propietario actualizó su búsqueda de roomie.',
      createdAt: now,
    });
    await batch.commit();
    return respond(res, 200, { ok: true });
  } catch (error) {
    logApiFailure(req, 'update_roommate_listing', stage, error);
    return respond(res, 500, { error: 'No se pudo guardar la edición. Intenta de nuevo; si continúa, contacta a soporte.' });
  }
}
