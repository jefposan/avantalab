const CACHE_NAME = 'avantalab-mobile-v101';
const APP_SHELL = [
  '/mobile-app.js?v=101',
  '/mobile-supabase.js',
  '/mobile-manifest.json',
  '/images/bg-avantalab-mobile-1080x1920.webp',
  '/images/bg-avantalab-mobile-1080x1920.png',
  '/images/bg-avantalab-mobile.webp',
  '/images/bg-avantalab.webp',
  '/images/google-logo.svg',
  '/images/avantalab-icon-192.png',
  '/images/avantalab-icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .catch(() => undefined)
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname === '/mobile' ||
    event.request.mode === 'navigate'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => undefined);
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
