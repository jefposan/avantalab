import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
const fonte = readFileSync(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');
const codigo = fonte.slice(fonte.indexOf('function calcularHistoricoComprovante('), fonte.indexOf('function chaveContextoHistoricoComprovante('));
const ctx = vm.createContext({}); vm.runInContext(codigo, ctx);
const copia = (r) => JSON.parse(JSON.stringify(r));
const pedido = (id, total, hora, extras = {}) => ({id,conta_id:'conta',cliente_id:'cliente',status:'concluida',forma_pagamento:'Venda',total,criado_em:'2026-11-19T15:00:00Z',registrado_em:hora,...extras});
const pagamento = (id, valor, hora, extras = {}) => ({id,conta_id:'conta',cliente_id:'cliente',valor,desconto:0,criado_em:hora,data_pagamento:'2026-11-19',...extras});
const calc = (registro, vendas, pagamentos = [], extras = {}) => copia(ctx.calcularHistoricoComprovante({tipo:registro.valor == null?'pedido':'pagamento',registro,vendas,pagamentos,contaId:'conta',...extras}));
const ok = (res, anterior, atual, creditoAnterior=0, creditoAtual=0) => assert.deepEqual(res,{status:'confirmado',motivo:'',saldoAnterior:anterior,saldoAtual:atual,creditoAnterior,creditoAtual});
const pendente = (res) => { assert.equal(res.status,'conferencia');for(const key of ['saldoAnterior','saldoAtual','creditoAnterior','creditoAtual'])assert.equal(res[key],null); };

test('caso Duda: regra geral ignora saldo gravado contaminado sem corrigir o cadastro',()=>{
  const antiga=pedido('antigo',1389.5,'2026-09-25T19:23Z');
  const quitacao=pagamento('quitacao',1200,'2026-10-09T20:35Z',{desconto:189.5});
  const primeiro=pedido('primeiro',500,'2026-11-19T20:40Z',{observacoes:'{"saldo_anterior":1110,"saldo_final":1610}'});
  const segundo=pedido('segundo',1110,'2026-11-19T20:45Z');
  const vendas=[segundo,antiga,primeiro],pags=[quitacao],original=JSON.stringify([vendas,pags]);
  ok(calc(primeiro,vendas,pags),0,500);ok(calc(segundo,vendas,pags),500,1610);
  ok(calc(quitacao,vendas,pags),1389.5,0);
  assert.equal(JSON.stringify([vendas,pags]),original);
});

test('editar lançamento antigo após mais três mantém posição; recomputa os comprovantes seguintes',()=>{
  const primeiro=pedido('primeiro',100,'2026-11-19T10:00Z');
  const outros=[pedido('2',20,'2026-11-19T11:00Z'),pedido('3',30,'2026-11-19T12:00Z'),pedido('4',40,'2026-11-19T13:00Z')];
  primeiro.total=120;primeiro.criado_em='2026-11-26T15:00Z';primeiro.atualizado_em='2026-11-26T20:00Z';
  const vendas=[...outros,primeiro];ok(calc(primeiro,vendas),0,120);ok(calc(outros[2],vendas),170,210);
  ok(calc(outros[2],[...vendas].reverse()),170,210);
  const novo=pedido('novo',120,'2026-11-26T20:00Z');
  ok(calc(novo,[...outros,novo]),90,210);
});

test('pagamento editado conserva inclusão e não usa saldo atual ou retrato gravado',()=>{
  const a=pedido('venda',100,'2026-11-19T09:00Z'),p=pagamento('p',50,'2026-11-19T10:00Z',{data_pagamento:'2026-11-26',saldo_anterior:999,saldo_final:949,comprovante_financeiro_confirmado:true});
  const b=pedido('depois',400,'2026-11-19T11:00Z');
  ok(calc(p,[a,b],[p]),100,50);p.valor=70;ok(calc(p,[a,b],[p]),100,30);ok(calc(b,[a,b],[p]),30,430);
});

test('crédito antes/depois é mantido e descontos não são abatidos duas vezes',()=>{
  const p=pagamento('credito',100,'2026-11-19T09:00Z');
  const a=pedido('venda',56,'2026-11-19T10:00Z',{desconto:10});
  ok(calc(p,[a],[p]),0,0,0,100);ok(calc(a,[a],[p]),0,0,100,44);
  const b=pedido('outra',70,'2026-11-19T11:00Z');ok(calc(b,[a,b],[p]),0,26,44);
});

test('cancelados, consignados e bonificados não criam dívida',()=>{
  const alvo=pedido('alvo',10,'2026-11-19T11:00Z');
  const rows=[alvo,pedido('cancelado',999,null,{status:'cancelada'}),pedido('consignado',888,null,{forma_pagamento:'Consignado'}),pedido('brinde',0,null)];
  ok(calc(alvo,rows),0,10);
});

test('mesmo cliente em contas distintas não compartilha histórico nem permite abrir alvo de outra conta',()=>{
  const a=pedido('alvo',10,'2026-11-19T11:00Z');
  ok(calc(a,[a,pedido('estranho',999,null,{conta_id:'outra'})],[pagamento('estranho',888,null,{conta_id:'outra'})]),0,10);
  pendente(calc({...a,conta_id:'outra'},[a]));
  pendente(calc(a,[a,pedido('sem-conta',10,'2026-11-19T10:00Z',{conta_id:null})]));
});

test('duas inclusões legadas sem hora não são ordenadas por UUID, valor, lista ou atualização',()=>{
  const a=pedido('z',500,null,{atualizado_em:'2026-11-26T11:44Z'}),b=pedido('a',1110,null,{atualizado_em:'2026-11-19T20:45Z'});
  pendente(calc(a,[a,b]));pendente(calc(a,[b,a]));pendente(calc(b,[a,b]));
});

test('um limite legado apenas prova anterioridade, sem virar hora de criação',()=>{
  const legado=pedido('legado',50,null,{atualizado_em:'2026-11-19T10:00Z'}),novo=pedido('novo',10,'2026-11-20T10:00Z');
  ok(calc(novo,[legado,novo]),50,60);ok(calc(legado,[legado,novo]),0,50);
  legado.atualizado_em='2026-11-21T10:00Z';pendente(calc(novo,[legado,novo]));
});

test('datas comerciais retroativas não movem o lançamento novo para antes do original',()=>{
  const a=pedido('primeiro',10,'2026-11-20T10:00Z',{criado_em:'2026-11-20T15:00Z'}),b=pedido('novo',20,'2026-11-21T10:00Z',{criado_em:'2026-01-01T15:00Z'});
  ok(calc(b,[b,a]),10,30);ok(calc(a,[b,a]),0,10);
});

test('data comercial antiga gerada em outro fuso não vira horário real de inclusão',()=>{
  const a=pedido('a',10,null,{criado_em:'2026-11-19T16:00Z',observacoes:'{"avantalab_pedido":true}'});
  const b=pedido('b',20,'2026-11-19T17:00Z');pendente(calc(b,[a,b]));
  a.observacoes='{"avantalab_pedido":true,"origem_migracao":"importacao_original"}';ok(calc(b,[a,b]),10,30);
});

test('precisão de microssegundos do banco é preservada; empate real exige conferência',()=>{
  const a=pedido('a',10,'2026-11-19T10:00:00.000001Z'),b=pedido('b',20,'2026-11-19T10:00:00.000002Z');
  ok(calc(b,[a,b]),10,30);b.registrado_em=a.registrado_em;pendente(calc(b,[a,b]));
});

test('centavos, duplicatas idênticas, conflito e sincronização pendente',()=>{
  const a=pedido('a',0.1,'2026-11-19T09:00Z'),b=pedido('b',0.2,'2026-11-19T10:00Z');
  ok(calc(b,[a,a,b]),0.1,0.3);pendente(calc(b,[a,{...a,total:999},b]));
  pendente(calc(b,[a,b],[],{dadosCompletos:false}));pendente(calc(b,[{...a,__avantaPendenteOffline:true},b]));
  for(const valor of [NaN,Infinity,-1,Number.MAX_VALUE])pendente(calc(b,[{...a,total:valor},b]));
});

test('tela e compartilhamento usam os mesmos resumos e a pendência não vira R$ 0,00',()=>{
  assert.match(fonte,/function resumoComprovantePedido\(venda\)[\s\S]*?resumoHistoricoDoComprovante\('pedido'/);
  assert.match(fonte,/function resumoComprovantePagamento\(pagamento\)[\s\S]*?resumoHistoricoDoComprovante\('pagamento'/);
  assert.match(fonte,/Saldo histórico em conferência/);
  assert.match(fonte,/if \(resumo.status !== 'confirmado'\) return 'Em conferência'/);
  assert.match(fonte,/saldoHistoricoPendente: resumo.status !== 'confirmado'/);
});
