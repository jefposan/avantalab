const CACHE_NAME = 'avantalab-mobile-v133';
const APP_SHELL = [
  '/mobile-app.js?v=133',
  '/mobile-supabase.js',
  '/mobile-manifest.json',
  '/images/ava-logo-principal.png',
  '/images/bg-avantalab-mobile-1080x1920.webp',
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

// ─── Push: exibe a notificacao recebida ─────────────────────
self.addEventListener('push', (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch (e) {
    dados = { titulo: 'AvantaLab', corpo: event.data ? event.data.text() : '' };
  }

  const titulo = dados.titulo || 'AvantaLab';
  const opcoes = {
    body: dados.corpo || '',
    icon: '/images/avantalab-icon-192.png',
    badge: '/images/avantalab-icon-192.png',
    data: { url: dados.url || '/mobile' },
  };

  event.waitUntil(
    self.registration.showNotification(titulo, opcoes).then(() => {
      if (self.navigator && self.navigator.setAppBadge) {
        return self.navigator.setAppBadge().catch(() => undefined);
      }
    })
  );
});

// ─── Clique na notificacao: abre/foca o app ─────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || '/mobile';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientes) => {
      for (const cliente of clientes) {
        if (cliente.url.indexOf(destino) !== -1 && 'focus' in cliente) {
          return cliente.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(destino);
    })
  );
});
