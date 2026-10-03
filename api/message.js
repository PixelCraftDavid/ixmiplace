import { createHash, randomUUID } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { logApiFailure, logSecurityEvent, parseBody, requestSchemas } from './_lib/input-security.js';

const APP_ORIGIN = process.env.APP_ORIGIN || 'https://ixmiplace.vercel.app';
const MAX_DAILY_USER = 20;
const MAX_DAILY_LISTING = 5;
const MAX_DAILY_IP = 100;
const RETENTION_MS = 8 * 24 * 60 * 60 * 1000;

function respond(res, status, body) { return res.status(status).json(body); }
function adminApp() {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) throw new Error('Missing Firebase Admin credentials.');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
}
function day() { return new Date().toISOString().slice(0, 10); }
function ipHash(req, date) {
  const header = req.headers['x-real-ip'];
  const ip = typeof header === 'string' ? header.trim() : '';
  return ip ? createHash('sha256').update(`${date}:${ip}`).digest('hex') : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Vary', 'Origin');
  const origin = req.headers.origin;
  if (origin && origin !== APP_ORIGIN) { logSecurityEvent(req, 'blocked_origin'); return respond(res, 403, { error: 'Origen no permitido.' }); }
  if (origin) res.setHeader('Access-Control-Allow-Origin', APP_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') { logSecurityEvent(req, 'blocked_method'); return respond(res, 405, { error: 'Método no permitido.' }); }

  let failureStage = 'verify_identity_token';
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) {
      logSecurityEvent(req, 'missing_auth');
      return respond(res, 401, { error: 'Inicia sesión para enviar un mensaje.' });
    }
    const app = adminApp();
    const user = await getAuth(app).verifyIdToken(token, true);
    if (!user.email_verified) return respond(res, 403, { error: 'Verifica tu correo.' });

    failureStage = 'validate_message';
    const input = parseBody(requestSchemas.message, req.body);
    if (!input) {
      logSecurityEvent(req, 'invalid_message_request', user.uid);
      return respond(res, 400, { error: 'Asunto o mensaje inválido.' });
    }
    const { listingId, subject, message, visitRequestedAt, openHouseRsvp } = input;

    const db = getFirestore(app);
    failureStage = 'read_profile_and_listing';
    const [userSnap, listingSnap] = await Promise.all([
      db.collection('users').doc(user.uid).get(),
      db.collection('listings').doc(listingId).get(),
    ]);
    const profile = userSnap.data();
    const listing = listingSnap.data();
    if (!profile || profile.isBanned === true || profile.privacyConsentVersion !== '2026-10-03-v8') {
      return respond(res, 403, { error: 'Cuenta no autorizada.' });
    }
    if (!listingSnap.exists || listing.status !== 'published' || !Number.isSafeInteger(listing.expiresAt) || listing.expiresAt <= Date.now()) return respond(res, 404, { error: 'Anuncio no disponible.' });
    if (listing.ownerId === user.uid) return respond(res, 403, { error: 'No puedes enviarte un mensaje a ti mismo.' });
    if (visitRequestedAt && visitRequestedAt <= Date.now()) return respond(res, 400, { error: 'El horario solicitado debe ser futuro.' });
    if (openHouseRsvp === true && (!Number.isSafeInteger(listing.openHouseStartAt)
      || !Number.isSafeInteger(listing.openHouseEndAt)
      || listing.openHouseStartAt <= Date.now()
      || listing.openHouseEndAt <= listing.openHouseStartAt)) {
      return respond(res, 400, { error: 'La casa abierta ya no está disponible.' });
    }

    const date = day();
    const quotas = db.collection('abuseRateLimits');
    const userQuota = quotas.doc(`message_user_${user.uid}_${date}`);
    const listingQuota = quotas.doc(`message_listing_${user.uid}_${listingId}_${date}`);
    const ip = ipHash(req, date);
    const ipQuota = ip ? quotas.doc(`message_ip_${ip}_${date}`) : null;
    const messageRef = db.collection('messages').doc(randomUUID());
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(Date.now() + RETENTION_MS);
    const listingRef = db.collection('listings').doc(listingId);

    failureStage = 'save_message_transaction';
    const result = await db.runTransaction(async (transaction) => {
      const refs = [userQuota, listingQuota, ...(ipQuota ? [ipQuota] : []), listingRef];
      const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
      const userCount = snapshots[0].data()?.count ?? 0;
      const listingCount = snapshots[1].data()?.count ?? 0;
      const ipCount = ipQuota ? snapshots[2].data()?.count ?? 0 : 0;
      const currentListing = snapshots[snapshots.length - 1].data();
      if (!currentListing || currentListing.status !== 'published'
        || !Number.isSafeInteger(currentListing.expiresAt)
        || currentListing.expiresAt <= Date.now()
        || currentListing.ownerId !== listing.ownerId) return false;
      if (userCount >= MAX_DAILY_USER || listingCount >= MAX_DAILY_LISTING || (ipQuota && ipCount >= MAX_DAILY_IP)) return false;
      const quotaCommon = { expiresAt, updatedAt: FieldValue.serverTimestamp() };
      transaction.set(userQuota, { ...quotaCommon, count: userCount + 1 });
      transaction.set(listingQuota, { ...quotaCommon, count: listingCount + 1 });
      if (ipQuota) transaction.set(ipQuota, { ...quotaCommon, count: ipCount + 1 });
      transaction.create(messageRef, {
        listingId,
        senderId: user.uid,
        recipientId: listing.ownerId,
        senderName: typeof profile.displayName === 'string' ? profile.displayName.slice(0, 60) : 'Usuario',
        subject,
        message,
        ...(visitRequestedAt ? { visitRequestedAt } : {}),
        ...(openHouseRsvp === true ? { openHouseRsvp: true } : {}),
        status: 'unread',
        createdAt: now.toMillis(),
        privacyConsentVersion: '2026-10-03-v8',
        privacyConsentAt: now,
      });
      return true;
    });

    if (!result) return respond(res, 429, { error: 'Límite diario de mensajes alcanzado.' });
    return respond(res, 201, { ok: true, messageId: messageRef.id });
  } catch (error) {
    logApiFailure(req, 'message', failureStage, error);
    return respond(res, 500, { error: 'No se pudo enviar el mensaje.' });
  }
}
