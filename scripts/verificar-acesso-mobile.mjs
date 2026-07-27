import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const falhas = [];

async function ler(caminho) {
  return readFile(resolve(raiz, caminho), 'utf8');
}

function exigir(condicao, mensagem) {
  if (!condicao) falhas.push(mensagem);
}

const [
  aplicativo,
  pagina,
  serviceWorker,
  serviceWorkerVendas,
  configuracaoNext,
  rotaVersao,
] = await Promise.all([
  ler('public/mobile-app.js'),
  ler('app/mobile/page.tsx'),
  ler('public/mobile-sw.js'),
  ler('app/avantavendas/sw.js/route.ts'),
  ler('next.config.ts'),
  ler('app/mobile/versao/route.ts'),
]);

const inicioConclusao = aplicativo.indexOf("state.dadosCriticosProntos = true;");
const renderFinal = aplicativo.indexOf("render();", inicioConclusao);
const progressoFinal = aplicativo.indexOf("avancarEtapaDados('Acesso pronto');", inicioConclusao);

exigir(inicioConclusao >= 0, 'A carga crítica não marca que os dados estão prontos.');
exigir(renderFinal > inicioConclusao, 'A interface precisa ser montada depois dos dados críticos.');
exigir(
  progressoFinal > renderFinal,
  'Acesso pronto/100% deve ser concluído somente depois da montagem da interface.',
);
exigir(
  aplicativo.includes('!state.dadosCriticosProntos'),
  'A conclusão de contingência precisa exigir dados críticos prontos.',
);
exigir(
  pagina.includes("window.addEventListener('pageshow', retomarPreparacaoAcesso)"),
  'A preparação precisa ser retomada ao restaurar o PWA.',
);
exigir(
  pagina.includes("document.addEventListener('visibilitychange', retomarPreparacaoAcesso)"),
  'A preparação precisa ser retomada ao voltar do segundo plano.',
);
exigir(
  pagina.includes("fetch('/mobile/versao?agora='"),
  'O carregador precisa verificar a versão ativa sem cache.',
);
exigir(
  pagina.includes("import Script from 'next/script'") &&
    pagina.includes('strategy="afterInteractive"') &&
    !pagina.includes('<script dangerouslySetInnerHTML'),
  'O bootstrap mobile precisa aguardar a hidratação oficial do Next.js.',
);

const cacheAplicativo = aplicativo.match(/avantalab-mobile-v\d+/)?.[0];
const cacheServiceWorker = serviceWorker.match(/avantalab-mobile-v\d+/)?.[0];
exigir(
  cacheAplicativo && cacheAplicativo === cacheServiceWorker,
  `Caches divergentes entre aplicativo (${cacheAplicativo}) e service worker (${cacheServiceWorker}).`,
);
exigir(
  serviceWorker.includes("key.startsWith(CACHE_PREFIX)"),
  'O service worker da Gestão só pode excluir caches do próprio prefixo.',
);
exigir(
  configuracaoNext.includes('{ source: "/avantavendas/gestao", headers: semCachePwa }'),
  'A rota de troca para a Gestão precisa usar cabeçalhos sem cache.',
);
exigir(
  serviceWorkerVendas.includes("url.pathname.startsWith('/avantavendas/gestao')"),
  'O service worker do Vendas precisa liberar a rota própria da Gestão.',
);
exigir(
  rotaVersao.includes("import { APP_VERSION }") && rotaVersao.includes("'Cache-Control': 'no-store"),
  'A rota de versão precisa usar a versão oficial e resposta sem cache.',
);

if (falhas.length) {
  throw new Error(`Fluxo de acesso mobile inválido:\n- ${falhas.join('\n- ')}`);
}

console.log('Fluxo de acesso mobile validado.');
