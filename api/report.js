import { createHash } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { logApiFailure, logSecurityEvent, parseBody, requestSchemas } from './_lib/input-security.js';

const APP_ORIGIN = process.env.APP_ORIGIN || 'https://ixmiplace.vercel.app';
const MAX_DAILY_USER = 10;
const MAX_DAILY_LISTING = 3;
const MAX_DAILY_IP = 60;
const RETENTION_MS = 8 * 24 * 60 * 60 * 1000;
const ALLOWED_REASONS = new Set(['spam', 'fraude', 'no_existe', 'duplicado', 'otro']);

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
  const ip = req.headers['x-real-ip']?.trim();
  return ip ? createHash('sha256').update(`${date}:${ip}`).digest('hex') : null;
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
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const appCheckToken = req.headers['x-firebase-appcheck'];
    if (!token || typeof appCheckToken !== 'string') {
      logSecurityEvent(req, 'missing_auth_or_app_check');
      return respond(res, 401, { error: 'Sesión y App Check requeridos.' });
    }
    const app = adminApp();
    const [user] = await Promise.all([
      getAuth(app).verifyIdToken(token, true),
      getAppCheck(app).verifyToken(appCheckToken),
    ]);
    if (!user.email_verified) return respond(res, 403, { error: 'Verifica tu correo.' });

    const input = parseBody(requestSchemas.report, req.body);
    if (!input) {
      logSecurityEvent(req, 'invalid_report_request', user.uid);
      return respond(res, 400, { error: 'Datos del reporte inválidos.' });
    }
    const { listingId, reason, comment } = input;

    const db = getFirestore(app);
    const profileSnap = await db.collection('users').doc(user.uid).get();
    const profile = profileSnap.data();
    if (!profile || profile.isBanned === true || profile.privacyConsentVersion !== '2026-09-30-v4') {
      return respond(res, 403, { error: 'Cuenta no autorizada.' });
    }
    const date = day();
    const listingRef = db.collection('listings').doc(listingId);
    const reportRef = db.collection('reports').doc(`${user.uid}_${listingId}`);
    const quotas = db.collection('abuseRateLimits');
    const userQuotaRef = quotas.doc(`report_user_${user.uid}_${date}`);
    const listingQuotaRef = quotas.doc(`report_listing_${user.uid}_${listingId}_${date}`);
    const ip = ipHash(req, date);
    const ipQuotaRef = ip ? quotas.doc(`report_ip_${ip}_${date}`) : null;
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(Date.now() + RETENTION_MS);

    const result = await db.runTransaction(async (transaction) => {
      const [listingSnap, reportSnap, ...quotaSnaps] = await Promise.all([
        transaction.get(listingRef),
        transaction.get(reportRef),
        ...[userQuotaRef, listingQuotaRef, ...(ipQuotaRef ? [ipQuotaRef] : [])].map((ref) => transaction.get(ref)),
      ]);
      if (!listingSnap.exists || listingSnap.data().status !== 'published'
        || !Number.isSafeInteger(listingSnap.data().expiresAt)
        || listingSnap.data().expiresAt <= Date.now()) return 'unavailable';
      if (listingSnap.data().ownerId === user.uid) return 'own_listing';
      if (reportSnap.exists) return 'duplicate';
      const userCount = quotaSnaps[0].data()?.count ?? 0;
      const listingCount = quotaSnaps[1].data()?.count ?? 0;
      const ipCount = ipQuotaRef ? quotaSnaps[2].data()?.count ?? 0 : 0;
      if (userCount >= MAX_DAILY_USER || listingCount >= MAX_DAILY_LISTING || (ipQuotaRef && ipCount >= MAX_DAILY_IP)) return 'limited';

      const quotaCommon = { expiresAt, updatedAt: FieldValue.serverTimestamp() };
      transaction.set(userQuotaRef, { ...quotaCommon, count: userCount + 1 });
      transaction.set(listingQuotaRef, { ...quotaCommon, count: listingCount + 1 });
      if (ipQuotaRef) transaction.set(ipQuotaRef, { ...quotaCommon, count: ipCount + 1 });
      transaction.create(reportRef, {
        listingId,
        reporterId: user.uid,
        reason,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
        status: 'open',
        createdAt: now.toMillis(),
        privacyConsentVersion: '2026-09-30-v4',
        privacyConsentAt: now,
      });
      transaction.update(listingRef, { reportsCount: FieldValue.increment(1) });
      return 'created';
    });

    if (result !== 'created') {
      const status = result === 'limited' ? 429 : result === 'duplicate' ? 409 : result === 'own_listing' ? 403 : 404;
      return respond(res, status, { error: result === 'limited' ? 'Límite diario de reportes alcanzado.' : result === 'duplicate' ? 'Ya reportaste este anuncio.' : result === 'own_listing' ? 'No puedes reportar tu propio anuncio.' : 'Anuncio no disponible.' });
    }
    return respond(res, 201, { ok: true, reportId: reportRef.id });
  } catch (error) {
    logApiFailure(req, 'report', 'request', error);
    return respond(res, 500, { error: 'No se pudo enviar el reporte.' });
  }
}
