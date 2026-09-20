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
