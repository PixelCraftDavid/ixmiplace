import { createHash, randomUUID } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { v2 as cloudinary } from 'cloudinary';
import { logApiFailure, logSecurityEvent, parseBody, requestSchemas } from './_lib/input-security.js';

const APP_ORIGIN = process.env.APP_ORIGIN || 'https://ixmiplace.vercel.app';
const MAX_ACTIVE_ADS = 10;
const MAX_METRICS_PER_IP_AD_DAILY = 40;
const MAX_UPLOAD_SIGNATURES_DAILY = 20;
const DIRECTORY_PRICES = { listing: 99, rotating: 199, featured: 349 };

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

function addCalendarMonths(timestamp, months) {
  const date = new Date(timestamp);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.getTime();
}

function packageTotal(packageName, months) {
  const discount = months === 3 ? 0.10 : months === 6 ? 0.15 : 0;
  return Math.round(DIRECTORY_PRICES[packageName] * months * (1 - discount));
}

function publicProfile(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    businessName: data.businessName,
    category: data.category,
    description: data.description,
    location: data.location,
    mapUrl: data.mapUrl || '',
    contactUrl: data.contactUrl,
    contactLabel: data.contactLabel,
    package: data.package,
    featuredStartAt: data.featuredStartAt || null,
    featuredEndsAt: data.featuredEndsAt || null,
    desktopImageUrl: data.desktopImageUrl || '',
    mobileImageUrl: data.mobileImageUrl || '',
  };
}

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

async function verifyAppCheck(req, app) {
  const token = req.headers['x-firebase-appcheck'];
  if (typeof token !== 'string') return false;
  try {
    await getAppCheck(app).verifyToken(token);
    return true;
  } catch {
    return false;
  }
}

async function recordMetric(req, db, input) {
  const appCheckToken = req.headers['x-firebase-appcheck'];
  if (typeof appCheckToken !== 'string') return { status: 401, error: 'App Check requerido.' };
  const app = getApps()[0];
  if (!await verifyAppCheck(req, app)) return { status: 401, error: 'No se pudo verificar esta solicitud.' };

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
    if (count >= MAX_METRICS_PER_IP_AD_DAILY) return;
    transaction.set(limitRef, {
      count: count + 1,
      expiresAt: Timestamp.fromMillis(Date.now() + 8 * 24 * 60 * 60 * 1000),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(adRef, { [`metrics.${input.metric}`]: FieldValue.increment(1) });
  });
  return { status: 204 };
}

