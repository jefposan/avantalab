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
  const [stock, billing, fiscal] = indicators({ status: 'Faturado' });
  assert.equal(billing.mark, 'check');
  assert.match(billing.label, /não indica pagamento recebido/);
  assert.equal(stock.mark, 'none');
  assert.equal(fiscal.mark, 'none');
  assert.equal(indicators({ stock: 'Baixado' })[1].mark, 'none');
  assert.equal(indicators({ stock: 'Baixado' })[0].mark, 'check');
});

test('preparação fiscal não significa autorização e falha tem indicação própria', () => {
  assert.equal(indicators({ fiscalDraft: { status: 'Pronto para homologação', remoteState: 'prepared' } })[2].mark, 'clock');
  assert.equal(indicators({ fiscalDraft: { status: 'Pronto para homologação', remoteState: 'authorized' } })[2].mark, 'check');
  assert.equal(indicators({ fiscal: 'Não autorizada' })[2].mark, 'none');
  assert.equal(indicators({ fiscalDraft: { status: 'Pronto para homologação', remoteState: 'rejected' } })[2].tone, 'danger');
});

test('cancelamento comercial preserva nota autorizada e distingue estoque devolvido', () => {
  const [stock, billing, fiscal] = indicators({ status: 'Cancelado', stock: 'Devolvido', fiscal: 'Pronto para homologação · revisar fiscal', fiscalDraft: { status: 'Pronto para homologação', remoteState: 'danfe_ready' } });
  assert.equal(billing.mark, 'close');
  assert.equal(stock.mark, 'back');
  assert.equal(fiscal.mark, 'check');
  assert.equal(fiscal.tone, 'success');
  assert.equal(stock.tone, 'warning');
  assert.match(fiscal.label, /autorizada.*revisar situação fiscal/);
  assert.equal(indicators({ fiscalDraft: { status: 'Cancelado', remoteState: 'canceled' } })[2].mark, 'close');
});

test('ícones elegíveis abrem suas confirmações; bloqueios têm tooltip oficial e não executam ações', () => {
  let permissions = () => true;
  const jsxSandbox = { exports: {}, require: () => ({ jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }), Tooltip: 'tooltip', useContext: () => ({can: permissions}), PermissionContext: {} };
  const component = source.slice(source.indexOf('function commercialRecordIndicators('), source.indexOf('function SalesView('));
  vm.runInNewContext(ts.transpileModule(component + '\nexports.render = CommercialRecordIndicators;', { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, jsxSandbox);
  const local = {type:'pedido',status:'Confirmado',order:{stockState:'Sem movimentação',fiscalDocument:'nfe',lines:[{kind:'produto'}]}};
  const record = {status:'Confirmado',type:'Pedido',stock:'Sem movimentação',fiscal:'NF-e prevista',localRecord:local};
  const calls=[];
  const render = patch => jsxSandbox.exports.render({record:{...record,...patch},onStock:()=>calls.push('estoque'),onBilling:()=>calls.push('faturamento'),onFiscal:()=>calls.push('fiscal')});
  const tree=render({});
  assert.equal(tree.props.role,'group');
  assert.equal(calls.length,0,'renderizar não lança nem fatura');
  for(const tooltip of tree.props.children){
    assert.equal(tooltip.type,'tooltip');assert.equal(tooltip.props.posicao,'bottom');
    const button=tooltip.props.children;assert.equal(button.type,'button');assert.equal(button.props['aria-disabled'],false);button.props.onClick();
  }
  assert.deepEqual(calls,['estoque','faturamento','fiscal']);
  const completed=render({status:'Faturado',localRecord:{...local,status:'Faturado',order:{...local.order,stockState:'Baixado'}}});
  for(const [index,reason] of [[0,'Estoque já lançado'],[1,'Pedido já faturado']]){
    const tip=completed.props.children[index];assert.ok(tip.props.texto.includes(reason));assert.equal(tip.props.children.props['aria-disabled'],true);assert.equal(tip.props.children.props.onClick,undefined);
  }
  const canceled=render({status:'Cancelado',localRecord:{...local,status:'Cancelado'}});
  canceled.props.children.forEach(tip=>assert.equal(tip.props.children.props.onClick,undefined));
  const noFiscal=render({localRecord:{...local,order:{...local.order,fiscalDocument:'nenhum'}}});
  assert.match(noFiscal.props.children[2].props.texto,/Defina o documento fiscal/);
  const services=render({localRecord:{...local,order:{...local.order,lines:[{kind:'servico'}]}}});
  assert.match(services.props.children[0].props.texto,/Pedido sem produtos/);
  permissions=()=>false;
  render({}).props.children.forEach(tip=>{assert.match(tip.props.texto,/Sem permissão/);assert.equal(tip.props.children.props.onClick,undefined);});
});
