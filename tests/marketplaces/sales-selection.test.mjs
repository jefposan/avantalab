import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { saleGroup, salesInPeriod, salesSummary } from '../../app/modules/marketplaces/sales-status.ts';

const client = readFileSync(new URL('../../app/marketplaces/MarketplacesClient.tsx', import.meta.url), 'utf8');
const source = ts.createSourceFile('MarketplacesClient.tsx', client, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(predicate) {
  let found;
  function visit(node) { if (predicate(node)) found = node; else ts.forEachChild(node, visit); }
  visit(source);
  assert.ok(found, 'Implementação do filtro deve existir');
  return found;
}
// Executa o handler e o filtro reais da tela, sem montar rede, sessão ou hooks.
const handler = find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'selectSalesFromHeader');
const visible = find(node => ts.isVariableDeclaration(node) && node.name.getText(source) === 'visibleSales');
const compile = text => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText;
const choose = new Function('sales', 'setSalesSnapshot', 'setSalesAccount', 'setSalesExpanded', 'setSalesPeriod', 'setSalesGroup', `${compile(handler.getText(source))}; return selectSalesFromHeader;`);
const readVisible = new Function('salesSnapshot', 'salesPeriod', 'salesGroup', 'salesAccount', 'salesInPeriod', 'saleGroup', `${compile(`const read = ${visible.initializer.arguments[0].getText(source)};`)} return read();`);
const fixture = (connectionId, orderId, shipmentStatus, soldAt = '2026-10-10T15:00:00Z') => ({ connectionId, orderId, status: 'paid', shipmentStatus, shipmentSubstatus: null, labelStatus: 'unavailable', soldAt, createdAt: soldAt });
const sales = [
  ...Array.from({ length: 6 }, (_, index) => fixture(index % 2 ? 'conta-b' : 'conta-a', String(index), 'delivered')),
  fixture('conta-c', 'pendente', 'pending'),
  fixture('conta-a', 'antigo', 'delivered', '2026-09-01T15:00:00Z'),
];
function setup() {
  const state = { snapshot: [], account: 'conta-c', expanded: false, period: { start: '2026-10-01', end: '2026-10-31' }, group: '' };
  const select = choose(sales, value => state.snapshot = value, value => state.account = value, value => state.expanded = value, value => state.period = value, value => state.group = value);
  const rows = () => readVisible(state.snapshot, state.period, state.group, state.account, salesInPeriod, saleGroup);
  return { state, select, rows };
}

test('inicia período, situações e contas em Todos, inclusive nos anúncios', () => {
  assert.match(client, /\[salesAccount, setSalesAccount\] = useState\(''\)/);
  assert.match(client, /\[salesGroup, setSalesGroup\] = useState<SaleGroup \| ''>\(''\)/);
  assert.match(client, /\[salesPeriod, setSalesPeriod\] = useState<SalePeriod>\(\{ start: '', end: '' \}\)/);
  const listings = readFileSync(new URL('../../app/marketplaces/Anunciados.tsx', import.meta.url), 'utf8');
  assert.match(listings, /\[accountSelection, setAccountId\] = useState\(''\)/);
  assert.match(listings, /\[status, setStatus\] = useState\(''\)/);
});
test('Entregues 6 mostra os seis de todas as contas no período, mesmo após filtrar outra conta', () => {
  const { state, select, rows } = setup();
  select({ group: 'delivered' });
  assert.equal(state.account, ''); assert.equal(state.expanded, true);
  assert.equal(rows().length, 6);
  assert.deepEqual(new Set(rows().map(row => row.connectionId)), new Set(['conta-a', 'conta-b']));
  assert.equal(salesSummary(salesInPeriod(sales, state.period), 'delivered').filteredTotal, rows().length);
  state.account = 'conta-b'; assert.equal(rows().length, 3);
  assert.equal(state.group, 'delivered'); assert.deepEqual(state.period, { start: '2026-10-01', end: '2026-10-31' });
});
test('outra situação volta a todas as contas e aplica a base recente sem manter snapshot antigo', () => {
  const { state, select, rows } = setup();
  select({ group: 'delivered' }); state.account = 'conta-b';
  select({ group: 'awaiting_dispatch' });
  assert.equal(state.account, ''); assert.equal(state.snapshot, sales);
  assert.deepEqual(rows().map(row => row.orderId), ['pendente']);
  select({ group: '' }); assert.equal(rows().length, 7);
});
test('período no header limpa conta mas preserva situação; Todos inclui também datas anteriores', () => {
  const { state, select, rows } = setup();
  select({ group: 'delivered' }); state.account = 'conta-b';
  select({ period: { start: '2026-09-01', end: '2026-09-30' } });
  assert.equal(state.account, ''); assert.equal(state.group, 'delivered');
  assert.deepEqual(rows().map(row => row.orderId), ['antigo']);
  select({ period: { start: '', end: '' } }); assert.equal(rows().length, 7);
});
test('header usa o handler global e escolher conta para publicar não restringe vendas', () => {
  assert.match(client, /onPeriodChange=\{period => selectSalesFromHeader\(\{ period \}\)\}/);
  assert.match(client, /onGroupChange=\{group => selectSalesFromHeader\(\{ group \}\)\}/);
  assert.match(client, /connectedAccountSelect\} onClick=\{\(\) => setSelectedAccount\(account.id\)\}/);
  assert.match(client, /onAccountChange=\{account => \{ setSalesSnapshot\(sales\); setSalesAccount\(account\); \}\}/);
  assert.match(client, /setSalesAccount\(current => available.some\(account => account.id === current && account.status === 'connected'\) \? current : ''\)/);
});
