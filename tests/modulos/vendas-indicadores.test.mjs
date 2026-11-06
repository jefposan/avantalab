import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8');
const snippet = source.slice(source.indexOf('function commercialRecordIndicators('), source.indexOf('function CommercialIndicatorIcon('));
const sandbox = { exports: {} };
vm.runInNewContext(ts.transpileModule(snippet + '\nexports.indicators = commercialRecordIndicators;', { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
const indicators = (patch = {}) => sandbox.exports.indicators({ status: 'Confirmado', type: 'Pedido', stock: 'Sem movimentação', fiscal: 'NF-e prevista', ...patch });

test('faturar sem estoque não confirma baixa nem autorização; baixa isolada não confirma faturamento', () => {
  const [billing, stock, fiscal] = indicators({ status: 'Faturado' });
  assert.equal(billing.mark, 'check');
  assert.match(billing.label, /não indica pagamento recebido/);
  assert.equal(stock.mark, 'none');
  assert.equal(fiscal.mark, 'none');
  assert.equal(indicators({ stock: 'Baixado' })[0].mark, 'none');
  assert.equal(indicators({ stock: 'Baixado' })[1].mark, 'check');
});

test('preparação fiscal não significa autorização e falha tem indicação própria', () => {
  assert.equal(indicators({ fiscalDraft: { status: 'Pronto para homologação', remoteState: 'prepared' } })[2].mark, 'clock');
  assert.equal(indicators({ fiscalDraft: { status: 'Pronto para homologação', remoteState: 'authorized' } })[2].mark, 'check');
  assert.equal(indicators({ fiscal: 'Não autorizada' })[2].mark, 'none');
  assert.equal(indicators({ fiscalDraft: { status: 'Pronto para homologação', remoteState: 'rejected' } })[2].tone, 'danger');
});

test('cancelamento comercial preserva nota autorizada e distingue estoque devolvido', () => {
  const [billing, stock, fiscal] = indicators({ status: 'Cancelado', stock: 'Devolvido', fiscal: 'Pronto para homologação · revisar fiscal', fiscalDraft: { status: 'Pronto para homologação', remoteState: 'danfe_ready' } });
  assert.equal(billing.mark, 'close');
  assert.equal(stock.mark, 'back');
  assert.equal(fiscal.mark, 'check');
  assert.equal(fiscal.tone, 'success');
  assert.equal(stock.tone, 'warning');
  assert.match(fiscal.label, /autorizada.*revisar situação fiscal/);
  assert.equal(indicators({ fiscalDraft: { status: 'Cancelado', remoteState: 'canceled' } })[2].mark, 'close');
});

test('cada indicador tem tooltip e foco independentes com somente seu estado atual', () => {
  const jsxSandbox = { exports: {}, require: () => ({ jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }), Tooltip: 'tooltip' };
  const component = source.slice(source.indexOf('function commercialRecordIndicators('), source.indexOf('function SalesView('));
  vm.runInNewContext(ts.transpileModule(component + '\nexports.render = CommercialRecordIndicators;', { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, jsxSandbox);
  const tree = jsxSandbox.exports.render({ record: { status: 'Faturado', type: 'Pedido', stock: 'Baixado', fiscal: 'NF-e autorizada' } });
  const group = tree;
  assert.equal(group.props.role, 'group');
  assert.equal(group.props.tabIndex, undefined);
  assert.equal(group.props.children.length, 3);
  const expected = ['Faturamento: realizado · não indica pagamento recebido', 'Estoque: Baixado', 'Nota fiscal: autorizada'];
  group.props.children.forEach((tooltip, index) => {
    assert.equal(tooltip.type, 'tooltip');
    assert.equal(tooltip.props.texto, expected[index]);
    assert.equal(tooltip.props.posicao, 'bottom');
    assert.equal(tooltip.props.children.props.tabIndex, 0);
    assert.equal(tooltip.props.children.props.role, 'img');
    assert.equal(tooltip.props.children.props['aria-label'], expected[index]);
  });
  const pending = jsxSandbox.exports.render({ record: { status: 'Confirmado', type: 'Pedido', stock: 'Reservado', fiscal: 'NF-e prevista', fiscalDraft: { status: 'Com pendências' } } });
  assert.equal(pending.props.children[0].props.texto, 'Faturamento: não realizado');
  assert.equal(pending.props.children[1].props.texto, 'Estoque: Reservado');
  assert.equal(pending.props.children[2].props.texto, 'Nota fiscal: Com pendências');
});
