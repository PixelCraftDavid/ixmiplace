import { createHash } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { logApiFailure, logSecurityEvent, parseBody, requestSchemas } from './_lib/input-security.js';

const APP_ORIGIN = process.env.APP_ORIGIN || 'https://ixmiplace.vercel.app';
const DAILY_LIMIT = 40;

function respond(res, status, body) { return res.status(status).json(body); }

function adminApp() {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) throw new Error('Missing Firebase Admin credentials.');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Vary', 'Origin');
  const origin = req.headers.origin;
  const localOrigin = process.env.NODE_ENV !== 'production'
    && ['http://localhost:5173', 'http://127.0.0.1:5173'].includes(origin);
  if (origin && origin !== APP_ORIGIN && !localOrigin) {
    logSecurityEvent(req, 'blocked_origin');
    return respond(res, 403, { error: 'Origen no permitido.' });
  }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Firebase-AppCheck');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return respond(res, 405, { error: 'Método no permitido.' });

  try {
    const input = parseBody(requestSchemas.businessAdMetric, req.body);
    if (!input) return respond(res, 400, { error: 'Métrica inválida.' });
    const appCheckToken = req.headers['x-firebase-appcheck'];
    if (typeof appCheckToken !== 'string') return respond(res, 401, { error: 'App Check requerido.' });
    const app = adminApp();
    await getAppCheck(app).verifyToken(appCheckToken);

    const db = getFirestore(app);
    const adRef = db.collection('businessAds').doc(input.adId);
    const day = new Date().toISOString().slice(0, 10);
    const ip = typeof req.headers['x-real-ip'] === 'string' ? req.headers['x-real-ip'].trim() : '';
    const ipHash = ip ? createHash('sha256').update(`${day}:${ip}`).digest('hex').slice(0, 32) : 'unknown';
    const limitRef = db.collection('businessAdMetricLimits').doc(`${input.adId}_${ipHash}_${day}`);
    await db.runTransaction(async (transaction) => {
      const [adSnapshot, limitSnapshot] = await Promise.all([transaction.get(adRef), transaction.get(limitRef)]);
      const ad = adSnapshot.data();
      const now = Date.now();
      if (!adSnapshot.exists || !['active', 'scheduled'].includes(ad.status)
        || ad.startsAt > now || ad.endsAt <= now) return;
      const count = limitSnapshot.data()?.count ?? 0;
      if (count >= DAILY_LIMIT) return;
      transaction.set(limitRef, {
        count: count + 1,
        expiresAt: Timestamp.fromMillis(Date.now() + 8 * 24 * 60 * 60 * 1000),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(adRef, { [`metrics.${input.metric}`]: FieldValue.increment(1) });
    });
    return respond(res, 204, {});
  } catch (error) {
    if (error?.code === 'app-check/invalid-argument' || error?.code === 'app-check/invalid-token') {
      logSecurityEvent(req, 'invalid_app_check');
      return respond(res, 401, { error: 'No se pudo verificar esta solicitud.' });
    }
    logApiFailure(req, 'business-ad-metric', 'request', error);
    return respond(res, 500, { error: 'No se pudo registrar la métrica.' });
  }
}
