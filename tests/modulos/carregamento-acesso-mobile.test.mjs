import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '../..');
const ler = (arquivo) => readFileSync(resolve(raiz, arquivo), 'utf8');
const paginaGestao = ler('app/mobile/page.tsx');
const appGestao = ler('public/mobile-app.js');
const paginaVendas = ler('app/avantavendas/page.tsx');
const appVendas = ler('app/avantavendas/sistema/app.js');

test('Gestão e Vendas usam o mesmo conteúdo essencial no card de preparação', () => {
  const inicioGestao = appGestao.indexOf('function telaCarregandoMobile()');
  const fimGestao = appGestao.indexOf('function telaPreparacaoAcessoMobileVisivel()', inicioGestao);
  const carregamentoGestao = appGestao.slice(inicioGestao, fimGestao);
  const inicioVendas = appVendas.indexOf('function renderPreparandoAcesso()');
  const fimVendas = appVendas.indexOf('function atualizarProgressoPreparacao(', inicioVendas);
  const carregamentoVendas = appVendas.slice(inicioVendas, fimVendas);

  assert.match(paginaGestao, /className="gestao-access-loader" aria-hidden="true"/);
  assert.match(carregamentoGestao, /class="gestao-access-loader" aria-hidden="true"/);
  assert.match(carregamentoGestao, /class="gestao-access-progress"/);
  assert.doesNotMatch(carregamentoGestao, />AvantaLab<|>AVANTALAB</);

  assert.match(paginaVendas, /className="loader" aria-hidden="true"/);
  assert.match(carregamentoVendas, /class="loader" aria-hidden="true"/);
  assert.match(carregamentoVendas, /class="access-progress"/);
  assert.doesNotMatch(carregamentoVendas, /<p>AvantaLab<\/p>/);
});

test('carregamento anuncia o estado e respeita movimento reduzido', () => {
  assert.match(paginaGestao, /role="status" aria-live="polite" aria-busy="true"/);
  assert.match(paginaVendas, /role="status" aria-live="polite" aria-busy="true"/);
  assert.match(paginaGestao, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(ler('app/avantavendas/sistema/styles.css'), /@media \(prefers-reduced-motion: reduce\)/);
});

test('Gestão inicia no DOM pronto e Vendas antecipa os scripts críticos', () => {
  assert.match(appGestao, /document\.readyState !== 'loading'/);
  assert.match(appGestao, /document\.addEventListener\('DOMContentLoaded', iniciarAposRenderInicial/);
  assert.doesNotMatch(appGestao, /window\.addEventListener\('load', iniciarAposRenderInicial/);

  for (const arquivo of [
    'vendor/supabase.min.js',
    'config.js',
    'supabase-client.js',
    'payment-receipt-v2.js',
    'order-receipt-v2.js',
    'app.js',
  ]) {
    assert.ok(paginaVendas.includes(`'${arquivo}'`), `preload ausente para ${arquivo}`);
  }
  assert.match(paginaVendas, /rel="preload"[\s\S]*as="script"/);
});
