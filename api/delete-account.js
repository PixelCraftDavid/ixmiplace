import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { FieldPath, getFirestore } from 'firebase-admin/firestore';
import { v2 as cloudinary } from 'cloudinary';
import { logApiFailure, logSecurityEvent, parseBody, requestSchemas } from './_lib/input-security.js';

const APP_ORIGIN = process.env.APP_ORIGIN || 'https://ixmiplace.vercel.app';
const PAGE_SIZE = 400;

function respond(res, status, body) {
  return res.status(status).json(body);
}

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) throw new Error('Missing Firebase Admin credentials.');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
}

async function deleteQuery(db, collectionName, field, value) {
  const collection = db.collection(collectionName);
  let deleted = 0;
  while (true) {
    const page = await collection.where(field, '==', value).limit(PAGE_SIZE).get();
    if (page.empty) return deleted;
    const batch = db.batch();
    page.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
    deleted += page.size;
  }
}

async function deleteDocIdPrefix(db, collectionName, prefix) {
  const collection = db.collection(collectionName);
  let deleted = 0;
  while (true) {
    const page = await collection
      .where(FieldPath.documentId(), '>=', prefix)
      .where(FieldPath.documentId(), '<', `${prefix}\uf8ff`)
      .limit(PAGE_SIZE)
      .get();
    if (page.empty) return deleted;
    const batch = db.batch();
    page.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
    deleted += page.size;
  }
}

function cloudinaryPublicIdFromUrl(value, cloudName) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.hostname !== 'res.cloudinary.com') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] !== cloudName || parts[1] !== 'image' || parts[2] !== 'upload') return null;
    const versionIndex = parts.findIndex((part, index) => index > 2 && /^v\d+$/.test(part));
    if (versionIndex < 0 || versionIndex + 1 >= parts.length) return null;
    const publicId = parts.slice(versionIndex + 1).join('/').replace(/\.[a-zA-Z0-9]+$/, '');
    return publicId.startsWith('ixmiplace/listings/') && !publicId.includes('..') ? publicId : null;
  } catch {
    return null;
  }
}

