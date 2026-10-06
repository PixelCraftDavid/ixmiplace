import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { logApiFailure, logSecurityEvent } from './_lib/input-security.js';

const APP_ORIGIN = process.env.APP_ORIGIN || 'https://ixmiplace.vercel.app';
const COLLECTIONS = ['contactRateLimits', 'abuseRateLimits', 'metricRateLimits', 'uploadSignatureLimits', 'businessAdMetricLimits'];
const PAGE_SIZE = 400;
const MAX_PAGES_PER_REQUEST = 2;

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
  if (origin && origin !== APP_ORIGIN) { logSecurityEvent(req, 'blocked_origin'); return respond(res, 403, { error: 'Origen no permitido.' }); }
  if (origin) res.setHeader('Access-Control-Allow-Origin', APP_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Firebase-AppCheck');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') { logSecurityEvent(req, 'blocked_method'); return respond(res, 405, { error: 'Método no permitido.' }); }

  try {
    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const appCheckToken = req.headers['x-firebase-appcheck'];
    if (!idToken || typeof appCheckToken !== 'string') {
      logSecurityEvent(req, 'missing_auth_or_app_check');
      return respond(res, 401, { error: 'Sesión y App Check requeridos.' });
    }
    const app = adminApp();
    const [decoded] = await Promise.all([
      getAuth(app).verifyIdToken(idToken, true),
      getAppCheck(app).verifyToken(appCheckToken),
    ]);
    if (decoded.email_verified !== true) return respond(res, 403, { error: 'Verifica tu correo.' });

    const db = getFirestore(app);
    const profile = (await db.collection('users').doc(decoded.uid).get()).data();
    if (!profile || profile.role !== 'admin' || profile.isBanned === true) return respond(res, 403, { error: 'Solo el administrador puede limpiar los límites.' });

    const cutoff = Timestamp.now();
    const deletedByCollection = {};
    let hasMore = false;
    for (const name of COLLECTIONS) {
      let deleted = 0;
      for (let pageNumber = 0; pageNumber < MAX_PAGES_PER_REQUEST; pageNumber += 1) {
        const page = await db.collection(name).where('expiresAt', '<', cutoff).limit(PAGE_SIZE).get();
        if (page.empty) break;
        const batch = db.batch();
        page.docs.forEach((document) => batch.delete(document.ref, { lastUpdateTime: document.updateTime }));
        await batch.commit();
        deleted += page.size;
        if (page.size < PAGE_SIZE) break;
      }
      deletedByCollection[name] = deleted;
      const remaining = await db.collection(name).where('expiresAt', '<', cutoff).limit(1).get();
      hasMore ||= !remaining.empty;
    }
    return respond(res, 200, { ok: true, deleted: Object.values(deletedByCollection).reduce((sum, count) => sum + count, 0), deletedByCollection, hasMore });
  } catch (error) {
    logApiFailure(req, 'cleanup-rate-limits', 'request', error);
    return respond(res, 500, { error: 'No se pudieron limpiar los límites vencidos.' });
  }
}
