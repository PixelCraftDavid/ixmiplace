import { createHash } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { logApiFailure, logSecurityEvent, parseBody, requestSchemas } from './_lib/input-security.js';

const APP_ORIGIN = process.env.APP_ORIGIN || 'https://ixmiplace.vercel.app';
const DAILY_USER_LIMIT = 120;
const DAILY_LISTING_LIMIT = 8;
const DAILY_IP_LIMIT = 400;
const RETENTION_MS = 8 * 24 * 60 * 60 * 1000;

function respond(res, status, body) {
  return res.status(status).json(body);
}

function getFirebaseAdmin() {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) throw new Error('Missing Firebase Admin credentials.');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
}

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

function clientIpHash(req, day) {
  const ip = req.headers['x-real-ip']?.trim();
  return ip ? createHash('sha256').update(`${day}:${ip}`).digest('hex') : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Vary', 'Origin');
  const origin = req.headers.origin;
  if (origin && origin !== APP_ORIGIN) { logSecurityEvent(req, 'blocked_origin'); return respond(res, 403, { error: 'Origen no permitido.' }); }
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
      return respond(res, 401, { error: 'Sesión o App Check requerido.' });
    }

    const app = getFirebaseAdmin();
    const [decoded] = await Promise.all([
      getAuth(app).verifyIdToken(idToken, true),
      getAppCheck(app).verifyToken(appCheckToken),
    ]);
    if (!decoded.email_verified) return respond(res, 403, { error: 'Correo no verificado.' });

    const input = parseBody(requestSchemas.metric, req.body);
    if (!input) {
      logSecurityEvent(req, 'invalid_metric_request', decoded.uid);
      return respond(res, 400, { error: 'Métrica inválida.' });
    }
    const { listingId, metric } = input;

    const db = getFirestore(app);
    const userRef = db.collection('users').doc(decoded.uid);
    const listingRef = db.collection('listings').doc(listingId);
    const [userSnap, listingSnap] = await Promise.all([userRef.get(), listingRef.get()]);
    const user = userSnap.data();
    const listing = listingSnap.data();
    if (!user || user.isBanned === true || user.privacyConsentVersion !== '2026-10-03-v9') return respond(res, 403, { error: 'Cuenta no autorizada.' });
    if (!listingSnap.exists || listing.status !== 'published' || !Number.isSafeInteger(listing.expiresAt) || listing.expiresAt <= Date.now()) {
      return respond(res, 404, { error: 'Anuncio no disponible.' });
    }
    if (listing.ownerId === decoded.uid) return respond(res, 200, { counted: false });

    const day = dayKey();
    const rateCollection = db.collection('metricRateLimits');
    const userRefLimit = rateCollection.doc(`user_${decoded.uid}_${metric}_${day}`);
    const listingRefLimit = rateCollection.doc(`listing_${decoded.uid}_${listingId}_${metric}_${day}`);
    const ipHash = clientIpHash(req, day);
    const ipRefLimit = ipHash ? rateCollection.doc(`ip_${ipHash}_${metric}_${day}`) : null;
    const limitRefs = [userRefLimit, listingRefLimit, ...(ipRefLimit ? [ipRefLimit] : [])];

    const counted = await db.runTransaction(async (transaction) => {
      const snapshots = await Promise.all(limitRefs.map((ref) => transaction.get(ref)));
      const userCount = snapshots[0].data()?.count ?? 0;
      const listingCount = snapshots[1].data()?.count ?? 0;
      const ipCount = ipRefLimit ? snapshots[2].data()?.count ?? 0 : 0;
      if (userCount >= DAILY_USER_LIMIT || listingCount >= DAILY_LISTING_LIMIT || (ipRefLimit && ipCount >= DAILY_IP_LIMIT)) return false;

      const expiresAt = Timestamp.fromMillis(Date.now() + RETENTION_MS);
      transaction.set(userRefLimit, { count: userCount + 1, expiresAt, updatedAt: FieldValue.serverTimestamp() });
      transaction.set(listingRefLimit, { count: listingCount + 1, expiresAt, updatedAt: FieldValue.serverTimestamp() });
      if (ipRefLimit) transaction.set(ipRefLimit, { count: ipCount + 1, expiresAt, updatedAt: FieldValue.serverTimestamp() });
      transaction.update(listingRef, { [metric]: FieldValue.increment(1) });
      return true;
    });

    return respond(res, 200, { counted });
  } catch (error) {
    logApiFailure(req, 'metric', 'request', error);
    return respond(res, 500, { error: 'No se pudo registrar la actividad.' });
  }
}
