import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collapseMarketplacePanel } from '../../app/marketplaces/collapse-panel.ts';

test('os três rodapés reutilizam o botão oficial dentro do conteúdo ocultável, sem limpar estados', () => {
  for (const [file, id, state, close] of [
    ['Vendas', 'sales-content', 'expanded', 'onExpandedChange(false)'],
    ['Anunciados', 'announced-content', 'panelExpanded', 'setPanelExpanded(false)'],
    ['ProductsStock', 'products-content', 'expanded', 'setExpanded(false)'],
  ]) {
    const source = readFileSync(new URL(`../../app/marketplaces/${file}.tsx`, import.meta.url), 'utf8');
    const content = source.indexOf(`<div id="${id}" hidden={!${state}}>`);
    const footer = source.indexOf('${styles.panelFooterActions}', content);
    assert.ok(content > 0 && footer > content);
    const button = source.slice(footer, source.indexOf('</div>', footer));
    assert.match(button, /BotaoExpandirCard variante="painel" modo="lista"/);
    assert.ok(button.includes(`controlsId="${id}"`));
    assert.ok(button.includes(`collapseMarketplacePanel('${id}', () => ${close})`));
    assert.doesNotMatch(button, /setQuery|setPage|setDetailId|setOpen|cancelEditing/);
  }
  const css = readFileSync(new URL('../../app/marketplaces/marketplaces.module.css', import.meta.url), 'utf8');
  assert.match(css, /\.panelFooterActions \{ margin-top: 24px; \}/);
});

for (const reduced of [false, true]) {
  test(`rodapé recolhe antes de devolver foco ao topo, com movimento reduzido ${reduced}`, (t) => {
    const calls = [], frame = [];
    const header = { isConnected: true, focus: options => calls.push(['focus', options]), scrollIntoView: options => calls.push(['scroll', options]) };
    const globals = {
      requestAnimationFrame: callback => { frame.push(callback); },
      document: { getElementById: id => { assert.equal(id, 'sales-content'); return { parentElement: { querySelector: selector => { assert.equal(selector, 'button[aria-controls="sales-content"]'); return header; } } }; } },
      window: { matchMedia: query => { assert.equal(query, '(prefers-reduced-motion: reduce)'); return { matches: reduced }; } },
    };
    for (const [key, value] of Object.entries(globals)) {
      const previous = Object.getOwnPropertyDescriptor(globalThis, key);
      Object.defineProperty(globalThis, key, { configurable: true, value });
      t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
    }
    collapseMarketplacePanel('sales-content', () => calls.push(['collapse']));
    assert.deepEqual(calls, [['collapse']]);
    frame[0]();
    assert.deepEqual(calls, [['collapse'], ['focus', { preventScroll: true }], ['scroll', { block: 'center', behavior: reduced ? 'instant' : 'smooth' }]]);
    header.isConnected = false;
    frame[0]();
    assert.equal(calls.length, 3);
  });
}
