import { randomUUID } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logApiFailure, logSecurityEvent, parseBody, requestSchemas } from './_lib/input-security.js';

const APP_ORIGIN = process.env.APP_ORIGIN || 'https://ixmiplace.vercel.app';
const MAX_ACTIVE_ADS = 10;

function respond(res, status, body) { return res.status(status).json(body); }

function adminApp() {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) throw new Error('Missing Firebase Admin credentials.');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
}

function allowedOrigin(origin) {
  if (!origin || origin === APP_ORIGIN) return true;
  return process.env.NODE_ENV !== 'production'
    && ['http://localhost:5173', 'http://127.0.0.1:5173'].includes(origin);
}

function businessKey(name) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

function isReserved(status) { return status === 'active' || status === 'scheduled'; }

function publicAd(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    businessName: data.businessName,
    category: data.category,
    headline: data.headline,
    description: data.description,
    offerText: data.offerText || '',
    ctaLabel: data.ctaLabel,
    ctaUrl: data.ctaUrl,
    desktopImageUrl: data.desktopImageUrl,
    mobileImageUrl: data.mobileImageUrl,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
  };
}

async function authenticateAdmin(req, app) {
  const authorization = req.headers.authorization || '';
  const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const appCheckToken = req.headers['x-firebase-appcheck'];
  if (!idToken || typeof appCheckToken !== 'string') return { error: 'Se requiere una sesión válida y App Check.', status: 401 };
  const [decoded] = await Promise.all([
    getAuth(app).verifyIdToken(idToken, true),
    getAppCheck(app).verifyToken(appCheckToken),
  ]);
  if (decoded.email_verified !== true) return { error: 'Verifica tu correo para administrar anuncios.', status: 403 };
  const profile = (await getFirestore(app).collection('users').doc(decoded.uid).get()).data();
  if (!profile || profile.role !== 'admin' || profile.isBanned === true
    || profile.termsAcceptedVersion !== '2026-10-06-v7'
    || profile.adultConfirmedVersion !== '2026-10-06-v7'
    || profile.privacyConsentVersion !== '2026-10-06-v11') {
    return { error: 'Solo una cuenta administradora con avisos vigentes puede gestionar publicidad.', status: 403 };
  }
  return { decoded };
}

function cleanSlotMap(input, docsById, now) {
  const next = {};
  for (const [key, adId] of Object.entries(input || {})) {
    const ad = docsById.get(adId);
    if (ad && isReserved(ad.status) && Number.isSafeInteger(ad.endsAt) && ad.endsAt > now) next[key] = adId;
  }
  return next;
}

