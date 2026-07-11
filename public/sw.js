const CACHE_PREFIX = 'avantalab-';
const CACHE_ATUAL = 'avantalab-web-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((chaves) =>
        Promise.all(
          chaves
            .filter((chave) => chave.startsWith(CACHE_PREFIX) && chave !== CACHE_ATUAL)
            .map((chave) => caches.delete(chave)),
        ),
      ),
    ]),
  );
});

// Mantém a aplicação sempre ligada à versão atual servida pela rede.
self.addEventListener('fetch', () => undefined);

self.addEventListener('push', (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { body: event.data?.text?.() || '' };
  }

  const titulo = dados.title || dados.titulo || 'AvantaLab';
  const corpo = dados.body || dados.corpo || dados.mensagem || '';
  const destinoRecebido = dados.url || '/';
  const destino = destinoRecebido === '/mobile' ? '/' : destinoRecebido;

  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: corpo,
      icon: dados.icon || '/images/avantalab-icon-192.png',
      badge: dados.badge || '/images/avantalab-icon-192.png',
      data: { url: destino },
      tag: dados.tag || undefined,
      renotify: Boolean(dados.tag),
      vibrate: [80, 40, 80],
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destinoRecebido = event.notification.data?.url || '/';
  const destino = destinoRecebido === '/mobile' ? '/' : destinoRecebido;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientes) => {
      const clienteExistente = clientes[0];
      if (clienteExistente) {
        if (clienteExistente.navigate) clienteExistente.navigate(destino);
        return clienteExistente.focus();
      }
      return self.clients.openWindow?.(destino);
    }),
  );
});
