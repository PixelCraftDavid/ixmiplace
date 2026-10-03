import { randomUUID, createHash } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { v2 as cloudinary } from 'cloudinary';
import { logApiFailure, logSecurityEvent } from './_lib/input-security.js';

const APP_ORIGIN = process.env.APP_ORIGIN || 'https://ixmiplace.vercel.app';
const MAX_DAILY_PER_USER = 30;
const MAX_DAILY_PER_IP = 100;

function respond(res, status, body) {
  return res.status(status).json(body);
}

function adminApp() {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) throw new Error('Missing Firebase Admin credentials.');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
}

function getClientIpHash(req, day) {
  const ip = req.headers['x-real-ip']?.trim();
  return ip ? createHash('sha256').update(`${day}:${ip}`).digest('hex') : null;
}

async function consumeSignatureQuota(db, uid, ipHash, day) {
  const collectionRef = db.collection('uploadSignatureLimits');
  const userRef = collectionRef.doc(`user_${uid}_${day}`);
  const ipRef = ipHash ? collectionRef.doc(`ip_${ipHash}_${day}`) : null;
  return db.runTransaction(async (transaction) => {
    const refs = [userRef, ...(ipRef ? [ipRef] : [])];
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
    const userCount = snapshots[0].data()?.count ?? 0;
    const ipCount = ipRef ? snapshots[1].data()?.count ?? 0 : 0;
    if (userCount >= MAX_DAILY_PER_USER || (ipRef && ipCount >= MAX_DAILY_PER_IP)) return false;
    const expiresAt = Timestamp.fromMillis(Date.now() + 8 * 24 * 60 * 60 * 1000);
    transaction.set(userRef, { count: userCount + 1, expiresAt, updatedAt: FieldValue.serverTimestamp() });
    if (ipRef) transaction.set(ipRef, { count: ipCount + 1, expiresAt, updatedAt: FieldValue.serverTimestamp() });
    return true;
  });
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
    const [user] = await Promise.all([
      getAuth(app).verifyIdToken(idToken, true),
      getAppCheck(app).verifyToken(appCheckToken),
    ]);
    if (user.email_verified !== true) return respond(res, 403, { error: 'Verifica tu correo para subir imágenes.' });

    const db = getFirestore(app);
    const profileSnap = await db.collection('users').doc(user.uid).get();
    const profile = profileSnap.data();
    if (!profile || profile.isBanned === true || profile.termsAcceptedVersion !== '2026-10-03-v5'
      || profile.adultConfirmedVersion !== '2026-10-03-v5'
      || profile.privacyConsentVersion !== '2026-10-03-v9') {
      return respond(res, 403, { error: 'Cuenta no autorizada para subir imágenes.' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_SIGNED_UPLOAD_PRESET;
    if (!cloudName || !apiKey || !apiSecret || !uploadPreset) {
      return respond(res, 503, { error: 'La subida segura no está configurada.' });
    }

    const day = new Date().toISOString().slice(0, 10);
    if (!await consumeSignatureQuota(db, user.uid, getClientIpHash(req, day), day)) {
      return respond(res, 429, { error: 'Se alcanzó el límite diario de firmas de imágenes.' });
    }

    const params = {
      timestamp: Math.floor(Date.now() / 1000),
      upload_preset: uploadPreset,
      folder: 'ixmiplace/listings',
      public_id: randomUUID(),
      overwrite: false,
    };
    const signature = cloudinary.utils.api_sign_request(params, apiSecret);
    return respond(res, 200, { cloudName, apiKey, ...params, signature });
  } catch (error) {
    logApiFailure(req, 'cloudinary-signature', 'request', error);
    return respond(res, 500, { error: 'No se pudo autorizar la subida de imagen.' });
  }
}
