import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as stockSyncModel from '../../app/modules/marketplaces/stock-reconciliation.ts';
import { priceStockState } from '../../app/modules/marketplaces/price-stock-state.ts';
const require = createRequire(import.meta.url);

test('quantidade compacta: passos, cancelar sem gravar, saldo final, espera e repetição idempotente', async () => {
  const states = [], refs = [], effects = [], writes = [];
  let cursor = 0, refCursor = 0, first = true, release, fail = false;
  let stock = { productId: 'product', quantity: null, confirmed: false, revision: 1, canManage: true };
  const hooks = {
    useCallback(fn) { return fn; },
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(initial) { const i = refCursor++; return refs[i] ||= { current: initial }; },
    useEffect(fn) { if (first) effects.push(fn); },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/PriceProductStock.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, Error, AbortController, AbortSignal, crypto, window:{addEventListener(){},removeEventListener(){}}, requestAnimationFrame(fn) { fn(); },
    require(name) {
      if(name.includes('ModalConfirmacao'))return {default:'zero-modal'}; if (name === 'react') return hooks;
      if (name.includes('ProductRemoval')) return {default:'product-removal'};
      if (name.includes('StockSync')) return {StockSyncDialog:'stock-sync-dialog'};
      if (name.includes('stock-reconciliation')) return stockSyncModel;
      if (name.includes('direct-sales')) return { DIRECT_SALES_CHANGED:'direct-sales-changed' };
      if (name.includes('DirectSaleActions')) return { default: 'direct-sales' };
      if (name.includes('BotaoAcaoCompacto')) return { default: 'button' };
      if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => key }) };
      if (name.includes('price-stock-state')) return { priceStockState };
      if (name.includes('product-stock-events')) return { notifyProductStockChanged() {} };
      if (name.includes('product-internal-notes')) return { PRODUCT_INTERNAL_NOTES_LIMIT:160 };
      return require(name);
    },
  });
  const request = async (_path, options) => {
    const body = JSON.parse(options.body);
    if (body.action === 'context') return { stock: { ...stock } };
    writes.push(body);
    await new Promise(done => { release = done; });
    if (fail) throw Error('Falha simulada');
    stock = { ...stock, quantity: body.quantity, confirmed: true, revision: stock.revision + 1 };
    return { stock: { ...stock } };
  };
  let tree;
  function render() { cursor = 0; refCursor = 0; const wrapper = exports.default({ companyId: 'company', productId: 'product', request }); tree = wrapper.type(wrapper.props); first = false; }
  function all(node) { if (Array.isArray(node)) return node.flatMap(all); if (!node || typeof node !== 'object') return []; return [node, ...all(node.props?.children)]; }
  const find = predicate => { const node = all(tree).find(predicate); assert.ok(node); return node; };
  const textButton = label => find(n => n.type === 'button' && n.props.children === label);
  const step = label => find(n => n.type === 'button' && n.props['aria-label'] === label);
  const input = () => find(n => n.type === 'input');
  render(); effects.forEach(fn => fn()); await new Promise(done => setImmediate(done)); render();
  textButton('Ajustar estoque').props.onClick(); render();
  assert.equal(input().props.size, 5);
  const row = find(n => n.props?.className === 'controls').props.children;
  assert.equal(row.length, 3); assert.equal(row[0].props['aria-label'], 'Diminuir quantidade'); assert.equal(row[1].type, 'input'); assert.equal(row[2].props['aria-label'], 'Aumentar quantidade');
  const actions=find(n=>n.props?.className==='formActions').props.children;
  assert.equal(actions[0].props.children,'Cancelar');assert.equal(actions[1].props.children,'Concluir');
  step('Aumentar quantidade').props.onClick(); render(); assert.equal(input().props.value, '1');
  assert.equal(step('Diminuir quantidade').props.disabled, false);
  step('Aumentar quantidade').props.onClick(); render(); assert.equal(input().props.value, '2');
  step('Diminuir quantidade').props.onClick(); render(); assert.equal(input().props.value, '1');
  input().props.onChange({ target: { value: '123' } }); render(); assert.equal(input().props.value, '123');
  input().props.onChange({ target: { value: '1.5' } }); render(); assert.equal(input().props.value, '123');
  textButton('Cancelar').props.onClick(); render(); assert.equal(writes.length, 0); assert.equal(all(tree).some(n => n.type === 'form'), false);
  textButton('Ajustar estoque').props.onClick(); render(); input().props.onChange({ target: { value: '3' } }); render();
  let pending = find(n => n.type === 'form').props.onSubmit({ preventDefault() {} }); render();
  assert.equal(textButton('Salvando…').props.disabled, true); assert.equal(step('Aumentar quantidade').props.disabled, true); assert.equal(input().props.disabled, true);
  await find(n => n.type === 'form').props.onSubmit({ preventDefault() {} }); assert.equal(writes.length, 1);
  release(); await pending; render(); assert.equal(stock.quantity, 3);
  textButton('Editar').props.onClick(); render(); input().props.onChange({ target: { value: '0' } }); render();
  assert.equal(step('Diminuir quantidade').props.disabled, true);
  fail = true; await find(n => n.type === 'form').props.onSubmit({ preventDefault() {} }); render(); assert.equal(writes.length,1,'zero não envia antes da confirmação física'); pending=find(n=>n.type==='zero-modal'&&n.props.aberto).props.aoConfirmar(); release(); await pending; render();
  assert.equal(input().props.disabled, true, 'tentativa incerta não aceita outro valor');
  assert.equal(step('Aumentar quantidade').props.disabled, true);
  fail = false; pending = find(n => n.type === 'form').props.onSubmit({ preventDefault() {} }); release(); await pending; render();
  assert.equal(writes.at(-1).requestKey, writes.at(-2).requestKey); assert.equal(stock.quantity, 0);
});

test('formulário setorizado separa quantidade e ações com alvos de toque oficiais', () => {
  const css = readFileSync('app/marketplaces/price-product-stock.module.css', 'utf8');
  assert.match(css, /grid-template-columns: 44px minmax\(48px,1fr\) 44px/);
  assert.match(css, /\.quantityRow \{[^}]*grid-template-columns:minmax\(0,1fr\) 88px/);
  assert.doesNotMatch(css, /max-width: 420px/);
  assert.match(css, /\.formActions \{[^}]*grid-template-columns:1fr 1fr/);
  assert.match(css, /\.controls input \{[^}]*text-align: center/);
  assert.match(css, /min-height: 48px; height: 48px/);
  assert.match(css, /\.confirm > span \{[^}]*var\(--av-ean-reading-background,/);
  assert.match(readFileSync('app/marketplaces/PriceProductStock.tsx', 'utf8'), /import BotaoAcaoCompacto/);
});
