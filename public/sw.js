const CACHE_NAME = 'ixmiplace-shell-v4';

const APP_SHELL = [
  '/',
  '/index.html',
  '/logo-ixmiplace.jpg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.webmanifest',
];

/*
 * INSTALACIÓN
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL)),
  );

  self.skipWaiting();
});

/*
 * ACTIVACIÓN
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key !== CACHE_NAME,
            )
            .map((key) =>
              caches.delete(key),
            ),
        ),
      ),

      self.clients.claim(),
    ]),
  );
});

/*
 * PUSH RECIBIDO EN SEGUNDO PLANO
 *
 * Firebase enviará:
 *
 * data: {
 *   title,
 *   body,
 *   url
 * }
 *
 * Como es DATA-ONLY, nosotros
 * construimos la notificación.
 */
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload;

  try {
    payload = event.data.json();
  } catch {
    payload = {
      body: event.data.text(),
    };
  }

  const data =
    payload?.data || payload || {};

  const title =
    typeof data.title === 'string' &&
    data.title.trim()
      ? data.title
      : 'IxmiPlace';

  const body =
    typeof data.body === 'string' &&
    data.body.trim()
      ? data.body
      : 'Tienes una nueva actualización.';

  const url =
    typeof data.url === 'string' &&
    data.url.startsWith('/')
      ? data.url
      : '/notificaciones';

  event.waitUntil(
    self.registration.showNotification(
      title,
      {
        body,

        icon: '/icon-192.png',

        badge: '/icon-192.png',

        data: {
          url,
        },

        tag: 'ixmiplace-notification',

        renotify: true,

        requireInteraction: false,
      },
    ),
  );
});

/*
 * CLICK EN LA NOTIFICACIÓN
 */
self.addEventListener(
  'notificationclick',
  (event) => {
    event.notification.close();

    const url =
      event.notification.data?.url ||
      '/notificaciones';

    event.waitUntil(
      self.clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        .then((clientList) => {
          /*
           * Si IxmiPlace ya está abierto,
           * reutilizamos esa ventana.
           */
          for (const client of clientList) {
            if (
              'focus' in client
            ) {
              client.navigate(
                new URL(
                  url,
                  self.location.origin,
                ).href,
              );

              return client.focus();
            }
          }

          /*
           * Si no está abierto,
           * abrimos IxmiPlace.
           */
          if (
            self.clients.openWindow
          ) {
            return self.clients.openWindow(
              new URL(
                url,
                self.location.origin,
              ).href,
            );
          }

          return undefined;
        }),
    );
  },
);

/*
 * FETCH
 */
self.addEventListener(
  'fetch',
  (event) => {
    if (
      event.request.method !== 'GET'
    ) {
      return;
    }

    const requestUrl =
      new URL(event.request.url);

    if (
      requestUrl.origin !==
      self.location.origin
    ) {
      return;
    }

    event.respondWith(
      fetch(event.request).catch(
        async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;

          // Offline navigations need the SPA shell; returning undefined here
          // makes the browser reject respondWith() because it requires a Response.
          if (event.request.mode === 'navigate') {
            const shell = await caches.match('/index.html');
            if (shell) return shell;
          }

          return new Response('Network unavailable.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        },
      ),
    );
  },
);