async function recordProfileMetric(req, db, input) {
  const appCheckToken = req.headers['x-firebase-appcheck'];
  if (typeof appCheckToken !== 'string') return { status: 401, error: 'App Check requerido.' };
  const app = getApps()[0];
  if (!await verifyAppCheck(req, app)) return { status: 401, error: 'No se pudo verificar esta solicitud.' };

  const profileRef = db.collection('businessProfiles').doc(input.profileId);
  const day = new Date().toISOString().slice(0, 10);
  const ip = typeof req.headers['x-real-ip'] === 'string' ? req.headers['x-real-ip'].trim() : '';
  const ipHash = ip ? createHash('sha256').update(`${day}:${ip}`).digest('hex').slice(0, 32) : 'unknown';
  const limitRef = db.collection('businessProfileMetricLimits').doc(`${input.profileId}_${input.metric}_${ipHash}_${day}`);
  await db.runTransaction(async (transaction) => {
    const [profileSnapshot, limitSnapshot] = await Promise.all([transaction.get(profileRef), transaction.get(limitRef)]);
    const profile = profileSnapshot.data();
    const now = Date.now();
    if (!profileSnapshot.exists || !isReserved(profile.status) || profile.startsAt > now
      || profile.endsAt <= now || !['paid', 'complimentary'].includes(profile.paymentStatus)) return;
    if ((limitSnapshot.data()?.count ?? 0) >= MAX_METRICS_PER_IP_AD_DAILY) return;
    transaction.set(limitRef, {
      count: (limitSnapshot.data()?.count ?? 0) + 1,
      expiresAt: Timestamp.fromMillis(Date.now() + 8 * 24 * 60 * 60 * 1000),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(profileRef, { [`metrics.${input.metric}`]: FieldValue.increment(1) });
  });
  return { status: 204 };
}

async function createUploadSignature(uid, db) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadPreset = process.env.CLOUDINARY_SIGNED_UPLOAD_PRESET;
  if (!cloudName || !apiKey || !apiSecret || !uploadPreset) {
    return { status: 503, error: 'La subida segura no está configurada.' };
  }
  const day = new Date().toISOString().slice(0, 10);
  const quotaRef = db.collection('uploadSignatureLimits').doc(`business_ads_user_${uid}_${day}`);
  const permitted = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(quotaRef);
    const count = snapshot.data()?.count ?? 0;
    if (count >= MAX_UPLOAD_SIGNATURES_DAILY) return false;
    transaction.set(quotaRef, {
      count: count + 1,
      expiresAt: Timestamp.fromMillis(Date.now() + 8 * 24 * 60 * 60 * 1000),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  });
  if (!permitted) return { status: 429, error: 'Se alcanzó el límite diario de subidas para publicidad.' };
  const params = {
    timestamp: Math.floor(Date.now() / 1000),
    upload_preset: uploadPreset,
    folder: 'ixmiplace/business-ads',
    public_id: randomUUID(),
    overwrite: false,
  };
  return { status: 200, body: { cloudName, apiKey, ...params, signature: cloudinary.utils.api_sign_request(params, apiSecret) } };
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

async function saveBusinessProfile(db, input, uid) {
  const now = Date.now();
  const endsAt = addCalendarMonths(input.startsAt, input.months);
  if (input.startsAt < now - 5 * 60 * 1000) throw Object.assign(new Error('La fecha inicial no puede estar en el pasado.'), { status: 400 });
  if (input.status === 'active' && input.startsAt > now) throw Object.assign(new Error('Para una fecha futura, guarda la ficha como programada.'), { status: 400 });
  if (input.status === 'scheduled' && input.startsAt <= now) throw Object.assign(new Error('Una ficha con inicio actual debe guardarse como activa.'), { status: 400 });
  if (isReserved(input.status) && !['paid', 'complimentary'].includes(input.paymentStatus)) {
    throw Object.assign(new Error('Confirma el pago o registra la ficha como cortesía antes de activarla.'), { status: 400 });
  }
  const hasBanner = input.package !== 'listing';
  if (hasBanner && (!input.desktopImageUrl || !input.desktopImagePublicId || !input.mobileImageUrl || !input.mobileImagePublicId
    || !input.headline || !input.adDescription)) {
    throw Object.assign(new Error('Los paquetes con anuncio necesitan banner de escritorio, imagen móvil, título y descripción.'), { status: 400 });
  }
  const businessKeyValue = businessKey(input.businessName);
  if (!businessKeyValue) throw Object.assign(new Error('El nombre del negocio no es válido.'), { status: 400 });
  const featuredStartsAt = input.package === 'featured' ? input.featuredStartAt : null;
  const featuredEndsAt = featuredStartsAt ? Math.min(featuredStartsAt + 7 * 24 * 60 * 60 * 1000, endsAt) : null;
  if (input.package === 'featured' && (!featuredStartsAt || featuredStartsAt < input.startsAt || featuredStartsAt >= endsAt
    || featuredEndsAt - featuredStartsAt < 7 * 24 * 60 * 60 * 1000)) {
    throw Object.assign(new Error('La semana destacada debe caber completa dentro de las fechas contratadas.'), { status: 400 });
  }

  const profileId = input.profileId || randomUUID();
  const profileRef = db.collection('businessProfiles').doc(profileId);
  const adRef = db.collection('businessAds').doc(profileId);
  const directoryControlRef = db.collection('businessDirectoryControl').doc('capacity');
  const adControlRef = db.collection('businessAdControl').doc('capacity');
  const total = packageTotal(input.package, input.months);
  const result = await db.runTransaction(async (transaction) => {
    const [directoryControl, adControl, currentProfile, currentAd] = await Promise.all([
      transaction.get(directoryControlRef), transaction.get(adControlRef),
      transaction.get(profileRef), transaction.get(adRef),
    ]);
    const reservedProfiles = { ...(directoryControl.data()?.profiles || {}) };
    const reservedAds = { ...(adControl.data()?.activeBusinessKeys || {}) };
    for (const [key, id] of Object.entries(reservedAds)) if (id === profileId) delete reservedAds[key];
    const relatedIds = [...new Set([
      ...Object.keys(reservedProfiles), ...Object.values(reservedAds),
      profileId,
    ])];
    const refs = relatedIds.map((id) => ({ id, profile: db.collection('businessProfiles').doc(id), ad: db.collection('businessAds').doc(id) }));
    const snapshots = refs.length ? await transaction.getAll(...refs.flatMap((entry) => [entry.profile, entry.ad])) : [];
    const profilesById = new Map();
    const adsById = new Map();
    refs.forEach((entry, index) => {
      const profileSnapshot = snapshots[index * 2];
      const adSnapshot = snapshots[index * 2 + 1];
      if (profileSnapshot.exists) profilesById.set(entry.id, profileSnapshot.data());
      if (adSnapshot.exists) adsById.set(entry.id, adSnapshot.data());
    });
    if (currentProfile.exists) profilesById.set(profileId, currentProfile.data());
    if (currentAd.exists) adsById.set(profileId, currentAd.data());

    for (const id of Object.keys(reservedProfiles)) {
      const profile = profilesById.get(id);
      if (!profile || !isReserved(profile.status) || profile.endsAt <= now) delete reservedProfiles[id];
    }
    for (const [key, id] of Object.entries(reservedAds)) {
      const ad = adsById.get(id);
      if (!ad || !isReserved(ad.status) || ad.endsAt <= now) delete reservedAds[key];
    }

    for (const [id, profile] of profilesById) {
      if (id === profileId || !isReserved(profile.status) || profile.endsAt <= input.startsAt || profile.startsAt >= endsAt) continue;
      if (profile.businessKey === businessKeyValue) {
        throw Object.assign(new Error('Ese negocio ya tiene una ficha activa o programada en fechas que se traslapan.'), { status: 409 });
      }
    }

    const occupiedBannerIds = new Set();
    for (const id of Object.keys(reservedProfiles)) {
      const profile = profilesById.get(id);
      if (id !== profileId && profile?.package !== 'listing' && isReserved(profile.status)
        && profile.startsAt < endsAt && profile.endsAt > input.startsAt) occupiedBannerIds.add(id);
    }
    for (const id of Object.values(reservedAds)) {
      const ad = adsById.get(id);
      if (id !== profileId && !profilesById.has(id) && ad && isReserved(ad.status)
        && ad.startsAt < endsAt && ad.endsAt > input.startsAt) occupiedBannerIds.add(id);
      if (id !== profileId && ad?.businessKey === businessKeyValue && isReserved(ad.status)
        && ad.startsAt < endsAt && ad.endsAt > input.startsAt) {
        throw Object.assign(new Error('Ese negocio ya tiene un anuncio rotativo activo en esas fechas.'), { status: 409 });
      }
    }
    if (hasBanner && isReserved(input.status) && endsAt > now && occupiedBannerIds.size >= MAX_ACTIVE_ADS) {
      throw Object.assign(new Error('Ya están ocupados los 10 espacios de anuncios rotativos en esas fechas.'), { status: 409 });
    }
    if (input.package === 'featured' && isReserved(input.status) && endsAt > now) {
      for (const [id, profile] of profilesById) {
        if (id !== profileId && profile.package === 'featured' && isReserved(profile.status)
          && profile.featuredStartAt < featuredEndsAt && profile.featuredEndsAt > featuredStartsAt) {
          throw Object.assign(new Error('Esa semana destacada ya está reservada. Elige otras fechas disponibles.'), { status: 409 });
        }
      }
    }

    if (isReserved(input.status) && endsAt > now) reservedProfiles[profileId] = true;
    else delete reservedProfiles[profileId];
    if (hasBanner && isReserved(input.status) && endsAt > now) reservedAds[businessKeyValue] = profileId;
    else if (reservedAds[businessKeyValue] === profileId) delete reservedAds[businessKeyValue];

    const previousProfile = profilesById.get(profileId) || {};
    const previousAd = adsById.get(profileId) || {};
    const profileData = {
      businessName: input.businessName,
      businessKey: businessKeyValue,
      category: input.category,
      description: input.description,
      location: input.location,
      mapUrl: input.mapUrl,
      contactUrl: input.contactUrl,
      contactLabel: input.contactLabel,
      package: input.package,
      months: input.months,
      startsAt: input.startsAt,
      endsAt,
      featuredStartAt: featuredStartsAt,
      featuredEndsAt,
      status: input.status,
      agreedPriceMxn: total,
      paymentStatus: input.paymentStatus,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      desktopImageUrl: hasBanner ? input.desktopImageUrl : '',
      desktopImagePublicId: hasBanner ? input.desktopImagePublicId : '',
      mobileImageUrl: hasBanner ? input.mobileImageUrl : '',
      mobileImagePublicId: hasBanner ? input.mobileImagePublicId : '',
      headline: hasBanner ? input.headline : '',
      adDescription: hasBanner ? input.adDescription : '',
      offerText: hasBanner ? input.offerText : '',
      metrics: {
        profileViews: previousProfile.metrics?.profileViews || 0,
        contactClicks: previousProfile.metrics?.contactClicks || 0,
      },
      createdAt: previousProfile.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: uid,
    };
    transaction.set(profileRef, profileData);
    if (hasBanner && isReserved(input.status) && endsAt > now) {
      transaction.set(adRef, {
        businessName: input.businessName,
        businessKey: businessKeyValue,
        category: input.category,
        headline: input.headline,
        description: input.adDescription,
        offerText: input.offerText,
        ctaLabel: input.contactLabel,
        ctaUrl: input.contactUrl,
        desktopImageUrl: input.desktopImageUrl,
        desktopImagePublicId: input.desktopImagePublicId,
        mobileImageUrl: input.mobileImageUrl,
        mobileImagePublicId: input.mobileImagePublicId,
        startsAt: input.startsAt,
        endsAt,
        status: input.status,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        agreedPriceMxn: total,
        paymentStatus: input.paymentStatus,
        metrics: previousAd.metrics || { impressions: 0, clicks: 0 },
        createdAt: previousAd.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: uid,
        profileId,
      });
    } else if (currentAd.exists) {
      transaction.delete(adRef);
    }
    transaction.set(directoryControlRef, { profiles: reservedProfiles, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(adControlRef, { activeBusinessKeys: reservedAds, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { id: profileId, agreedPriceMxn: total, endsAt };
  });
  return result;
}

async function archiveBusinessProfile(db, profileId) {
  const profileRef = db.collection('businessProfiles').doc(profileId);
  const adRef = db.collection('businessAds').doc(profileId);
  const directoryControlRef = db.collection('businessDirectoryControl').doc('capacity');
  const adControlRef = db.collection('businessAdControl').doc('capacity');
  await db.runTransaction(async (transaction) => {
    const [profileSnapshot, adSnapshot, directoryControl, adControl] = await Promise.all([
      transaction.get(profileRef), transaction.get(adRef), transaction.get(directoryControlRef), transaction.get(adControlRef),
    ]);
    if (!profileSnapshot.exists) throw Object.assign(new Error('No encontramos esa ficha local.'), { status: 404 });
    const profiles = { ...(directoryControl.data()?.profiles || {}) };
    const ads = { ...(adControl.data()?.activeBusinessKeys || {}) };
    delete profiles[profileId];
    const key = profileSnapshot.data().businessKey;
    if (ads[key] === profileId) delete ads[key];
    transaction.update(profileRef, { status: 'archived', updatedAt: FieldValue.serverTimestamp() });
    if (adSnapshot.exists) transaction.update(adRef, { status: 'archived', updatedAt: FieldValue.serverTimestamp() });
    transaction.set(directoryControlRef, { profiles, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(adControlRef, { activeBusinessKeys: ads, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
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
      if (req.query?.view === 'directory') {
        const snapshot = await db.collection('businessProfiles').where('status', 'in', ['active', 'scheduled']).get();
        const profiles = snapshot.docs
          .filter((item) => item.data().startsAt <= now && item.data().endsAt > now
            && ['paid', 'complimentary'].includes(item.data().paymentStatus))
          .sort((a, b) => {
            const aFeatured = a.data().package === 'featured' && a.data().featuredStartAt <= now && a.data().featuredEndsAt > now;
            const bFeatured = b.data().package === 'featured' && b.data().featuredStartAt <= now && b.data().featuredEndsAt > now;
            return Number(bFeatured) - Number(aFeatured) || a.data().businessName.localeCompare(b.data().businessName, 'es');
          })
          .map(publicProfile);
        return respond(res, 200, { businesses: profiles });
      }
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
    if (req.body?.action === 'metric') {
      const adMetricInput = parseBody(requestSchemas.businessAdMetric, req.body);
      const profileMetricInput = adMetricInput ? null : parseBody(requestSchemas.businessProfileMetric, req.body);
      if (!adMetricInput && !profileMetricInput) return respond(res, 400, { error: 'Métrica inválida.' });
      const result = adMetricInput
        ? await recordMetric(req, db, adMetricInput)
        : await recordProfileMetric(req, db, profileMetricInput);
      if (result.status !== 204) return respond(res, result.status, { error: result.error });
      return res.status(204).end();
    }

    const authResult = await authenticateAdmin(req, app);
    if (authResult.error) return respond(res, authResult.status, { error: authResult.error });
    const input = parseBody(requestSchemas.businessAdAdmin, req.body);
    if (!input) { logSecurityEvent(req, 'invalid_business_ad_request', authResult.decoded.uid); return respond(res, 400, { error: 'Revisa los datos del anuncio.' }); }

    if (input.action === 'list') {
      const [snapshot, liveSnapshot] = await Promise.all([
        db.collection('businessAds').orderBy('updatedAt', 'desc').limit(30).get(),
        db.collection('businessAds').where('status', 'in', ['active', 'scheduled']).get(),
      ]);
      const now = Date.now();
      const occupiedSlots = liveSnapshot.docs.filter((item) => {
        const ad = item.data();
        return ad.startsAt <= now && ad.endsAt > now && ['paid', 'complimentary'].includes(ad.paymentStatus);
      }).length;
      return respond(res, 200, {
        ads: snapshot.docs.filter((item) => !item.data().profileId).map((item) => ({ id: item.id, ...item.data() })),
        occupiedSlots,
      });
    }
    if (input.action === 'directoryList') {
      const snapshot = await db.collection('businessProfiles').orderBy('updatedAt', 'desc').limit(100).get();
      const adSnapshots = snapshot.docs.length
        ? await db.getAll(...snapshot.docs.map((item) => db.collection('businessAds').doc(item.id)))
        : [];
      const adMetricsById = new Map(adSnapshots.filter((item) => item.exists).map((item) => [item.id, item.data().metrics || { impressions: 0, clicks: 0 }]));
      return respond(res, 200, { businesses: snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
        adMetrics: adMetricsById.get(item.id) || { impressions: 0, clicks: 0 },
      })) });
    }
    if (input.action === 'archive') {
      await archiveAd(db, input.adId);
      return respond(res, 200, { archived: true });
    }
    if (input.action === 'directoryArchive') {
      await archiveBusinessProfile(db, input.profileId);
      return respond(res, 200, { archived: true });
    }
    if (input.action === 'uploadSignature') {
      const result = await createUploadSignature(authResult.decoded.uid, db);
      if (result.status !== 200) return respond(res, result.status, { error: result.error });
      return respond(res, 200, result.body);
    }
    if (input.action === 'save') {
      const saved = await saveAd(db, input, authResult.decoded.uid);
      return respond(res, 200, { id: saved.id, saved: true });
    }
    if (input.action === 'directorySave') {
      const saved = await saveBusinessProfile(db, input, authResult.decoded.uid);
      return respond(res, 200, { id: saved.id, saved: true, agreedPriceMxn: saved.agreedPriceMxn, endsAt: saved.endsAt });
    }
    return respond(res, 400, { error: 'Acción inválida.' });
  } catch (error) {
    if (error?.status) return respond(res, error.status, { error: error.message });
    logApiFailure(req, 'business-ads', 'request', error);
    return respond(res, 500, { error: 'No se pudo completar la solicitud de publicidad local.' });
  }
}
