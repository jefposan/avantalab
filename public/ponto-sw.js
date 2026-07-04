const PONTO_CACHE = 'avantalab-ponto-v6';
const PONTO_SHELL = [
  '/ponto',
  '/ponto-app.js?v=18',
  '/mobile-supabase.js',
  '/ponto-manifest.json',
  '/images/ponto-icon-192.png',
  '/images/ponto-icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PONTO_CACHE).then((cache) => cache.addAll(PONTO_SHELL)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('avantalab-ponto-') && key !== PONTO_CACHE).map((key) => caches.delete(key))
    )).catch(() => undefined)
  );
  self.clients.claim();
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (error) { data = { title: event.data ? event.data.text() : '' }; }

  event.waitUntil(self.registration.showNotification(data.title || data.titulo || 'Avanta Ponto', {
    body: data.body || data.corpo || '',
    icon: data.icon || '/images/ponto-icon-192.png',
    badge: data.badge || '/images/ponto-icon-192.png',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { url: data.url || '/ponto' },
    vibrate: [80, 40, 80],
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destination = event.notification.data?.url || '/ponto';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      if (client.url.includes('/ponto') && 'focus' in client) return client.focus();
    }
    return self.clients.openWindow ? self.clients.openWindow(destination) : undefined;
  }));
});
