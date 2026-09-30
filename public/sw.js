const CACHE_NAME = 'ixmiplace-shell-v2';

const APP_SHELL = [
  '/',
  '/index.html',
  '/logo-ixmiplace.jpg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.webmanifest',
];

/* =========================================================
   FIREBASE CLOUD MESSAGING
   ========================================================= */

importScripts(
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js'
);

importScripts(
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js'
);

const params = new URLSearchParams(self.location.search);
const firebaseConfigRaw = params.get('firebaseConfig');

if (firebaseConfigRaw) {
  try {
    const firebaseConfig = JSON.parse(firebaseConfigRaw);

    firebase.initializeApp(firebaseConfig);

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[IxmiPlace SW] Push recibido:', payload);

      const title = payload.data?.title || 'IxmiPlace';

      const body =
        payload.data?.body ||
        'Tienes una nueva actualización en IxmiPlace.';

      const url =
        payload.data?.url ||
        '/notificaciones';

      self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: {
          url,
        },
        vibrate: [100, 50, 100],
        tag: 'ixmiplace-notification',
        renotify: true,
      });
    });
  } catch (error) {
    console.error(
      '[IxmiPlace SW] Error inicializando Firebase:',
      error
    );
  }
}

/* =========================================================
   PWA
   ========================================================= */

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );

  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request)
    )
  );
});

/* =========================================================
   NOTIFICATION CLICK
   ========================================================= */

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl =
    event.notification.data?.url || '/notificaciones';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});