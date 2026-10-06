import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
} from 'firebase/messaging';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { app, auth, db } from './firebase';

const VAPID_KEY = import.meta.env
  .VITE_FB_VAPID_KEY as string | undefined;

function requireBrowserSupport() {
  if (
    !('Notification' in window) ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    throw new Error(
      'Este navegador no admite notificaciones push.',
    );
  }

  if (!VAPID_KEY) {
    throw new Error(
      'Falta configurar la clave Web Push (VAPID) de Firebase en Vercel.',
    );
  }
}

async function supportedMessaging() {
  if (!(await isSupported())) {
    throw new Error(
      'Las notificaciones push no están disponibles en este navegador.',
    );
  }

  return getMessaging(app);
}

/**
 * Registra y obtiene el Service Worker de IxmiPlace.
 *
 * IMPORTANTE:
 * Usamos siempre /sw.js directamente.
 * No agregamos firebaseConfig a la URL del Service Worker.
 */
async function activeServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error(
      'Este navegador no admite Service Workers.',
    );
  }

  const registration =
    await navigator.serviceWorker.register(
      '/sw.js',
      {
        scope: '/',
      },
    );

  let timeoutId: number | undefined;

  let readyRegistration: ServiceWorkerRegistration;

  try {
    readyRegistration =
      await Promise.race([
        navigator.serviceWorker.ready,

        new Promise<never>((_, reject) => {
          timeoutId =
            window.setTimeout(() => {
              reject(
                new Error(
                  'IxmiPlace todavía está preparando las notificaciones. Cierra y vuelve a abrir la página e inténtalo otra vez.',
                ),
              );
            }, 15_000);
        }),
      ]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }

  if (
    !readyRegistration.active ||
    readyRegistration.scope !==
      registration.scope
  ) {
    throw new Error(
      'No se pudo activar el Service Worker de IxmiPlace. Actualiza la página e inténtalo otra vez.',
    );
  }

  return readyRegistration;
}

async function getDeviceToken(
  messaging: ReturnType<typeof getMessaging>,
  registration: ServiceWorkerRegistration,
) {
  return getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
}

async function tokenDocumentId(token: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  );

  return Array.from(
    new Uint8Array(digest),
    (byte) =>
      byte
        .toString(16)
        .padStart(2, '0'),
  ).join('');
}

export async function getPushSubscriptionState(
  userId: string,
): Promise<
  'unsupported' |
  'denied' |
  'enabled' |
  'disabled'
> {
  if (
    !('Notification' in window) ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return 'unsupported';
  }

  if (
    Notification.permission ===
    'denied'
  ) {
    return 'denied';
  }

  if (
    Notification.permission !==
      'granted' ||
    !VAPID_KEY
  ) {
    return 'disabled';
  }

  try {
    const messaging =
      await supportedMessaging();

    const registration =
      await activeServiceWorkerRegistration();

    const token =
      await getDeviceToken(
        messaging,
        registration,
      );

    if (!token) {
      return 'disabled';
    }

    const tokenId =
      await tokenDocumentId(token);

    const tokenDoc = await getDoc(
      doc(
        db,
        'users',
        userId,
        'pushTokens',
        tokenId,
      ),
    );

    return tokenDoc.exists()
      ? 'enabled'
      : 'disabled';
  } catch {
    return 'disabled';
  }
}

export async function enablePushNotifications(
  userId: string,
) {
  requireBrowserSupport();

  const isIos =
    /iPad|iPhone|iPod/.test(
      navigator.userAgent,
    );

  const isStandalone =
    window.matchMedia(
      '(display-mode: standalone)',
    ).matches ||
    (
      navigator as Navigator & {
        standalone?: boolean;
      }
    ).standalone === true;

  if (
    isIos &&
    !isStandalone
  ) {
    throw new Error(
      'En iPhone o iPad, añade IxmiPlace a la pantalla de inicio y abre la app instalada para activar push.',
    );
  }

  const registration =
    await activeServiceWorkerRegistration();

  const messaging =
    await supportedMessaging();

  const permission =
    await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error(
      'No se concedió permiso para mostrar notificaciones.',
    );
  }

  const token =
    await getDeviceToken(
      messaging,
      registration,
    );

  if (!token) {
    throw new Error(
      'Firebase no pudo registrar este dispositivo. Intenta de nuevo.',
    );
  }

  const tokenId =
    await tokenDocumentId(token);

  await setDoc(
    doc(
      db,
      'users',
      userId,
      'pushTokens',
      tokenId,
    ),
    {
      token,

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),

      privacyConsentVersion:
        '2026-10-06-v11',

      privacyConsentAt:
        serverTimestamp(),
    },
  );

  window.dispatchEvent(
    new Event(
      'ixmiplace:push-enabled',
    ),
  );
}

export async function disablePushNotifications(
  userId: string,
) {
  requireBrowserSupport();

  const messaging =
    await supportedMessaging();

  const registration =
    await activeServiceWorkerRegistration();

  const token =
    Notification.permission ===
    'granted'
      ? await getDeviceToken(
          messaging,
          registration,
        )
      : null;

  if (token) {
    const tokenId =
      await tokenDocumentId(token);

    await deleteDoc(
      doc(
        db,
        'users',
        userId,
        'pushTokens',
        tokenId,
      ),
    );
  }

  await deleteToken(messaging);

  window.dispatchEvent(
    new Event(
      'ixmiplace:push-disabled',
    ),
  );
}

export async function listenForForegroundPush(
  onPush: (
    payload: MessagePayload,
  ) => void,
) {
  if (
    !('Notification' in window) ||
    Notification.permission !==
      'granted'
  ) {
    return () => {};
  }

  try {
    const messaging =
      await supportedMessaging();

    return onMessage(
      messaging,
      onPush,
    );
  } catch {
    return () => {};
  }
}

export type PushEventType =
  | 'listing_created'
  | 'message_created'
  | 'notification_created'
  | 'favorite_created'
  | 'report_created';

export async function requestPushDelivery(
  type: PushEventType,
  id: string,
) {
  const currentUser =
    auth.currentUser;

  if (
    !currentUser ||
    !import.meta.env.PROD
  ) {
    return;
  }

  try {
    const idToken = await currentUser.getIdToken();

    const response = await fetch(
      '/api/push',
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${idToken}`,

          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          type,
          id,
        }),
      },
    );

    if (!response.ok) {
      console.warn(
        'No se pudo enviar la notificación push:',
        response.status,
      );
    }
  } catch (error) {
    console.warn(
      'No se pudo conectar con el servicio de notificaciones push:',
      error,
    );
  }
}
