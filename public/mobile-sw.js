const CACHE_NAME = 'avantalab-mobile-v194';
const APP_SHELL = [
  '/mobile-app.js?v=217',
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

// ─── Push: exibe a notificacao recebida ───────────────────────
self.addEventListener('push', (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch (e) {
    try { dados = { title: event.data && event.data.text ? event.data.text() : '' }; } catch (e2) { dados = {}; }
  }

  const titulo = dados.title || dados.titulo || 'AvantaLab';
  const corpo = dados.body || dados.corpo || dados.mensagem || '';
  const url = dados.url || '/mobile';

  const opcoes = {
    body: corpo,
    icon: dados.icon || '/images/avantalab-icon-192.png',
    badge: dados.badge || '/images/avantalab-icon-192.png',
    data: { url: url },
    tag: dados.tag || undefined,
    renotify: dados.tag ? true : undefined,
    vibrate: [80, 40, 80]
  };

  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

// ─── Clique na notificacao: foca/abre o app na URL ────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || '/mobile';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientes) => {
      for (const cliente of clientes) {
        if (cliente.url.indexOf(destino) >= 0 && 'focus' in cliente) return cliente.focus();
      }
      for (const cliente of clientes) {
        if ('focus' in cliente) {
          if (cliente.navigate) { try { cliente.navigate(destino); } catch (e) {} }
          return cliente.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(destino);
    })
  );
});
