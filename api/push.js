import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logApiFailure, logSecurityEvent, parseBody, requestSchemas } from './_lib/input-security.js';

const APP_ORIGIN = process.env.APP_ORIGIN || 'https://ixmiplace.vercel.app';

const VALID_EVENTS = new Set([
  'listing_created',
  'message_created',
  'notification_created',
  'report_created',
]);

function getFirebaseAdmin() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Faltan las credenciales privadas de Firebase Admin en Vercel.',
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  });
}

function respond(res, status, body) {
  res.status(status).json(body);
}

async function verifyFirebaseIdToken(idToken) {
  const apiKey = process.env.VITE_FB_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Falta VITE_FB_API_KEY en las variables de entorno de Vercel.',
    );
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
      apiKey,
    )}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken,
      }),
    },
  );

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 400 || response.status === 401) {
      return null;
    }

    throw new Error(
      `Firebase Auth token lookup failed (${response.status}).`,
    );
  }

  const user = result?.users?.[0];

  if (!user || typeof user.localId !== 'string') {
    return null;
  }

  return {
    uid: user.localId,
    email_verified: user.emailVerified === true,
  };
}

async function reserveEvent(db, collectionName, id, authorize) {
  const ref = db.collection(collectionName).doc(id);

  const data = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists) {
      return null;
    }

    const current = snapshot.data();

    if (!authorize(current)) {
      return null;
    }

    if (current._pushSentAt) {
      return {
        skipped: true,
      };
    }

    const claimedAt =
      current._pushClaimedAt?.toMillis?.() ?? 0;

    if (claimedAt && Date.now() - claimedAt < 60_000) {
      return {
        skipped: true,
      };
    }

    transaction.update(ref, {
      _pushClaimedAt: FieldValue.serverTimestamp(),
    });

    return {
      ref,
      value: current,
    };
  });

  return data;
}

async function findAdminIds(db) {
  const snapshot = await db
    .collection('users')
    .where('role', '==', 'admin')
    .get();

  return snapshot.docs
    .filter((userDoc) => {
      const data = userDoc.data();

      return (
        data.isBanned !== true &&
        data.emailVerified === true
      );
    })
    .map((userDoc) => userDoc.id);
}

async function sendToUsers(
  db,
  userIds,
  title,
  body,
  url,
  setFailureStage,
) {
  const tokenRefs = [];

  for (const userId of [...new Set(userIds.filter(Boolean))]) {
    setFailureStage('firestore_read_push_tokens');

    const tokens = await db
      .collection('users')
      .doc(userId)
      .collection('pushTokens')
      .get();

    for (const tokenDoc of tokens.docs) {
      const token = tokenDoc.data().token;

      if (
        typeof token === 'string' &&
        token.length >= 20
      ) {
        tokenRefs.push({
          ref: tokenDoc.ref,
          token,
        });
      }
    }
  }

  let sent = 0;

  for (
    let offset = 0;
    offset < tokenRefs.length;
    offset += 500
  ) {
    const chunk = tokenRefs.slice(offset, offset + 500);

    setFailureStage(
      'firebase_cloud_messaging_send',
    );

    const result =
      await getMessaging(
        getFirebaseAdmin(),
      ).sendEachForMulticast({
        tokens: chunk.map(({ token }) => token),

        // IMPORTANTE:
        // Enviamos solamente DATA para que
        // nuestro Service Worker sea quien
        // construya la notificación.
        data: {
          title,
          body,
          url,
        },
      });

    sent += result.successCount;

    const removals = [];

    result.responses.forEach(
      (response, index) => {
        const code = response.error?.code;

        if (
          code ===
            'messaging/registration-token-not-registered' ||
          code ===
            'messaging/invalid-registration-token'
        ) {
          removals.push(
            chunk[index].ref.delete(),
          );
        }
      },
    );

    setFailureStage(
      'firestore_remove_invalid_push_tokens',
    );

    await Promise.all(removals);
  }

  return {
    sent,
    registeredDevices: tokenRefs.length,
  };
}

