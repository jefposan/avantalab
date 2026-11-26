import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {createPostgresCommercialStockRepository,createCommercialStockService} from '../../app/vendas/lib/server/commercial-stock-service.mjs';
import {handleCommercialStockRequest} from '../../app/vendas/lib/server/commercial-stock-http.mjs';
import {createStockMoveRequest} from '../../app/vendas/lib/commercial-stock-bridge.mjs';
const companyId='11111111-1111-4111-8111-111111111111',actorId='22222222-2222-4222-8222-222222222222',productId='33333333-3333-4333-8333-333333333333',localId='44444444-4444-4444-8444-444444444444';
const context={companyId,actorId,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'stock.adjust':true}};
test('mínimo persiste sem movimentação, mantém saldos, suporta repetição e recusa conflito ou outra empresa',async()=>{
 const db=new PGlite();await db.exec(`create table vendas_mobile_catalogo_produtos(id uuid primary key,ativo boolean);create table vendas_estoque_locais(id uuid primary key,empresa_id uuid,ativo boolean);create table vendas_estoque_saldos(id uuid primary key,empresa_id uuid,produto_id uuid,local_id uuid,estoque_minimo numeric,saldo_fisico numeric,saldo_reservado numeric);insert into vendas_mobile_catalogo_produtos values('${productId}',true);insert into vendas_estoque_locais values('${localId}','${companyId}',true);insert into vendas_estoque_saldos values('${productId}','${companyId}','${productId}','${localId}',0,20,3);`);
 try{
 const queries=[];const query=(sql,args)=>{queries.push(sql);return db.query(sql,args);};const pool={query,connect:async()=>({query,release(){}})};
 const service=createCommercialStockService({repository:createPostgresCommercialStockRepository({pool})});
 const input={context,productId,localId,minimum:5.5,expectedMinimum:0};
 assert.equal((await service.setMinimum(input)).ok,true);assert.equal((await service.setMinimum(input)).reused,true);
 const [balance]=(await db.query('select * from vendas_estoque_saldos')).rows;assert.equal(Number(balance.estoque_minimo),5.5);assert.equal(Number(balance.saldo_fisico),20);assert.equal(Number(balance.saldo_reservado),3);
 assert.equal((await service.setMinimum({...input,minimum:7})).errors[0].code,'AV-STOCK-MINIMUM-CONFLICT');
 assert.equal((await service.setMinimum({...input,context:{...context,companyId:actorId}})).ok,false);
 assert.equal(queries.some(sql=>/insert|delete|set saldo_fisico|set saldo_reservado/i.test(sql)),false);
 assert.equal((await service.setMinimum({...input,minimum:0,expectedMinimum:5.5})).ok,true);
 }finally{await db.close();}
});
test('contrato real da ponte e HTTP exige permissão, quantidade válida e contexto autenticado',async()=>{
 let calls=0;const service=createCommercialStockService({repository:{list(){},move(){},setMinimum:async input=>{calls++;assert.equal(input.companyId,companyId);return {balance:{minimum:input.minimum}};}}});
 for(const minimum of [-1,'',NaN,Infinity,'1.2345'])assert.equal((await service.setMinimum({context,productId,localId,minimum,expectedMinimum:0})).ok,false);
 assert.equal((await service.setMinimum({context:{...context,effectivePermissions:{}},productId,localId,minimum:5,expectedMinimum:0})).ok,false);assert.equal(calls,0);
 const body=createStockMoveRequest({requestId:'minimum:synthetic',idempotencyKey:'minimum:synthetic',mode:'minimum',productId,localId,minimum:5,expectedMinimum:0});
 const runtime={configured:true,stockService:service,accessResolver:{resolve:async()=>({authenticated:true,boundary:{companyId,userId:actorId,moduleId:'vendas',userActive:true,membershipActive:true,companyActive:true,moduleActive:true},effectivePermissions:{'stock.adjust':true}})}};
 const response=await handleCommercialStockRequest({request:new Request('http://localhost/stock',{method:'POST',body:JSON.stringify({...body,context:{companyId:actorId}})}),runtime,companyId});
 assert.equal(response.status,200);assert.equal(calls,1);assert.equal((await response.json()).balance.minimum,5);
});
