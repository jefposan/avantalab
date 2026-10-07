import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const raiz = new URL('../../', import.meta.url);
const aplicacao = await readFile(new URL('app/avantavendas/sistema/app.js', raiz), 'utf8');
const estilos = await readFile(new URL('app/avantavendas/sistema/styles.css', raiz), 'utf8');

test('Produtos oferece atualização localizada acessível com ícone SVG', () => {
  assert.match(aplicacao, /id="produtosAtualizar"[\s\S]*aria-label="Atualizar produtos"[\s\S]*svgIconEstavel\('rotate-ccw'/);
  assert.match(aplicacao, /product-refresh-status\$\{produtosAtualizando \? ' is-loading' : ''\}[\s\S]*product-refresh-label">Atualizando/);
  assert.match(aplicacao, /\$\{botaoAtualizar\}<button class="primary product-new-button"/);
  assert.match(aplicacao, /function renderizarProdutosPreservandoRolagem\(posicao\)[\s\S]*rolarConteudoPrincipalVendas\(posicao\)/);
  assert.match(aplicacao, /async function atualizarProdutos\(\)[\s\S]*await sincronizarCatalogoAutomaticamente\(false\)[\s\S]*await window\.VendasDb\.listarCatalogoVendas\(\)/);
  assert.match(aplicacao, /renderizarProdutosPreservandoRolagem\(posicaoAnterior\);\s*await new Promise\(\(resolve\) => requestAnimationFrame\(resolve\)\)/);
  assert.match(aplicacao, /const esperaMinima = Math\.max\(0, 520 - \(performance\.now\(\) - iniciadoEm\)\)/);
  assert.match(aplicacao, /window\.atualizarProdutos = atualizarProdutos/);
  assert.doesNotMatch(aplicacao.match(/async function atualizarProdutos\(\)[\s\S]*?(?=\nfunction |\nasync function |$)/)?.[0] || '', /location\.reload/);
});

test('botão de atualizar Produtos respeita toque, tema e redução de movimento', () => {
  assert.match(estilos, /\.product-refresh-button \{[^}]*width: 44px[^}]*height: 44px/);
  assert.match(estilos, /\.dark-theme \.product-refresh-button/);
  assert.match(estilos, /\.produtos-page \.module-title \{[^}]*flex-wrap: nowrap/);
  assert.match(estilos, /\.product-title-actions \{[^}]*align-items: center/);
  assert.match(estilos, /\.product-refresh-button \.(?:is-spinning) \{[^}]*productRefreshSpin/);
  assert.match(estilos, /@keyframes productRefreshSpin/);
  assert.match(estilos, /\.product-refresh-status\.is-loading \.product-refresh-label \{ display: inline; \}/);
  assert.doesNotMatch(estilos, /\.product-refresh-button \.is-spinning \{ animation: none !important; \}/);
});
