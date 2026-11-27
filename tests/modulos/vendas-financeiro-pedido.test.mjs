import test from 'node:test';
import assert from 'node:assert/strict';
import {orderFinancialStatus as status} from '../../app/vendas/lib/order-financial-status.mjs';
const order={id:'2026/18',total:100,status:'Faturado',persistence:{operationId:'op-1'}};
const part=(patch={})=>({origin:'Pedido 2026/18',value:50,received:0,refunded:0,reversed:0,status:'aberto',persistence:{operationId:'op-1'},...patch});
test('soma todas as parcelas e considera pagamentos parciais, quitação e estornos',()=>{
 assert.equal(status(order,[part(),part()]),'Em aberto');
 assert.equal(status(order,[part({received:50}),part()]),'Parcialmente pago');
 assert.equal(status(order,[part({received:50}),part({received:50})]),'Pago');
 assert.equal(status(order,[part({received:50,refunded:10}),part({received:50})]),'Parcialmente pago');
 assert.equal(status(order,[part({received:50,refunded:50}),part()]),'Em aberto');
});
test('não mistura operações com mesmo nome/número, nem parcelas canceladas/refaturadas',()=>{
 assert.equal(status(order,[part({received:50,persistence:{operationId:'op-2'}})]),'—');
 assert.equal(status(order,[part({status:'cancelado',reversed:50}),part({status:'estornado',reversed:50})]),'—');
 assert.equal(status(order,[part({status:'cancelado',reversed:50,received:50}),part()]),'Em aberto');
 assert.equal(status({...order,persistence:undefined},[part({received:50})]),'—');
 assert.equal(status({...order,persistence:undefined},[part({persistence:undefined})]),'Em aberto');
});
test('cancelados e não faturados não recebem classificação financeira',()=>{
 for(const state of ['Cancelado','Devolvido','Rascunho','Confirmado','Em separação'])assert.equal(status({...order,status:state},[part({received:50})]),'—');
 assert.equal(status(order,[]),'—');
 assert.equal(status({...order,total:0},[]),'—');
 assert.equal(status({...order,total:0,order:{operationNature:'Bonificação'}},[]),'Bonificado');
 assert.equal(status({...order,total:100,order:{operationNature:'Bonificação'}},[part()]),'Em aberto');
});
test('acesso negado e consulta pendente/falha nunca inferem quitação',()=>{
 assert.equal(status(order,[part({received:50})],{allowed:false}),'—');
 assert.equal(status(order,[],{ready:false}),'Consultando…');
 assert.equal(status(order,[],{ready:false,failed:true}),'Não disponível');
});