async function saveAd(db, input, uid) {
  const now = Date.now();
  if (input.endsAt <= input.startsAt) throw Object.assign(new Error('La fecha final debe ser posterior a la fecha inicial.'), { status: 400 });
  if (input.endsAt - input.startsAt > 120 * 24 * 60 * 60 * 1000) throw Object.assign(new Error('Cada campaña puede durar hasta 120 días.'), { status: 400 });
  if (isReserved(input.status) && !['paid', 'complimentary'].includes(input.paymentStatus)) {
    throw Object.assign(new Error('Confirma el pago o registra la campaña como cortesía antes de activarla.'), { status: 400 });
  }
  if (input.startsAt < now - 5 * 60 * 1000) throw Object.assign(new Error('La fecha inicial no puede estar en el pasado.'), { status: 400 });
  if (input.status === 'active' && input.startsAt > now) throw Object.assign(new Error('Para una fecha futura, guarda el anuncio como programado.'), { status: 400 });
  if (input.status === 'scheduled' && input.startsAt <= now) throw Object.assign(new Error('Una campaña con inicio actual debe guardarse como activa.'), { status: 400 });

  const adId = input.adId || randomUUID();
  const adRef = db.collection('businessAds').doc(adId);
  const controlRef = db.collection('businessAdControl').doc('capacity');
  const nextKey = businessKey(input.businessName);
  if (!nextKey) throw Object.assign(new Error('El nombre del negocio no es válido.'), { status: 400 });
  const result = await db.runTransaction(async (transaction) => {
    const controlSnapshot = await transaction.get(controlRef);
    const currentSnapshot = await transaction.get(adRef);
    const reservations = controlSnapshot.data()?.activeBusinessKeys || {};
    const ids = [...new Set([...Object.values(reservations), ...(currentSnapshot.exists ? [adId] : [])])];
    const otherRefs = ids.filter((id) => id !== adId).map((id) => db.collection('businessAds').doc(id));
    const otherSnapshots = otherRefs.length ? await transaction.getAll(...otherRefs) : [];
    const docsById = new Map(otherSnapshots.filter((snapshot) => snapshot.exists).map((snapshot) => [snapshot.id, snapshot.data()]));
    if (currentSnapshot.exists) docsById.set(adId, currentSnapshot.data());

    const activeKeys = cleanSlotMap(reservations, docsById, now);
    const previous = currentSnapshot.exists ? currentSnapshot.data() : null;
    for (const [key, reservedId] of Object.entries(activeKeys)) if (reservedId === adId) delete activeKeys[key];
    const reservesSlot = isReserved(input.status) && input.endsAt > now;
    if (reservesSlot && activeKeys[nextKey] && activeKeys[nextKey] !== adId) {
      throw Object.assign(new Error('Ese negocio ya tiene un anuncio activo o programado.'), { status: 409 });
    }
    if (reservesSlot && Object.keys(activeKeys).length >= MAX_ACTIVE_ADS) {
      throw Object.assign(new Error('Ya están ocupados los 10 espacios de publicidad.'), { status: 409 });
    }
    if (reservesSlot) activeKeys[nextKey] = adId;

    const previousMetrics = previous?.metrics || {};
    const nextData = {
      businessName: input.businessName,
      businessKey: nextKey,
      category: input.category,
      headline: input.headline,
      description: input.description,
      offerText: input.offerText,
      ctaLabel: input.ctaLabel,
      ctaUrl: input.ctaUrl,
      desktopImageUrl: input.desktopImageUrl,
      desktopImagePublicId: input.desktopImagePublicId,
      mobileImageUrl: input.mobileImageUrl,
      mobileImagePublicId: input.mobileImagePublicId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: input.status,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      agreedPriceMxn: input.agreedPriceMxn,
      paymentStatus: input.paymentStatus,
      metrics: { impressions: previousMetrics.impressions || 0, clicks: previousMetrics.clicks || 0 },
      createdAt: previous?.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: uid,
    };
    transaction.set(adRef, nextData);
    transaction.set(controlRef, { activeBusinessKeys: activeKeys, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { id: adId, previous };
  });

  return result;
}

async function archiveAd(db, adId) {
  const adRef = db.collection('businessAds').doc(adId);
  const controlRef = db.collection('businessAdControl').doc('capacity');
  await db.runTransaction(async (transaction) => {
    const [adSnapshot, controlSnapshot] = await Promise.all([transaction.get(adRef), transaction.get(controlRef)]);
    if (!adSnapshot.exists) throw Object.assign(new Error('No encontramos ese anuncio.'), { status: 404 });
    const data = adSnapshot.data();
    const reservations = { ...(controlSnapshot.data()?.activeBusinessKeys || {}) };
    if (reservations[data.businessKey] === adId) delete reservations[data.businessKey];
    transaction.update(adRef, { status: 'archived', updatedAt: FieldValue.serverTimestamp() });
    transaction.set(controlRef, { activeBusinessKeys: reservations, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
}

export default async function handler(req, res) {
  res.setHeader('Vary', 'Origin');
  if (!allowedOrigin(req.headers.origin)) { logSecurityEvent(req, 'blocked_origin'); return respond(res, 403, { error: 'Origen no permitido.' }); }
  if (req.headers.origin) res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Firebase-AppCheck');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const app = adminApp();
    const db = getFirestore(app);
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
      const now = Date.now();
      const snapshot = await db.collection('businessAds').where('status', 'in', ['active', 'scheduled']).get();
      const active = snapshot.docs
        .filter((item) => item.data().startsAt <= now && item.data().endsAt > now)
        .sort((a, b) => a.data().startsAt - b.data().startsAt || a.id.localeCompare(b.id))
        .slice(0, MAX_ACTIVE_ADS)
        .map(publicAd);
      return respond(res, 200, { ads: active });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST, OPTIONS'); return respond(res, 405, { error: 'Método no permitido.' }); }

    res.setHeader('Cache-Control', 'no-store, private');
    const authResult = await authenticateAdmin(req, app);
    if (authResult.error) return respond(res, authResult.status, { error: authResult.error });
    const input = parseBody(requestSchemas.businessAdAdmin, req.body);
    if (!input) { logSecurityEvent(req, 'invalid_business_ad_request', authResult.decoded.uid); return respond(res, 400, { error: 'Revisa los datos del anuncio.' }); }

    if (input.action === 'list') {
      const snapshot = await db.collection('businessAds').orderBy('updatedAt', 'desc').limit(30).get();
      return respond(res, 200, { ads: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) });
    }
    if (input.action === 'archive') {
      await archiveAd(db, input.adId);
      return respond(res, 200, { archived: true });
    }
    if (input.action === 'save') {
      const saved = await saveAd(db, input, authResult.decoded.uid);
      return respond(res, 200, { id: saved.id, saved: true });
    }
    return respond(res, 400, { error: 'Acción inválida.' });
  } catch (error) {
    if (error?.status) return respond(res, error.status, { error: error.message });
    logApiFailure(req, 'business-ads', 'request', error);
    return respond(res, 500, { error: 'No se pudieron cargar o guardar los anuncios locales.' });
  }
}
