import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const raiz = new URL('../..', import.meta.url);

test('Gestão Mobile aplica a ordem oficial e deixa Agenda oculta por padrão', async () => {
  const mobile = await readFile(new URL('public/mobile-app.js', raiz), 'utf8');
  const trechoOrdem = mobile.slice(
    mobile.indexOf('function ordemDashboardPadrao()'),
    mobile.indexOf('function tituloCardDashboard'),
  );

  const esperada = [
    'ia',
    'saldo',
    'totais',
    'ultimasDespesas',
    'ultimasReceitas',
    'tipos',
    'categorias',
    'evolucaoDespesas',
    'evolucaoReceitas',
    'agenda',
    'insightsAva',
    'caixinha',
    'controlePonto',
    'meusPerfis',
  ];

  let cursor = -1;
  esperada.forEach((id) => {
    const proxima = trechoOrdem.indexOf(`'${id}'`, cursor + 1);
    assert.ok(proxima > cursor, `${id} deve manter sua posição na ordem padrão`);
    cursor = proxima;
  });
  assert.match(trechoOrdem, /function cardsDashboardOcultosPadrao\(\) \{\s*return \['agenda'\];/);
  assert.match(mobile, /dashboardOcultos: cardsDashboardOcultosPadrao\(\),/);
  assert.match(mobile, /function restaurarResumoPadrao\(\) \{[\s\S]*?state\.dashboardOcultos = cardsDashboardOcultosPadrao\(\);/);
  assert.match(mobile, /bind\('reset-dashboard', function \(\) \{[\s\S]*?state\.dashboardOcultos = cardsDashboardOcultosPadrao\(\);/);
});

test('puxador de cards tem contraste reforçado, inclusive no Saldo do mês', async () => {
  const mobile = await readFile(new URL('public/mobile-app.js', raiz), 'utf8');

  assert.match(mobile, /var estiloPuxador = id === 'saldo'/);
  assert.match(mobile, /border-white\/40 bg-white\/20 text-white/);
  assert.match(mobile, /data-dashboard-handle="' \+ escapeHtml\(id\) \+ '"[\s\S]*?h-7 w-8[\s\S]*?cursor-grab/);
  assert.match(mobile, /aria-label="Segure e arraste para mudar a posição de /);
});
