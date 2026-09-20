import { AVANTAVENDAS_VERSION } from '../version';

export const dynamic = 'force-dynamic';

const prefixoCache = 'avantalab-avantavendas-';
const nomeCache = `${prefixoCache}${AVANTAVENDAS_VERSION}`;
const caminhoRecursos = '/avantavendas/recursos';

const recursosEssenciais = [
  '/avantavendas',
  '/avantavendas/manifest.webmanifest',
  `${caminhoRecursos}/styles.css?v=${AVANTAVENDAS_VERSION}`,
  `${caminhoRecursos}/avanta-voice-actions.css?v=${AVANTAVENDAS_VERSION}`,
  `${caminhoRecursos}/avanta-voice-actions.js?v=${AVANTAVENDAS_VERSION}`,
  `${caminhoRecursos}/vendor/supabase.min.js?v=${AVANTAVENDAS_VERSION}`,
  `${caminhoRecursos}/config.js?v=${AVANTAVENDAS_VERSION}`,
  `${caminhoRecursos}/supabase-client.js?v=${AVANTAVENDAS_VERSION}`,
  `${caminhoRecursos}/payment-receipt-v2.js?v=${AVANTAVENDAS_VERSION}`,
  `${caminhoRecursos}/order-receipt-v2.js?v=${AVANTAVENDAS_VERSION}`,
  `${caminhoRecursos}/assets/receipts/avantalab-payment-receipt-bg.webp?v=${AVANTAVENDAS_VERSION}`,
  `${caminhoRecursos}/assets/receipts/avantalab-receipt-bg.webp?v=${AVANTAVENDAS_VERSION}`,
  `${caminhoRecursos}/app.js?v=${AVANTAVENDAS_VERSION}`,
  '/images/logo-avantalab-oficial.png',
  '/images/avanta-vendas-pwa-180.png',
  '/images/avanta-vendas-pwa-192.png',
  '/images/avanta-vendas-pwa-512.png',
  '/images/avanta-vendas-pwa-maskable-192.png',
  '/images/avanta-vendas-pwa-maskable-512.png',
];

function codigoServiceWorker() {
  return `
const PREFIXO_CACHE = ${JSON.stringify(prefixoCache)};
const NOME_CACHE = ${JSON.stringify(nomeCache)};
const RECURSOS_ESSENCIAIS = ${JSON.stringify(recursosEssenciais)};

async function guardarResposta(cache, requisicao, resposta) {
  if (!resposta || !resposta.ok) return resposta;
  await cache.put(requisicao, resposta.clone());
  return resposta;
}

async function buscarComFallback(requisicao, fallback) {
  const cache = await caches.open(NOME_CACHE);
  try {
    const resposta = await fetch(requisicao, { cache: 'no-store' });
    return await guardarResposta(cache, requisicao, resposta);
  } catch {
    return (await caches.match(requisicao))
      || (fallback ? await caches.match(fallback) : undefined)
      || Response.error();
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(NOME_CACHE);
    await Promise.allSettled(
      RECURSOS_ESSENCIAIS.map(async (url) => {
        const requisicao = new Request(url, { cache: 'reload' });
        const resposta = await fetch(requisicao);
        await guardarResposta(cache, requisicao, resposta);
      }),
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const chaves = await caches.keys();
    await Promise.all(
      chaves
        .filter((chave) => chave.startsWith(PREFIXO_CACHE) && chave !== NOME_CACHE)
        .map((chave) => caches.delete(chave)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/avantavendas')) return;
  if (url.pathname === '/avantavendas/versao') return;
  // A Gestão possui bootstrap, versão e recuperação próprios. Deixar esta
  // navegação seguir diretamente para a rede evita servir a tela do Vendas
  // ou um documento antigo como fallback durante a troca de sistema.
  if (url.pathname.startsWith('/avantavendas/gestao')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(buscarComFallback(event.request, '/avantavendas'));
    return;
  }

  event.respondWith(buscarComFallback(event.request));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('push', (event) => {
  let dados = {};
  try { dados = event.data ? event.data.json() : {}; } catch { dados = {}; }
  const titulo = dados.title || dados.titulo || 'AvantaVendas';
  const corpo = dados.body || dados.corpo || dados.mensagem || '';
  event.waitUntil(self.registration.showNotification(titulo, {
    body: corpo,
    icon: dados.icon || '/images/avanta-vendas-pwa-192.png',
    badge: dados.badge || '/images/avanta-vendas-pwa-192.png',
    data: { url: dados.url || '/avantavendas' },
    tag: dados.tag || undefined,
    renotify: Boolean(dados.tag),
    vibrate: [80, 40, 80],
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = event.notification.data?.url || '/avantavendas';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientes) => {
    for (const cliente of clientes) {
      if (cliente.url.includes(destino) && 'focus' in cliente) return cliente.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(destino);
  }));
});
`;
}

export async function GET() {
  return new Response(codigoServiceWorker(), {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'CDN-Cache-Control': 'no-store',
      'Cloudflare-CDN-Cache-Control': 'no-store',
      'Content-Type': 'application/javascript; charset=utf-8',
      'Service-Worker-Allowed': '/avantavendas',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
