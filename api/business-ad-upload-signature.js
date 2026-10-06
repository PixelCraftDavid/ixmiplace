import { randomUUID } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { v2 as cloudinary } from 'cloudinary';
import { logApiFailure, logSecurityEvent } from './_lib/input-security.js';

const APP_ORIGIN = process.env.APP_ORIGIN || 'https://ixmiplace.vercel.app';
const MAX_DAILY_SIGNATURES = 20;

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
    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const appCheckToken = req.headers['x-firebase-appcheck'];
    if (!idToken || typeof appCheckToken !== 'string') return respond(res, 401, { error: 'Sesión y App Check requeridos.' });
    const app = adminApp();
    const [user] = await Promise.all([
      getAuth(app).verifyIdToken(idToken, true),
      getAppCheck(app).verifyToken(appCheckToken),
    ]);
    if (user.email_verified !== true) return respond(res, 403, { error: 'Verifica tu correo.' });
    const db = getFirestore(app);
    const profile = (await db.collection('users').doc(user.uid).get()).data();
    if (!profile || profile.role !== 'admin' || profile.isBanned === true
      || profile.termsAcceptedVersion !== '2026-10-06-v7'
      || profile.adultConfirmedVersion !== '2026-10-06-v7'
      || profile.privacyConsentVersion !== '2026-10-06-v11') {
      return respond(res, 403, { error: 'Solo una cuenta administradora con avisos vigentes puede subir imágenes publicitarias.' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_SIGNED_UPLOAD_PRESET;
    if (!cloudName || !apiKey || !apiSecret || !uploadPreset) return respond(res, 503, { error: 'La subida segura no está configurada.' });
    const day = new Date().toISOString().slice(0, 10);
    const quotaRef = db.collection('uploadSignatureLimits').doc(`business_ads_user_${user.uid}_${day}`);
    const permitted = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(quotaRef);
      const count = snapshot.data()?.count ?? 0;
      if (count >= MAX_DAILY_SIGNATURES) return false;
      transaction.set(quotaRef, {
        count: count + 1,
        expiresAt: Timestamp.fromMillis(Date.now() + 8 * 24 * 60 * 60 * 1000),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
    if (!permitted) return respond(res, 429, { error: 'Se alcanzó el límite diario de subidas para publicidad.' });
    const params = {
      timestamp: Math.floor(Date.now() / 1000),
      upload_preset: uploadPreset,
      folder: 'ixmiplace/business-ads',
      public_id: randomUUID(),
      overwrite: false,
    };
    return respond(res, 200, { cloudName, apiKey, ...params, signature: cloudinary.utils.api_sign_request(params, apiSecret) });
  } catch (error) {
    logApiFailure(req, 'business-ad-upload-signature', 'request', error);
    return respond(res, 500, { error: 'No se pudo autorizar la subida de imagen.' });
  }
}
