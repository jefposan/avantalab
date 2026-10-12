import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { scrollMarketplaceRow } from '../../app/marketplaces/scroll-panel-row.ts';

test('seta compartilhada acompanha aria-expanded e detalhes sem criar botão aninhado', () => {
  const source = readFileSync(new URL('../../app/marketplaces/Vendas.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../../app/marketplaces/marketplaces.module.css', import.meta.url), 'utf8');
  assert.match(source, /<Icon name="chevron" size=\{16\} className=\{styles.saleDisclosure\} aria-hidden="true"/);
  assert.match(source, /aria-controls=\{`sale-details-\$\{sale.id\}`\}/);
  assert.match(source, /<div id=\{`sale-details-\$\{sale.id\}`\} className=\{styles.saleDetails\}/);
  assert.match(css, /\.saleDisclosure \{[^}]*transform: rotate\(90deg\)/);
  assert.match(css, /\.saleSummary\[aria-expanded="true"\] \.saleDisclosure \{ transform: rotate\(-90deg\); \}/);
  assert.match(css, /\.saleSummary \.saleStatusAction b \{[^}]*max-width: none;/);
});

test('rolagem manual respeita cabeçalho fixo e redução de movimento, sem passar do topo', () => {
  const previous = globalThis.window;
  try {
    for (const reduced of [true, false]) for (const header of [80, 229]) {
      const calls = [];
      globalThis.window = { scrollY: 1000, matchMedia: () => ({ matches: reduced }), scrollTo: args => calls.push(args) };
      scrollMarketplaceRow({ closest: () => ({ querySelector: () => ({ getBoundingClientRect: () => ({ bottom: header }) }) }), getBoundingClientRect: () => ({ top: 500 }) });
      assert.deepEqual(calls, [{ top: 1500 - header - 8, behavior: reduced ? 'instant' : 'smooth' }]);
      globalThis.window.scrollY = 0;
      scrollMarketplaceRow({ closest: () => null, getBoundingClientRect: () => ({ top: -10 }) });
      assert.equal(calls[1].top, 0);
    }
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; }
});
test('somente clique de abertura rola; fechamento, respostas e eventos automáticos não agendam rolagem', () => {
  const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
  const sales = read('app/marketplaces/Vendas.tsx');
  assert.match(sales, /const opening = open !== sale.id/);
  assert.match(sales, /if \(opening\) requestAnimationFrame/);
  assert.match(sales, /button.isConnected && button.getAttribute\('aria-expanded'\) === 'true'/);
  assert.equal((sales.match(/scrollMarketplaceRow\(button\)/g) || []).length, 1);
  assert.doesNotMatch(sales, /useEffect/);
  const css = read('app/marketplaces/marketplaces.module.css');
  assert.match(css, /\.salesPanel \.saleSummary\[aria-expanded="true"\] \{ background: color-mix\(in srgb, var\(--brand\) 8%, #fff\); box-shadow: inset 3px 0 0 var\(--brand\); \}/);
  assert.match(css, /\.dark \.salesPanel \.saleSummary\[aria-expanded="true"\] \{ background: color-mix\(in srgb, var\(--brand\) 16%, #182235\); \}/);
});

test('rolagem de linha aberta deixa espaço depois das marcas fixadas, não só do header', () => {
  const previous = globalThis.window;
  try {
    const calls = [];
    globalThis.window = { scrollY: 1000, matchMedia: () => ({ matches: true }), scrollTo: args => calls.push(args) };
    scrollMarketplaceRow({ closest: () => ({ querySelector: selector => ({ getBoundingClientRect: () => ({ bottom: selector === 'header' ? 80 : 190 }) }) }), getBoundingClientRect: () => ({ top: 500 }) });
    assert.equal(calls[0].top, 1302);
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; }
});
