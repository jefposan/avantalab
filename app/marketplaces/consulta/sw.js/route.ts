import { APP_VERSION } from '@/app/lib/version';

export const dynamic = 'force-dynamic';

export async function GET() {
  const code = `
const CACHE = 'avantalab-marketplaces-mobile-${APP_VERSION}';
const PREFIX = 'avantalab-marketplaces-mobile-';
const SHELL = ['/marketplaces/consulta', '/marketplaces/consulta/manifest.webmanifest', '/images/logo-avantalab-oficial.png', '/images/marketplaces-mobile-icon-180.png', '/images/marketplaces-mobile-icon-192.png', '/images/marketplaces-mobile-icon-512.png'];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' }))))).then(() => self.skipWaiting())));
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (!url.pathname.startsWith('/marketplaces/consulta')) return;
  event.respondWith(fetch(new Request(event.request, { cache: 'no-store' })).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone())).catch(() => undefined);
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/marketplaces/consulta'))));
});
self.addEventListener('message', (event) => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
`;
  return new Response(code, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/javascript; charset=utf-8',
      'Service-Worker-Allowed': '/marketplaces/consulta',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
