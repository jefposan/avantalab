import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { publicationShippingKey } from '../../app/modules/marketplaces/publication-shipping.ts';
const require = createRequire(import.meta.url);
const all = node => Array.isArray(node) ? node.flatMap(all) : node && typeof node === 'object' ? [node, ...all(node.props?.children)] : [];
function harness() {
  const states = [], effectStates = [], pending = [], timers = new Map(), requests = [], patches = [];
  let cursor = 0, effectCursor = 0, timerId = 0, tree;
  const form = { productId: 'MLB1', categoryId: 'MLB2', price: 198, listingType: 'gold_pro', shippingMode: 'me2', condition: 'new', freeShipping: false };
  const props = { companyId: 'company', accountId: 'account', form, disabled: false, onReview(patch, costUnavailable) { patches.push({ patch, costUnavailable }); props.form = { ...props.form, ...patch }; } };
  const exported = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/PublicationShipping.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports: exported, AbortController, AbortSignal, Date, Number, Error,
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id; }, clearTimeout(id) { timers.delete(id); },
    require(name) {
      if (name === 'react') return { useRef(value){const i=cursor++;return states[i]??={current:value};}, useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], next => states[i] = typeof next === 'function' ? next(states[i]) : next]; }, useEffect(fn, deps) { const i = effectCursor++, old = effectStates[i]; if (!old || deps.some((dep, n) => !Object.is(dep, old.deps[n]))) { pending.push(() => { old?.cleanup?.(); effectStates[i] = { deps, cleanup: fn() }; }); } } };
      if (name.includes('publication-shipping')) return { publicationShippingKey };
      if (name.includes('BotaoAcaoCompacto')) return { default: 'button' };
      if (name.includes('formatters')) return { formatarMoeda: n => `R$ ${n.toFixed(2).replace('.', ',')}` };
      if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => key }) };
      if (name === './Anunciados') return { marketplaceClientRequest(path, body, signal) { return new Promise((resolve, reject) => requests.push({ path, body, signal, resolve, reject })); } };
      return require(name);
    },
  });
  const render = () => { cursor = 0; effectCursor = 0; tree = exported.default(props); pending.splice(0).forEach(fn => fn()); return tree; };
  const start = () => { const entry = [...timers.entries()].find(([, timer]) => timer.delay === 650); assert.ok(entry); timers.delete(entry[0]); entry[1].fn(); };
  const resolveQuote = async (request, overrides = {}) => { request.resolve({ quote: { policy: 'mandatory', freeShipping: true, sellerCost: 58.75, token: 'proof', dimensionsSource: 'category', notice: '', expiresAt: new Date(Date.now() + 600000).toISOString(), ...overrides } }); await new Promise(setImmediate); render(); };
  return { props, render, start, requests, patches, resolveQuote, nodes: () => all(tree), unmount: () => effectStates.forEach(effect => effect?.cleanup?.()) };
}

test('frete obrigatório é marcado/bloqueado, custo em destaque e uma só consulta após a marcação automática', async () => {
  const h = harness(); h.render(); h.start(); assert.equal(h.requests[0].path, 'publicar/frete');
  await h.resolveQuote(h.requests[0]); h.render();
  const checkbox = h.nodes().find(node => node.type === 'input' && node.props.type === 'checkbox');
  assert.equal(checkbox.props.checked, true); assert.equal(checkbox.props.disabled, true);
  assert.ok(h.nodes().some(node => node.props?.children === 'Obrigatório pelo Mercado Livre'));
  assert.ok(h.nodes().some(node => node.props?.children === 'R$ 58,75'));
  assert.ok(h.nodes().some(node => JSON.stringify(node.props?.children).includes('medidas padrão da categoria')));
  assert.equal(h.props.form.shippingQuoteToken, 'proof'); assert.equal(h.requests.length, 1); h.unmount();
});

test('opção facultativa invalida estimativa ao mudar; custo ausente exige ciência, sem exibir zero', async () => {
  const h = harness(); h.render(); h.start(); await h.resolveQuote(h.requests[0], { policy: 'optional', freeShipping: false });
  let checkbox = h.nodes().find(node => node.type === 'input' && node.props.type === 'checkbox');
  assert.equal(checkbox.props.disabled, false); checkbox.props.onChange({ target: { checked: true } }); h.render();
  assert.equal(h.props.form.shippingQuoteToken, undefined); h.start();
  await h.resolveQuote(h.requests[1], { sellerCost: null });
  assert.ok(h.nodes().some(node => node.props?.children === 'Indisponível'));
  const acknowledgement = h.nodes().filter(node => node.type === 'input' && node.props.type === 'checkbox').at(-1);
  acknowledgement.props.onChange({ target: { checked: true } }); h.render();
  assert.equal(h.props.form.acknowledgeUnavailableShippingCost, true); assert.equal(h.requests.length, 2); h.unmount();
});

test('trocar conta cancela consulta e ignora resposta antiga; campos insuficientes não consultam', async () => {
  const h = harness(); h.render(); h.start(); h.props.accountId = 'other'; h.props.form = { ...h.props.form, price: 220 }; h.render();
  assert.equal(h.requests[0].signal.aborted, true); h.start();
  await h.resolveQuote(h.requests[0]); assert.equal(h.props.form.shippingQuoteToken, undefined);
  await h.resolveQuote(h.requests[1], { policy: 'unknown', freeShipping: false, sellerCost: null, token: undefined });
  assert.equal(h.props.form.shippingQuoteToken, undefined); h.unmount();
  const empty = harness(); empty.props.form.price = 0; empty.render(); assert.equal(empty.requests.length, 0); empty.unmount();
});

test('renderização de outra conta não aborta frete; recusa não causa loop e nova revisão renova estimativa',async()=>{
 const h=harness();h.render();h.start();const initial=h.requests[0],previous=h.props.onReview;
 h.props.onReview=(...args)=>previous(...args);h.render();assert.equal(initial.signal.aborted,false);
 initial.reject(Error('Frete temporariamente indisponível'));await new Promise(setImmediate);h.render();h.render();assert.equal(h.requests.length,1);assert.ok(h.nodes().some(n=>n.props?.children==='Frete temporariamente indisponível'));
 const retry=h.nodes().find(n=>n.type==='button'&&n.props.children==='Atualizar estimativa');retry.props.onClick();h.render();h.start();await h.resolveQuote(h.requests[1]);
 h.props.reviewId='nova-revisao';h.render();h.start();assert.equal(h.requests.length,3);h.unmount();
});
