import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../../app/marketplaces/AuthorizationRenewal.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const account = { id: '22222222-2222-4222-8222-222222222222', seller_reference: '123', seller_name: 'CONTA_ALVO', status: 'connected', last_synced_at: null, expires_at: null };
const draft = { link: 'https://example.test/marketplaces/renovar#solicitacao=fixture', requestId: 'fixture', expiresAt: new Date(Date.now() + 60_000).toISOString(), sellerName: 'CONTA_ALVO' };
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture({ blocked = false } = {}) {
  const states = [], refs = [], effects = [], monitors = [], calls = [], completed = [];
  let stateIndex, refIndex, result = { status: 'pending' }, closes = 0, url;
  const popup = { closed: false, opener: {}, focus() {}, close() { closes++; this.closed = true; }, document: { body: {} }, location: { replace(value) { url = value; } } };
  const exports = {};
  const css = new Proxy({}, { get: (_, key) => key });
  runInNewContext(compiled, {
    exports, AbortSignal, Date, navigator: { clipboard: { async writeText() {} } },
    window: { open: () => blocked ? null : popup, setInterval: () => 1, clearInterval() {} },
    require(name) {
      if (name === 'react/jsx-runtime') return require(name);
      if (name === 'react') return {
        useState(initial) { const index = stateIndex++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
        useRef(initial) { const index = refIndex++; return refs[index] ||= { current: initial }; },
        useEffect(effect) { effects.push(effect); },
      };
      if (name.endsWith('/Tooltip')) return { __esModule: true, default: () => null };
      if (name.endsWith('.module.css')) return { __esModule: true, default: css };
      if (name === './Anunciados') return { async marketplaceClientRequest(path, body) { calls.push({ path, body }); return body.action === 'status' ? result : draft; } };
      if (name === './renewal-authorization') return { monitorAuthorizationRenewal(options) { monitors.push(options); return () => {}; }, async renewalAuthorizationUrl() { return 'https://auth.mercadolivre.com.br/authorization?state=fixture'; } };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  const render = () => { stateIndex = refIndex = 0; effects.length = 0; const tree = exports.default({ companyId: 'company', account, onClose() {}, onCompleted: value => completed.push(value) }); effects.forEach(effect => effect()); return tree; };
  return { render, popup, calls, completed, monitors, setResult(value) { result = value; }, get closes() { return closes; }, get url() { return url; } };
}
function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (predicate(tree)) return tree;
  const children = tree.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const result = Array.isArray(child) ? child.map(item => find(item, predicate)).find(Boolean) : find(child, predicate);
    if (result) return result;
  }
  return null;
}
const button = (tree, label) => find(tree, node => node.type === 'button' && node.props.children === label);

test('Autorizar agora confirma a conta automaticamente, fecha popup e mostra mensagem curta', async () => {
  const app = fixture();
  button(app.render(), 'Autorizar agora').props.onClick(); await tick();
  assert.equal(app.popup.opener, null); assert.match(app.url, /^https:\/\/auth.mercadolivre.com.br/);
  let tree = app.render(); const monitor = app.monitors.at(-1);
  assert.ok(monitor); assert.ok(!find(tree, node => typeof node.props?.children === 'string' && node.props.children.includes('use Atualizar contas')));
  app.setResult({ status: 'completed', account: { ...account, expires_at: '2026-10-12T00:00:00Z' } });
  const result = await monitor.read(AbortSignal.timeout(1000)); monitor.onResult(result);
  tree = app.render();
  assert.equal(app.closes, 1); assert.equal(app.completed.length, 1); assert.equal(app.completed[0].id, account.id);
  assert.ok(find(tree, node => node.props?.role === 'status' && node.props.children === 'Renovação concluída' && node.props.className === 'catalogSuccess'));
  assert.equal(button(tree, 'Autorizar agora'), null); assert.equal(button(tree, 'Gerar link'), null);
  assert.deepEqual(JSON.parse(JSON.stringify(app.calls.at(-1).body)), { action: 'status', empresaId: 'company', connectionId: account.id, requestId: draft.requestId });
});

test('link ao titular é acompanhado sem janela local; conclusão não pede atualização manual', async () => {
  const app = fixture(); button(app.render(), 'Gerar link').props.onClick(); await tick(); app.render();
  const monitor = app.monitors.at(-1);
  app.setResult({ status: 'completed', account }); monitor.onResult(await monitor.read(AbortSignal.timeout(1000)));
  assert.equal(app.closes, 0); assert.equal(app.completed.length, 1);
  assert.ok(find(app.render(), node => node.props?.children === 'Renovação concluída'));
});

test('popup bloqueado ou resultado de outra conta não mostra sucesso nem atualiza contas', async () => {
  const blocked = fixture({ blocked: true }); button(blocked.render(), 'Autorizar agora').props.onClick(); await tick();
  assert.equal(blocked.calls.length, 0); assert.equal(blocked.completed.length, 0);
  assert.ok(find(blocked.render(), node => typeof node.props?.children === 'string' && node.props.children.includes('Permita pop-ups')));
  const app = fixture(); button(app.render(), 'Gerar link').props.onClick(); await tick(); app.render();
  app.setResult({ status: 'completed', account: { ...account, id: 'other' } });
  await assert.rejects(app.monitors.at(-1).read(AbortSignal.timeout(1000)), /conta renovada/);
  app.monitors.at(-1).onResult({ status: 'failed', message: 'Conta diferente. Tente novamente.' });
  assert.equal(app.completed.length, 0); assert.equal(app.closes, 0);
  assert.ok(find(app.render(), node => node.props?.children === 'Conta diferente. Tente novamente.'));
});

test('uma confirmação antiga não encerra a solicitação nova nem fecha sua janela', async () => {
  const app = fixture(); button(app.render(), 'Gerar link').props.onClick(); await tick();
  let tree = app.render(); const old = app.monitors.at(-1);
  button(tree, 'Novo link').props.onClick(); await tick(); tree = app.render();
  old.onResult({ status: 'completed', account });
  assert.equal(app.completed.length, 0); assert.equal(app.closes, 0);
  assert.equal(find(app.render(), node => node.props?.children === 'Renovação concluída'), null);
});
