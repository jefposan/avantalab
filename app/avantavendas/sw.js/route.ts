import { APP_VERSION } from '../../lib/version';

export const dynamic = 'force-dynamic';

const prefixoCache = 'avantalab-avantavendas-';
const nomeCache = `${prefixoCache}${APP_VERSION}`;
const caminhoRecursos = '/avantavendas/recursos';

const recursosEssenciais = [
  '/avantavendas',
  '/avantavendas/manifest.webmanifest',
  `${caminhoRecursos}/styles.css?v=${APP_VERSION}`,
  `${caminhoRecursos}/vendor/supabase.min.js?v=${APP_VERSION}`,
  `${caminhoRecursos}/config.js?v=${APP_VERSION}`,
  `${caminhoRecursos}/supabase-client.js?v=${APP_VERSION}`,
  `${caminhoRecursos}/app.js?v=${APP_VERSION}`,
  '/images/logo-avantalab-oficial.png',
  '/images/avanta-vendas-icon-192.png',
  '/images/avanta-vendas-icon-512.png',
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

  if (event.request.mode === 'navigate') {
    event.respondWith(buscarComFallback(event.request, '/avantavendas'));
    return;
  }

  event.respondWith(buscarComFallback(event.request));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
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
