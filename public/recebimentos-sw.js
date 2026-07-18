// Service worker do PWA "Recebimentos Presencial".
// Escopo restrito a /recebimentos/colaborador — não interfere no restante do app.
const RECEB_CACHE = 'avantalab-recebimentos-v4';
const RECEB_SHELL = [
  '/recebimentos/colaborador',
  '/recebimentos-manifest.json',
  '/images/recebimentos-icon-180.png',
  '/images/recebimentos-icon-192.png',
  '/images/recebimentos-icon-512.png',
  '/images/bg-avantalab-mobile-1080x1920.webp',
  '/images/bg-avantalab-mobile-1080x1920.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(RECEB_CACHE).then((cache) => cache.addAll(RECEB_SHELL)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('avantalab-recebimentos-') && key !== RECEB_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ).catch(() => undefined),
  );
  self.clients.claim();
});

// Network-first para navegação; cai no cache do shell quando offline.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/recebimentos/colaborador')),
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req)),
  );
});