export default async function handler(req, res) {
  const origin = req.headers.origin;

  if (origin && origin !== APP_ORIGIN) {
    logSecurityEvent(req, 'blocked_origin');
    return respond(res, 403, {
      error: 'Origen no permitido.',
    });
  }

  if (origin) {
    res.setHeader(
      'Access-Control-Allow-Origin',
      APP_ORIGIN,
    );

    res.setHeader('Vary', 'Origin');
  }

  res.setHeader(
    'Cache-Control',
    'no-store',
  );

  res.setHeader(
    'Access-Control-Allow-Methods',
    'POST, OPTIONS',
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, X-Firebase-AppCheck',
  );

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    logSecurityEvent(req, 'blocked_method');
    return respond(res, 405, {
      error: 'Método no permitido.',
    });
  }

  let claimedEventRef;
  let failureStage = 'request_setup';

  try {
    const authorization =
      req.headers.authorization || '';

    const idToken = authorization.startsWith(
      'Bearer ',
    )
      ? authorization.slice(7)
      : '';

    if (!idToken) {
      return respond(res, 401, {
        error: 'Debes iniciar sesión.',
      });
    }

    const appCheckToken = req.headers['x-firebase-appcheck'];
    if (typeof appCheckToken !== 'string') {
      return respond(res, 401, {
        error: 'La aplicación no pasó la verificación App Check.',
      });
    }

    const app = getFirebaseAdmin();

    failureStage =
      'firebase_auth_token_lookup';

    const [decoded] = await Promise.all([
      verifyFirebaseIdToken(idToken),
      getAppCheck(app).verifyToken(appCheckToken),
    ]);

    if (!decoded) {
      return respond(res, 401, {
        error:
          'La sesión no es válida; vuelve a iniciar sesión.',
      });
    }

    if (!decoded.email_verified) {
      return respond(res, 403, {
        error: 'Verifica tu correo.',
      });
    }

    const db = getFirestore(app);

    failureStage =
      'firestore_read_user_profile';

    const userSnapshot = await db
      .collection('users')
      .doc(decoded.uid)
      .get();

    const profile = userSnapshot.data();

    if (
      !profile ||
      profile.isBanned === true
    ) {
      return respond(res, 403, {
        error: 'Cuenta no autorizada.',
      });
    }

    const input = parseBody(requestSchemas.push, req.body);
    if (!input || !VALID_EVENTS.has(input.type)) {
      logSecurityEvent(req, 'invalid_push_event', decoded.uid);
      return respond(res, 400, {
        error: 'Evento no válido.',
      });
    }
    const { type, id } = input;

    let reserved;
    let recipientIds = [];

    let title = 'Novedad en IxmiPlace';
    let body =
      'Tienes una actualización en tu cuenta.';

    let targetUrl =
      `${APP_ORIGIN}/notificaciones`;

    /*
     * PUBLICACIÓN CREADA
     */
    if (type === 'listing_created') {
      failureStage =
        'firestore_reserve_listing_event';

      reserved = await reserveEvent(
        db,
        'listings',
        id,
        (listing) =>
          listing.ownerId === decoded.uid &&
          listing.status === 'pending',
      );

      if (!reserved) {
        return respond(res, 403, {
          error:
            'Publicación no autorizada.',
        });
      }

      if (reserved.skipped) {
        return respond(res, 200, {
          ok: true,
          skipped: true,
        });
      }

      claimedEventRef = reserved.ref;

      failureStage =
        'firestore_find_admin_recipients';

      recipientIds =
        await findAdminIds(db);

      title =
        'Nueva publicación por revisar';

      body =
        'Hay un nuevo anuncio pendiente de moderación.';

      targetUrl =
        `${APP_ORIGIN}/admin`;
    }

    /*
     * MENSAJE CREADO
     */
    else if (type === 'message_created') {
      failureStage =
        'firestore_reserve_message_event';

      reserved = await reserveEvent(
        db,
        'messages',
        id,
        (message) =>
          message.senderId === decoded.uid &&
          message.senderId !==
            message.recipientId &&
          message.status === 'unread',
      );

      if (!reserved) {
        return respond(res, 403, {
          error:
            'Mensaje no autorizado.',
        });
      }

      if (reserved.skipped) {
        return respond(res, 200, {
          ok: true,
          skipped: true,
        });
      }

      claimedEventRef = reserved.ref;

      recipientIds = [
        reserved.value.recipientId,
      ];

      title =
        'Tienes un mensaje nuevo';

      body =
        'Abre IxmiPlace para leerlo.';

      targetUrl =
        `${APP_ORIGIN}/mensajes`;
    }

    /*
     * NOTIFICACIÓN CREADA POR ADMINISTRACIÓN
     *
     * AQUÍ ESTÁ EL CAMBIO IMPORTANTE:
     *
     * Ya no usamos un texto genérico.
     * Tomamos title y message directamente
     * del documento "notifications".
     */
    else if (type === 'notification_created') {
      if (profile.role !== 'admin') {
        return respond(res, 403, {
          error:
            'Solo administración puede emitir este aviso.',
        });
      }

      failureStage =
        'firestore_reserve_notification_event';

      reserved = await reserveEvent(
        db,
        'notifications',
        id,
        (notification) =>
          typeof notification.recipientId ===
          'string',
      );

      if (!reserved) {
        return respond(res, 403, {
          error:
            'Aviso no autorizado.',
        });
      }

      if (reserved.skipped) {
        return respond(res, 200, {
          ok: true,
          skipped: true,
        });
      }

      claimedEventRef = reserved.ref;

      recipientIds = [
        reserved.value.recipientId,
      ];

      /*
       * USAR EL TÍTULO REAL DE FIRESTORE
       */
      if (
        typeof reserved.value.title ===
        'string' &&
        reserved.value.title.trim()
      ) {
        title =
          reserved.value.title.trim();
      } else {
        title =
          'Actualización de tu publicación';
      }

      /*
       * USAR EL MENSAJE REAL DE FIRESTORE
       *
       * Aquí llegará:
       * "Motivo para el propietario: ..."
       */
      if (
        typeof reserved.value.message ===
        'string' &&
        reserved.value.message.trim()
      ) {
        body =
          reserved.value.message.trim();
      } else {
        body =
          'Hay una novedad sobre una de tus publicaciones.';
      }

      /*
       * Si existe una publicación asociada,
       * al tocar la notificación iremos a
       * la pantalla de notificaciones.
       */
      targetUrl =
        `${APP_ORIGIN}/notificaciones`;
    }

    /*
     * REPORTE
     */
    else {
      failureStage =
        'firestore_reserve_report_event';

      reserved = await reserveEvent(
        db,
        'reports',
        id,
        (report) =>
          report.reporterId === decoded.uid &&
          report.status === 'open',
      );

      if (!reserved) {
        return respond(res, 403, {
          error:
            'Reporte no autorizado.',
        });
      }

      if (reserved.skipped) {
        return respond(res, 200, {
          ok: true,
          skipped: true,
        });
      }

      claimedEventRef = reserved.ref;

      failureStage =
        'firestore_find_admin_recipients';

      recipientIds =
        await findAdminIds(db);

      title =
        'Nuevo reporte recibido';

      body =
        'Hay un reporte de publicación pendiente de revisar.';

      targetUrl =
        `${APP_ORIGIN}/admin`;
    }

    /*
     * ENVIAR PUSH
     */
    const delivery =
      await sendToUsers(
        db,
        recipientIds,
        title,
        body,
        targetUrl,
        (stage) => {
          failureStage = stage;
        },
      );

    /*
     * MARCAR EVENTO COMO ENVIADO
     */
    failureStage =
      'firestore_mark_event_sent';

    await reserved.ref.update({
      _pushSentAt:
        FieldValue.serverTimestamp(),

      _pushClaimedAt:
        FieldValue.delete(),
    });

    return respond(res, 200, {
      ok: true,
      ...delivery,
    });
  } catch (error) {
    if (claimedEventRef) {
      try {
        await claimedEventRef.update({
          _pushClaimedAt:
            FieldValue.delete(),
        });
      } catch {
        // El bloqueo de reintentos
        // caduca automáticamente.
      }
    }

    logApiFailure(req, 'push', failureStage, error);

    return respond(res, 500, {
      error:
        'No se pudo procesar la notificación.',
    });
  }
}
