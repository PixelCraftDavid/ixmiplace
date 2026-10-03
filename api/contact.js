import { createHash } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { logApiFailure, logSecurityEvent, parseBody, requestSchemas } from './_lib/input-security.js';

const APP_ORIGIN = process.env.APP_ORIGIN || 'https://ixmiplace.vercel.app';
const GLOBAL_DAILY_LIMIT = 30;
const PER_LISTING_DAILY_LIMIT = 2;
const IP_DAILY_LIMIT = 80;
const RATE_LIMIT_RETENTION_MS = 8 * 24 * 60 * 60 * 1000;

function respond(res, status, body) {
  return res.status(status).json(body);
}

function getFirebaseAdmin() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials.');
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

function utcDay() {
  return new Date().toISOString().slice(0, 10);
}

function hashedClientIp(req, day) {
  const ip = req.headers['x-real-ip']?.trim();
  if (!ip) return null;
  return createHash('sha256').update(`${day}:${ip}`).digest('hex');
}

async function consumeContactLimits(db, { uid, listingId, ipHash, day }) {
  const limits = db.collection('contactRateLimits');
  const listingRef = db.collection('listings').doc(listingId);
  const globalRef = limits.doc(`user_${uid}_${day}`);
  const perListingRef = limits.doc(`listing_${uid}_${listingId}_${day}`);
  const ipRef = ipHash ? limits.doc(`ip_${ipHash}_${day}`) : null;

  return db.runTransaction(async (transaction) => {
    const refs = [globalRef, perListingRef, ...(ipRef ? [ipRef] : []), listingRef];
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
    const globalCount = snapshots[0].data()?.count ?? 0;
    const listingCount = snapshots[1].data()?.count ?? 0;
    const ipCount = ipRef ? snapshots[2].data()?.count ?? 0 : 0;
    const listingSnapshot = snapshots[snapshots.length - 1];
    const listing = listingSnapshot.data();

    if (globalCount >= GLOBAL_DAILY_LIMIT) return false;
    if (listingCount >= PER_LISTING_DAILY_LIMIT) return false;
    if (ipRef && ipCount >= IP_DAILY_LIMIT) return false;
    if (!listingSnapshot.exists || listing.status !== 'published'
      || !Number.isSafeInteger(listing.expiresAt) || listing.expiresAt <= Date.now()) return false;

    const expiresAt = Timestamp.fromMillis(Date.now() + RATE_LIMIT_RETENTION_MS);
    const common = { updatedAt: FieldValue.serverTimestamp(), expiresAt };
    transaction.set(globalRef, { ...common, count: globalCount + 1 });
    transaction.set(perListingRef, { ...common, count: listingCount + 1 });
    if (ipRef) transaction.set(ipRef, { ...common, count: ipCount + 1 });
    transaction.update(listingRef, { whatsappContactsCount: FieldValue.increment(1) });
    return true;
  });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Vary', 'Origin');

  const origin = req.headers.origin;
  if (origin && origin !== APP_ORIGIN) {
    logSecurityEvent(req, 'blocked_origin');
    return respond(res, 403, { error: 'Origen no permitido.' });
  }
  if (origin) res.setHeader('Access-Control-Allow-Origin', APP_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Firebase-AppCheck');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') { logSecurityEvent(req, 'blocked_method'); return respond(res, 405, { error: 'Método no permitido.' }); }

  try {
    const authorization = req.headers.authorization || '';
    const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const appCheckToken = req.headers['x-firebase-appcheck'];
    if (!idToken || typeof appCheckToken !== 'string') {
      logSecurityEvent(req, 'missing_auth_or_app_check');
      return respond(res, 401, { error: 'Se requiere sesión y App Check válido.' });
    }

    const app = getFirebaseAdmin();
    const [decoded] = await Promise.all([
      getAuth(app).verifyIdToken(idToken, true),
      getAppCheck(app).verifyToken(appCheckToken),
    ]);

    if (decoded.email_verified !== true) {
      return respond(res, 403, { error: 'Verifica tu correo antes de consultar el contacto.' });
    }

    const input = parseBody(requestSchemas.contact, req.body);
    if (!input) {
      logSecurityEvent(req, 'invalid_contact_request', decoded.uid);
      return respond(res, 400, { error: 'Identificador de publicación inválido.' });
    }
    const { listingId } = input;

    const db = getFirestore(app);
    const userSnap = await db.collection('users').doc(decoded.uid).get();
    const user = userSnap.data();
    if (!user || user.isBanned === true || user.privacyConsentVersion !== '2026-10-03-v9') {
      return respond(res, 403, { error: 'Cuenta no autorizada.' });
    }

    const day = utcDay();
    const allowed = await consumeContactLimits(db, {
      uid: decoded.uid,
      listingId,
      ipHash: hashedClientIp(req, day),
      day,
    });
    if (!allowed) {
      return respond(res, 429, { error: 'Alcanzaste el límite de consultas de contacto. Intenta mañana.' });
    }

    const listingSnap = await db.collection('listings').doc(listingId).get();
    const listing = listingSnap.data();
    if (!listingSnap.exists || listing.status !== 'published' || !Number.isSafeInteger(listing.expiresAt) || listing.expiresAt <= Date.now()) {
      return respond(res, 404, { error: 'Publicación no disponible.' });
    }
    if (listing.ownerId === decoded.uid) {
      return respond(res, 403, { error: 'No puedes consultar tu propio contacto.' });
    }
    if (listing.showPhone !== true) {
      return respond(res, 404, { error: 'El propietario no ofrece contacto por WhatsApp.' });
    }

    const privateSnap = await db.collection('listingPrivateDetails').doc(listingId).get();
    const privateDetails = privateSnap.data();
    const phone = privateDetails?.whatsapp;
    if (!privateSnap.exists || privateDetails?.ownerId !== listing.ownerId || typeof phone !== 'string' || !/^\d{10}$/.test(phone)) {
      return respond(res, 404, { error: 'El contacto no está disponible.' });
    }

    const ownerSnap = await db.collection('users').doc(listing.ownerId).get();
    const owner = ownerSnap.data();
    if (!owner || owner.isBanned === true || owner.phoneConsentVersion !== '2026-09-30-v4') {
      return respond(res, 404, { error: 'El contacto no está disponible.' });
    }

    const fullPhone = phone.startsWith('52') ? phone : `52${phone}`;
    const text = `Hola, vi tu anuncio "${listing.title}" en IxmiPlace. ¿Sigue disponible?`;
    return respond(res, 200, {
      url: `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`,
    });
  } catch (error) {
    logApiFailure(req, 'contact', 'request', error);
    return respond(res, 500, { error: 'No se pudo consultar el contacto. Intenta de nuevo.' });
  }
}
