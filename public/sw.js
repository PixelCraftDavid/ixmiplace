importScripts(
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js'
);

const firebaseConfigParam = new URL(self.location.href).searchParams.get('firebaseConfig');
if (firebaseConfigParam) {
  firebase.initializeApp(JSON.parse(firebaseConfigParam));
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const title = payload.data?.title || payload.notification?.title || 'IxmiPlace';
    const targetUrl = payload.data?.url || '/notificaciones';
    return self.registration.showNotification(title, {
      body: payload.data?.body || payload.notification?.body || 'Tienes una novedad en IxmiPlace.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: targetUrl },
    });
  });
}

const CACHE_NAME = 'ixmiplace-shell-v3';
const APP_SHELL = [
  '/',
  '/index.html',
  '/logo-ixmiplace.jpg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.webmanifest',
];

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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/notificaciones', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => client.url === targetUrl);
      if (existingClient) return existingClient.focus();
      return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
