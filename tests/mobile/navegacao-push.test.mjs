import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { resolverDestinoPushMobile } from '../../app/mobile/push-navigation.ts';

const raiz = new URL('../..', import.meta.url);

test('toque no push da Gestão não recarrega o WebView quando ele já está em /mobile', () => {
  assert.deepEqual(
    resolverDestinoPushMobile('https://app.avantalab.com.br/mobile', '/mobile'),
    { href: '/mobile', mesmoDocumento: true },
  );
  assert.deepEqual(
    resolverDestinoPushMobile('https://app.avantalab.com.br/mobile', '/mobile?assinatura=1'),
    { href: '/mobile?assinatura=1', mesmoDocumento: true },
  );
  assert.deepEqual(
    resolverDestinoPushMobile('https://app.avantalab.com.br/mobile', '/mobile/recuperar'),
    { href: '/mobile/recuperar', mesmoDocumento: false },
  );
});

test('destinos externos ou fora da Gestão Mobile são rejeitados', () => {
  assert.equal(
    resolverDestinoPushMobile('https://app.avantalab.com.br/mobile', 'https://exemplo.com/mobile'),
    null,
  );
  assert.equal(
    resolverDestinoPushMobile('https://app.avantalab.com.br/mobile', '/admin'),
    null,
  );
});

test('a ponte preserva a sessão ao abrir o push e entrega o destino para o app', async () => {
  const [ponte, mobile] = await Promise.all([
    readFile(new URL('app/mobile/NativePushNotificationsBridge.tsx', raiz), 'utf8'),
    readFile(new URL('public/mobile-app.js', raiz), 'utf8'),
  ]);

  assert.match(ponte, /if \(destino\.mesmoDocumento\) \{/);
  assert.match(ponte, /window\.history\.replaceState/);
  assert.match(ponte, /EVENTO_ABERTURA_PUSH_MOBILE/);
  assert.doesNotMatch(ponte, /const url = String\(notification\.data\?\.url \|\| '\/mobile'\);\s*window\.location\.assign\(url\)/);
  assert.match(mobile, /window\.addEventListener\('avantalab:push-mobile-aberto'/);
  assert.match(mobile, /carregarNotificacoesNaoLidas\(false\)/);
});

test('a abertura nativa não fica presa no lock de sessão nem em uma tela de erro de autenticação', async () => {
  const [mobile, clienteSupabase, paginaMobile, rotaRecuperacao] = await Promise.all([
    readFile(new URL('public/mobile-app.js', raiz), 'utf8'),
    readFile(new URL('app/lib/supabase.ts', raiz), 'utf8'),
    readFile(new URL('app/mobile/page.tsx', raiz), 'utf8'),
    readFile(new URL('app/mobile/recuperar/route.ts', raiz), 'utf8'),
  ]);

  assert.match(clienteSupabase, /window\.location\.pathname\.startsWith\('\/mobile'\)/);
  assert.match(clienteSupabase, /autoRefreshToken: false/);
  assert.match(clienteSupabase, /detectSessionInUrl: false/);
  assert.match(clienteSupabase, /lock: async \(_nome, _limiteMs, executar\) => executar\(\)/);
  assert.match(mobile, /abrirLoginAposFalhaSessaoMobile\(erroSessao\)/);
  assert.match(mobile, /state\.telaAcesso = 'login'/);
  assert.doesNotMatch(
    mobile,
    /exibirFalhaDeAcessoMobile\('Não foi possível recuperar a sessão\. Tente novamente para reconectar\.'\)/,
  );
  assert.match(mobile, /window\.__avantalabForcarAtualizacaoMobile/);
  assert.match(mobile, /\/mobile\/recuperar\?agora=/);
  assert.match(paginaMobile, /if \(typeof window\.fetch !== 'function'\) return/);
  assert.doesNotMatch(paginaMobile, /if \(!telaPreparacaoVisivel\(\) \|\| typeof window\.fetch !== 'function'\) return/);
  assert.match(paginaMobile, /window\.setInterval\(function \(\) \{[\s\S]*?window\.__avantalabVerificarVersaoMobile\(\);[\s\S]*?\}, 60000\)/);
  assert.match(rotaRecuperacao, /NextResponse\.redirect/);
  assert.match(rotaRecuperacao, /Cache-Control/);
});
