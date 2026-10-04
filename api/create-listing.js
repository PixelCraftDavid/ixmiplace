import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { listingCreateRuleErrors } from '../src/features/listings/listingCreateRuleChecks.js';

const EXPECTED_PROJECT_ID = 'ixmiplace';
const TERMS_VERSION = '2026-10-03-v5';
const PRIVACY_NOTICE_VERSION = '2026-10-03-v9';
const LISTING_CONSENT_VERSION = '2026-09-26';
const LISTING_LIFETIME_DAYS = 30;

function getAdminApp() {
  const existing = getApps().find((app) => app.name === '[DEFAULT]');
  if (existing) return existing;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin no está configurado en el servidor.');
  }
  if (projectId !== EXPECTED_PROJECT_ID) {
    throw new Error('El proyecto de Firebase Admin no es el proyecto esperado.');
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

function respond(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  const error = typeof body.error === 'string' && !body.error.startsWith('PUBLICATION_CHECK:')
    ? `PUBLICATION_CHECK:${body.error}`
    : body.error;
  res.status(status).json({ ...body, ...(error ? { error } : {}) });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respond(res, 405, { error: 'Método no permitido.' });
  }

  const authorization = typeof req.headers.authorization === 'string'
    ? req.headers.authorization
    : '';
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) return respond(res, 401, { error: 'Inicia sesión para publicar.' });

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).some((key) => !['listing', 'privateDetails', 'publicationConsentAccepted', 'projectId'].includes(key))
    || !body.listing || typeof body.listing !== 'object' || Array.isArray(body.listing)
    || !body.privateDetails || typeof body.privateDetails !== 'object' || Array.isArray(body.privateDetails)) {
    return respond(res, 400, { error: 'Los datos de publicación tienen un formato inválido.' });
  }

  let app;
  try {
    app = getAdminApp();
  } catch {
    return respond(res, 503, { error: 'El servidor de publicaciones no está conectado a Firebase Admin. Revisa su configuración en Vercel.' });
  }

  let decodedToken;
  try {
    decodedToken = await getAuth(app).verifyIdToken(tokenMatch[1]);
  } catch {
    return respond(res, 401, { error: 'La sesión no es válida o expiró. Inicia sesión de nuevo.' });
  }

  if (decodedToken.aud !== EXPECTED_PROJECT_ID
    || decodedToken.iss !== `https://securetoken.google.com/${EXPECTED_PROJECT_ID}`) {
    return respond(res, 403, { error: 'La sesión pertenece a otro proyecto de Firebase.' });
  }
  if (body.projectId !== EXPECTED_PROJECT_ID) {
    return respond(res, 503, { error: 'El sitio y el servidor están conectados a proyectos Firebase distintos.' });
  }
  if (decodedToken.email_verified !== true) {
    return respond(res, 403, { error: 'Verifica tu correo antes de publicar.' });
  }
  if (typeof decodedToken.email !== 'string'
    || decodedToken.email.toLowerCase().endsWith('@dominio-temporal.com')) {
    return respond(res, 403, { error: 'Esta cuenta no puede publicar con un correo temporal.' });
  }
  if (body.publicationConsentAccepted !== true) {
    return respond(res, 400, { error: 'Confirma que tienes autorización para publicar este anuncio.' });
  }

  let stage = 'lectura_perfil';
  try {
    const firestore = getFirestore(app);
    const userSnapshot = await firestore.collection('users').doc(decodedToken.uid).get();
    if (!userSnapshot.exists) return respond(res, 403, { error: 'No se encontró tu perfil en este proyecto.' });
    const profile = userSnapshot.data() ?? {};
    if (profile.isBanned === true) return respond(res, 403, { error: 'Esta cuenta no tiene permiso para publicar.' });
    if (profile.termsAcceptedVersion !== TERMS_VERSION
      || profile.adultConfirmedVersion !== TERMS_VERSION
      || profile.privacyConsentVersion !== PRIVACY_NOTICE_VERSION) {
      return respond(res, 403, { error: 'Actualiza la aceptación de Términos, mayoría de edad y Aviso de Privacidad en tu cuenta.' });
    }

    stage = 'validacion_anuncio';
    const now = Date.now();
    const listing = {
      ...body.listing,
      ownerId: decodedToken.uid,
      ownerEmailVerified: true,
      status: 'pending',
      reportsCount: 0,
      viewsCount: 0,
      favoritesCount: 0,
      whatsappContactsCount: 0,
      createdAt: now,
      updatedAt: now,
      availabilityConfirmedAt: now,
      expiresAt: now + LISTING_LIFETIME_DAYS * 24 * 60 * 60 * 1000,
      publicationConsentVersion: LISTING_CONSENT_VERSION,
      publicationConsentAt: FieldValue.serverTimestamp(),
    };
    const privateDetails = {
      ...body.privateDetails,
      ownerId: decodedToken.uid,
      updatedAt: now,
    };
    const errors = listingCreateRuleErrors(listing, privateDetails, decodedToken.uid, now);
    if (errors.length > 0) {
      return respond(res, 400, {
        error: `El anuncio no cumple las validaciones de publicación: ${errors.join(' ')}`,
        details: errors,
      });
    }

    stage = 'escritura_firestore';
    const listingRef = firestore.collection('listings').doc();
    const batch = firestore.batch();
    batch.create(listingRef, listing);
    batch.create(firestore.collection('listingPrivateDetails').doc(listingRef.id), privateDetails);
    await batch.commit();
    return respond(res, 201, { listingId: listingRef.id });
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : 'unknown';
    console.error(JSON.stringify({ event: 'listing_create_failed', stage, code, at: new Date().toISOString() }));
    const detail = stage === 'lectura_perfil'
      ? 'El servidor no pudo consultar tu perfil en Firebase.'
      : stage === 'validacion_anuncio'
        ? 'El servidor no pudo validar los datos del anuncio.'
        : 'Firebase rechazó la escritura del anuncio.';
    return respond(res, 500, { error: `${detail} (etapa ${stage}, código ${code}).` });
  }
}
