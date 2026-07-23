const CACHE_NAME = 'avantalab-vendas-mobile-v80';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './supabase-client.js',
  './vendor/supabase.min.js',
  './app.js',
  './manifest.webmanifest',
  './data/tridium-package.json',
  '/images/avanta-vendas-icon-180.png',
  '/images/avanta-vendas-icon-192.png',
  '/images/avanta-vendas-icon-512.png',
  './assets/icone-troca-gestao.png',
  './assets/icons.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html'))));
});