async function deleteCloudinaryImages(publicIds) {
  if (!publicIds.length) return;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary server credentials are required to remove listing images with the account.');
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  for (let index = 0; index < publicIds.length; index += 100) {
    const batch = publicIds.slice(index, index + 100);
    const result = await cloudinary.api.delete_resources(batch, { resource_type: 'image', type: 'upload', invalidate: true });
    const failedIds = Object.entries(result.deleted ?? {})
      .filter(([, status]) => !['deleted', 'not found', 'not_found'].includes(String(status)))
      .map(([publicId]) => publicId);
    if (failedIds.length) throw new Error(`Cloudinary could not delete ${failedIds.length} listing image(s).`);
  }
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
    if (!parseBody(requestSchemas.deleteAccount, req.body)) {
      logSecurityEvent(req, 'invalid_account_deletion_confirmation');
      return respond(res, 400, { error: 'Confirmación inválida.' });
    }
    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const appCheckToken = req.headers['x-firebase-appcheck'];
    if (!idToken || typeof appCheckToken !== 'string') {
      logSecurityEvent(req, 'missing_auth_or_app_check');
      return respond(res, 401, { error: 'Inicia sesión y verifica la protección App Check.' });
    }

    const app = getAdminApp();
    const [decoded] = await Promise.all([
      getAuth(app).verifyIdToken(idToken),
      getAppCheck(app).verifyToken(appCheckToken),
    ]);
    if (!Number.isInteger(decoded.auth_time) || Date.now() / 1000 - decoded.auth_time > 5 * 60) {
      return respond(res, 401, { error: 'Vuelve a confirmar tu identidad e inténtalo de nuevo.' });
    }

    const db = getFirestore(app);
    const profileRef = db.collection('users').doc(decoded.uid);
    const listingsSnapshot = await db.collection('listings').where('ownerId', '==', decoded.uid).get();
    const listingIds = listingsSnapshot.docs.map((listing) => listing.id);
    const imageIds = new Set();
    for (const listingDoc of listingsSnapshot.docs) {
      const listing = listingDoc.data();
      if (Array.isArray(listing.photoPublicIds)) {
        for (const publicId of listing.photoPublicIds) {
          if (typeof publicId === 'string' && publicId.startsWith('ixmiplace/listings/') && !publicId.includes('..')) imageIds.add(publicId);
        }
      }
      if (Array.isArray(listing.photos)) {
        for (const url of listing.photos) {
          const publicId = cloudinaryPublicIdFromUrl(url, process.env.CLOUDINARY_CLOUD_NAME);
          if (publicId) imageIds.add(publicId);
        }
      }
    }

    // Remove media first and keep the listing records available if this step fails.
    await deleteCloudinaryImages([...imageIds]);

    const tokenCollection = profileRef.collection('pushTokens');
    while (true) {
      const tokens = await tokenCollection.limit(PAGE_SIZE).get();
      if (tokens.empty) break;
      const batch = db.batch();
      tokens.docs.forEach((token) => batch.delete(token.ref));
      await batch.commit();
    }

    await Promise.all([
      deleteQuery(db, 'favorites', 'userId', decoded.uid),
      deleteQuery(db, 'reports', 'reporterId', decoded.uid),
      deleteQuery(db, 'messages', 'senderId', decoded.uid),
      deleteQuery(db, 'messages', 'recipientId', decoded.uid),
      deleteQuery(db, 'notifications', 'recipientId', decoded.uid),
      deleteQuery(db, 'listingHistory', 'actorId', decoded.uid),
      deleteDocIdPrefix(db, 'contactRateLimits', `user_${decoded.uid}_`),
      deleteDocIdPrefix(db, 'contactRateLimits', `listing_${decoded.uid}_`),
      deleteDocIdPrefix(db, 'abuseRateLimits', `message_user_${decoded.uid}_`),
      deleteDocIdPrefix(db, 'abuseRateLimits', `message_listing_${decoded.uid}_`),
      deleteDocIdPrefix(db, 'abuseRateLimits', `report_user_${decoded.uid}_`),
      deleteDocIdPrefix(db, 'abuseRateLimits', `report_listing_${decoded.uid}_`),
      deleteDocIdPrefix(db, 'metricRateLimits', `user_${decoded.uid}_`),
      deleteDocIdPrefix(db, 'metricRateLimits', `listing_${decoded.uid}_`),
      deleteDocIdPrefix(db, 'uploadSignatureLimits', `user_${decoded.uid}_`),
    ]);

    for (const listingId of listingIds) {
      await Promise.all([
        deleteQuery(db, 'favorites', 'listingId', listingId),
        deleteQuery(db, 'reports', 'listingId', listingId),
        deleteQuery(db, 'messages', 'listingId', listingId),
        deleteQuery(db, 'notifications', 'listingId', listingId),
        deleteQuery(db, 'listingHistory', 'listingId', listingId),
      ]);
      await Promise.all([
        db.collection('listingPrivateDetails').doc(listingId).delete().catch((error) => {
          if (error.code !== 5) throw error;
        }),
      ]);
    }

    // Keep parent listings until all dependent records are removed, so retries are safe.
    for (let index = 0; index < listingIds.length; index += PAGE_SIZE) {
      const batch = db.batch();
      listingIds.slice(index, index + PAGE_SIZE).forEach((id) => batch.delete(db.collection('listings').doc(id)));
      await batch.commit();
    }

    await Promise.all([
      db.collection('publicProfiles').doc(decoded.uid).delete().catch((error) => { if (error.code !== 5) throw error; }),
      profileRef.delete().catch((error) => { if (error.code !== 5) throw error; }),
    ]);
    return respond(res, 200, { ok: true });
  } catch (error) {
    logApiFailure(req, 'delete-account', 'request', error);
    return respond(res, 500, { error: 'No se pudo completar el borrado. La cuenta sigue disponible para volver a intentarlo.' });
  }
}
