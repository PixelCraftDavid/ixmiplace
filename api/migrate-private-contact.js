import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { FieldPath, FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logApiFailure, logSecurityEvent } from './_lib/input-security.js';

const APP_ORIGIN = process.env.APP_ORIGIN || 'https://ixmiplace.vercel.app';
const PAGE_SIZE = 200;

function getFirebaseAdmin() {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) throw new Error('Missing Firebase Admin credentials.');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
}

function respond(res, status, body) {
  return res.status(status).json(body);
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

    const app = getFirebaseAdmin();
    const [decoded] = await Promise.all([
      getAuth(app).verifyIdToken(idToken, true),
      getAppCheck(app).verifyToken(appCheckToken),
    ]);
    if (decoded.email_verified !== true) return respond(res, 403, { error: 'Verifica tu correo.' });

    const db = getFirestore(app);
    const migrationRef = db.collection('systemMigrations').doc('private-contact-v1');
    const completedMigration = await migrationRef.get();
    if (completedMigration.exists) {
      return respond(res, 200, { ok: true, alreadyCompleted: true, ...completedMigration.data() });
    }

    const adminSnap = await db.collection('users').doc(decoded.uid).get();
    const adminProfile = adminSnap.data();
    if (!adminProfile || adminProfile.role !== 'admin' || adminProfile.isBanned === true) {
      return respond(res, 403, { error: 'Solo el administrador puede ejecutar esta migración.' });
    }

    let cursor = null;
    let scanned = 0;
    let phonesMoved = 0;
    let addressesMoved = 0;
    let invalidPhones = 0;

    while (true) {
      let pageQuery = db.collection('listings')
        .orderBy(FieldPath.documentId())
        .limit(PAGE_SIZE);
      if (cursor) pageQuery = pageQuery.startAfter(cursor);
      const page = await pageQuery.get();
      if (page.empty) break;

      const batch = db.batch();
      let writes = 0;
      for (const listingDoc of page.docs) {
        scanned += 1;
        const listing = listingDoc.data();
        const updates = {};
        const privateData = { ownerId: listing.ownerId, updatedAt: FieldValue.serverTimestamp() };
        let hasPrivateData = false;

        if (typeof listing.whatsapp === 'string' && listing.whatsapp.trim()) {
          const digits = listing.whatsapp.replace(/\D/g, '');
          const phone = digits.length === 12 && digits.startsWith('52') ? digits.slice(2) : digits;
          privateData.whatsapp = phone;
          hasPrivateData = true;
          phonesMoved += 1;
          if (!/^\d{10}$/.test(phone)) invalidPhones += 1;
          updates.whatsapp = FieldValue.delete();
        }

        if (typeof listing.address === 'string' && listing.address.trim()) {
          privateData.address = listing.address.trim().slice(0, 200);
          hasPrivateData = true;
          addressesMoved += 1;
          updates.address = FieldValue.delete();
        } else if ('address' in listing) {
          updates.address = FieldValue.delete();
        }

        if (hasPrivateData) {
          batch.set(db.collection('listingPrivateDetails').doc(listingDoc.id), privateData, { merge: true });
          writes += 1;
        }
        if (Object.keys(updates).length) {
          updates.updatedAt = FieldValue.serverTimestamp();
          batch.update(listingDoc.ref, updates);
          writes += 1;
        }
      }

      if (writes > 0) await batch.commit();
      cursor = page.docs[page.docs.length - 1];
      if (page.size < PAGE_SIZE) break;
    }

    const result = {
      scanned,
      phonesMoved,
      addressesMoved,
      invalidPhones,
      completedAt: FieldValue.serverTimestamp(),
    };
    await migrationRef.create(result);
    return respond(res, 200, { ok: true, ...result, completedAt: new Date().toISOString() });
  } catch (error) {
    logApiFailure(req, 'migrate-private-contact', 'request', error);
    return respond(res, 500, { error: 'No se pudo completar la migración.' });
  }
}
