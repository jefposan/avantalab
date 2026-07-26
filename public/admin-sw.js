// Service worker exclusivo do PWA Avanta Admin.
// O conteúdo administrativo permanece sempre na rede; somente manifesto e
// ícones públicos são mantidos em cache.
const ADMIN_CACHE_PREFIX = 'avantalab-admin-';
const ADMIN_CACHE = 'avantalab-admin-v2';
const ADMIN_ASSETS = [
  '/admin-manifest.json',
  '/images/avanta-admin-pwa-v2-32.png',
  '/images/avanta-admin-pwa-v2-180.png',
  '/images/avanta-admin-pwa-v2-192.png',
  '/images/avanta-admin-pwa-v2-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(ADMIN_CACHE)
      .then((cache) => cache.addAll(ADMIN_ASSETS))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(ADMIN_CACHE_PREFIX) && key !== ADMIN_CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
    ]),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !ADMIN_ASSETS.includes(url.pathname)) return;

  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request)),
  );
});
