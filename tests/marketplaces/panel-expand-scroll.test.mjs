import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { captureMarketplacePanelExpansion } from '../../app/marketplaces/scroll-panel-row.ts';

function fixture(t, id = 'sales-content', reduced = false) {
  const frames = [], calls = [];
  const state = { expanded: 'false', hidden: true, disabled: false, ariaDisabled: false, connected: true, inside: true, dialog: false, top: 900 };
  const card = { get isConnected() { return state.connected; }, getBoundingClientRect: () => ({ top: state.top }), closest: () => ({ querySelector: selector => ({ getBoundingClientRect: () => ({ bottom: selector === 'header' ? 80 : 170 }) }) }) };
  const content = { get hidden() { return state.hidden; }, parentElement: card };
  const button = { get disabled() { return state.disabled; }, get isConnected() { return state.connected; }, getAttribute: key => key === 'aria-controls' ? id : key === 'aria-disabled' ? String(state.ariaDisabled) : state.expanded };
  class ElementMock {
    closest(selector) { return selector.startsWith('[role=') ? state.dialog ? {} : null : state.expanded === 'false' ? button : null; }
  }
  const root = { contains: () => state.inside }, target = new ElementMock();
  const globals = { Element: ElementMock, document: { getElementById: key => key === id ? content : null }, requestAnimationFrame: fn => frames.push(fn), window: { scrollY: 1000, matchMedia: () => ({ matches: reduced }), scrollTo: value => calls.push(value) } };
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  return { state, frames, calls, click: () => captureMarketplacePanelExpansion({ target, currentTarget: root }), flush: () => frames.splice(0).forEach(fn => fn()) };
}

for (const id of ['connected-accounts-content', 'sales-content', 'announced-content', 'warehouses-content', 'products-content', 'sales-report-content']) {
  for (const reduced of [false, true]) test(`${id}: expansão alinha após o layout, movimento reduzido ${reduced}`, t => {
    const f = fixture(t, id, reduced);
    f.click(); assert.equal(f.calls.length, 0);
    f.state.expanded = 'true'; f.state.hidden = false; f.state.top = 300;
    f.flush(); assert.deepEqual(f.calls, [{ top: 1122, behavior: reduced ? 'instant' : 'smooth' }]);
    f.click(); f.flush(); assert.equal(f.calls.length, 1, 'recolher não agenda rolagem');
  });
}

test('não desloca a página em seletor, modal, botão desabilitado ou portal', t => {
  const f = fixture(t, 'category-options'); f.click(); assert.equal(f.frames.length, 0);
});
for (const key of ['disabled', 'ariaDisabled', 'dialog']) test(`expansão ignora ${key}`, t => {
  const f = fixture(t); f.state[key] = true; f.click(); assert.equal(f.frames.length, 0);
});
for (const kind of ['recolhido', 'desmontado', 'fora-do-modulo', 'oculto']) test(`layout ${kind} antes do frame cancela o alinhamento`, t => {
  const f = fixture(t); f.click();
  f.state.expanded = 'true'; f.state.hidden = false;
  if (kind === 'recolhido') f.state.expanded = 'false';
  if (kind === 'desmontado') f.state.connected = false;
  if (kind === 'fora-do-modulo') f.state.inside = false;
  if (kind === 'oculto') f.state.hidden = true;
  f.flush(); assert.equal(f.calls.length, 0);
});

test('captura mantém o recolhimento de outras fichas antes da medição e não vira efeito de refresh', () => {
  const source = readFileSync('app/marketplaces/MarketplacesClient.tsx', 'utf8');
  assert.match(source, /onClickCapture=\{event => \{ captureMarketplaceDetailNavigation\(companyId, event\); captureMarketplacePanelExpansion\(event\); \}\}/);
  assert.equal((source.match(/captureMarketplacePanelExpansion\(event\)/g) || []).length, 1);
  const helper = readFileSync('app/marketplaces/scroll-panel-row.ts', 'utf8');
  assert.doesNotMatch(helper.slice(helper.indexOf('export function captureMarketplacePanelExpansion')), /preventDefault|stopPropagation|\.focus\(/);
  const css = readFileSync('app/marketplaces/marketplaces.module.css', 'utf8');
  assert.ok(css.includes(':has(> :is([id="connected-accounts-content"],[id="sales-content"],[id="announced-content"],[id="warehouses-content"],[id="products-content"]):not([hidden])) { min-block-size: max(0px, calc(100dvh - var(--marketplace-navigation-height, 200px) - 8px))'), 'IDs literais em CSS Modules e altura útil permitem alinhar o último card vazio');
  assert.match(css, /@media screen \{[^}]*min-block-size: max/, 'a altura mínima não é aplicada à impressão');
});

test('Resultado de vendas usa o contrato compartilhado e conserva espaço para alinhar o último card',()=>{
 const source=readFileSync('app/marketplaces/SalesReport.tsx','utf8');
 assert.match(source,/controlsId="sales-report-content"/);
 assert.match(source,/id="sales-report-content" hidden=\{!expanded\}/);
 const css=readFileSync('app/marketplaces/sales-report.module.css','utf8');
 assert.match(css,/@media screen[^\n]*\.report:has\(> \[id="sales-report-content"\]:not\(\[hidden\]\)\)/);
 assert.match(css,/min-block-size:max\(0px,calc\(100dvh/);
});
