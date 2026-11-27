import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {PGlite} from '@electric-sql/pglite';
import {receivableBalance,receivableStatus} from '../../app/vendas/lib/domain.mjs';
import {paymentSchedule} from '../../app/vendas/lib/server/commercial-receivable-terms.mjs';
import {createPostgresCommercialReceivableRepository,createCommercialReceivableService} from '../../app/vendas/lib/server/commercial-receivable-service.mjs';
import {handleCommercialReceivableRequest} from '../../app/vendas/lib/server/commercial-receivable-http.mjs';
const company='10000000-0000-4000-8000-000000000001',actor='20000000-0000-4000-8000-000000000001',op='30000000-0000-4000-8000-000000000001',rid='40000000-0000-4000-8000-000000000001';
test('parcelamento fecha centavos e preserva dia nos meses curtos',()=>{const p=paymentSchedule(10001,3,'2027-01-31');assert.deepEqual(p.map(r=>r.amount),[33.33,33.33,33.35]);assert.deepEqual(p.map(r=>r.dueDate),['2027-01-31','2027-02-28','2027-03-31']);assert.throws(()=>paymentSchedule(3,4,'2027-01-31'));assert.throws(()=>paymentSchedule(100,2,'2027-02-30'));});
test('SQL real: altera condições, preserva total/histórico, idempotência, concorrência, empresa e rollback',async()=>{
 const db=new PGlite();try{
 await db.exec(`create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${actor}');create table empresas(id uuid primary key);insert into empresas values('${company}');create table vendas_clientes(empresa_id uuid,id uuid,unique(empresa_id,id));create table vendas_operacoes(id uuid primary key,empresa_id uuid,cliente_id uuid,tipo text,situacao text,pagamento_retrato jsonb,atualizado_por uuid,unique(empresa_id,id));insert into vendas_operacoes values('${op}','${company}',null,'pedido','faturado','{"method":"pix","installments":1}',null);`);
 const sql=readFileSync('supabase/migrations/20260905152000_vendas_comercial.sql','utf8');
 await db.exec(sql.slice(sql.indexOf('create table public.vendas_contas_receber ('),sql.indexOf('create table public.vendas_fiscal_configuracoes (')));
 await db.exec(sql.slice(sql.indexOf('create table public.vendas_eventos ('),sql.indexOf('create index vendas_clientes_busca_idx')));
 await db.exec(`create function touch() returns trigger language plpgsql as $$begin new.versao=old.versao+1;new.atualizado_em=now();return new;end$$;create trigger touch before update on vendas_contas_receber for each row execute function touch();insert into vendas_contas_receber(id,empresa_id,operacao_id,parcela,total_parcelas,vencimento,valor_original,saldo_aberto,meio_pagamento,chave_idempotencia) values('${rid}','${company}','${op}',1,1,'2027-01-31',100.01,100.01,'pix','original');`);
 const pool={query:(...a)=>db.query(...a),connect:async()=>({query:(...a)=>db.query(...a),release(){}})},repo=createPostgresCommercialReceivableRepository({pool});
 const rows=async()=>(await db.query('select * from vendas_contas_receber order by parcela')).rows;
 const input=async(key,extra={})=>({companyId:company,actorId:actor,receivableId:rid,idempotencyKey:key,method:'boleto',installments:3,firstDueDate:'2027-01-31',expectedVersions:(await rows()).map(r=>({id:r.id,version:r.versao})),allowedTypes:['pedido'],...extra});
 const first=await input('terms:first');await repo.changeTerms(first);let r=await rows();assert.equal(r.length,3);assert.equal(r.reduce((s,x)=>s+Math.round(Number(x.valor_original)*100),0),10001);assert.deepEqual(r.map(x=>Number(x.valor_original)),[33.33,33.33,33.35]);
 assert.equal((await repo.changeTerms(first)).reused,true);assert.equal((await db.query('select count(*)::int n from vendas_eventos')).rows[0].n,1);
 await assert.rejects(repo.changeTerms({...first,method:'pix'}),e=>e.code==='AV-RECEIVABLE-IDEMPOTENCY');
 await assert.rejects(repo.changeTerms({...first,idempotencyKey:'terms:stale'}),e=>e.code==='AV-RECEIVABLE-CONFLICT');
 await assert.rejects(repo.changeTerms({...await input('terms:foreign'),companyId:'10000000-0000-4000-8000-000000000002'}),e=>e.code==='AV-RECEIVABLE-NOT-FOUND');
 await db.exec("update vendas_contas_receber set valor_original=case parcela when 1 then 40 when 2 then 10 else 50.01 end,saldo_aberto=case parcela when 1 then 40 when 2 then 10 else 50.01 end");
 const uneven=await rows();await repo.changeTerms(await input('terms:only-method',{method:'pix'}));assert.deepEqual((await rows()).map(r=>[r.valor_original,r.vencimento]),uneven.map(r=>[r.valor_original,r.vencimento]));
 await repo.changeTerms(await input('terms:reduce',{installments:2}));r=await rows();assert.equal(r[2].situacao,'cancelado');assert.equal(r.filter(x=>x.situacao!=='cancelado').reduce((s,x)=>s+Math.round(Number(x.saldo_aberto)*100),0),10001);
 await db.exec(`update vendas_contas_receber set valor_recebido=10,saldo_aberto=valor_original-10,situacao='parcial' where id='${rid}'`);
 const before=await rows();await assert.rejects(repo.changeTerms(await input('terms:paid',{installments:3})),e=>e.code==='AV-RECEIVABLE-PAID');
 await repo.changeTerms(await input('terms:method',{installments:2,method:'cartao'}));r=await rows();assert.deepEqual(r.map(x=>[x.valor_original,x.valor_recebido,x.valor_estornado,x.saldo_aberto,x.vencimento]),before.map(x=>[x.valor_original,x.valor_recebido,x.valor_estornado,x.saldo_aberto,x.vencimento]));
 await db.exec("alter table vendas_eventos add constraint fail_audit check(metadados->>'method'<>'dinheiro')");const saved=await rows();await assert.rejects(repo.changeTerms(await input('terms:rollback',{installments:2,method:'dinheiro'})));assert.deepEqual(await rows(),saved);
 await assert.rejects(repo.changeTerms(await input('terms:consigned-paid',{method:'consignado',installments:0,firstDueDate:''})),e=>e.code==='AV-RECEIVABLE-PAID');
 await db.exec('update vendas_contas_receber set valor_recebido=0,valor_estornado=0,saldo_aberto=valor_original');
 const consigned=await input('terms:consigned',{method:'consignado',installments:0,firstDueDate:''});await repo.changeTerms(consigned);
 assert.ok((await rows()).every(r=>r.situacao==='cancelado'));
 const payment=(await db.query('select pagamento_retrato from vendas_operacoes')).rows[0].pagamento_retrato;
 assert.deepEqual(payment,{method:'consignado',installments:0,firstDueDate:''});assert.equal((await repo.changeTerms(consigned)).reused,true);
 }finally{await db.close();}
});
test('servidor recusa alteração sem permissão e corpo inválido antes de escrever',async()=>{
 let writes=0;const service=createCommercialReceivableService({repository:{list:async()=>[],move:async()=>{},changeTerms:async()=>{writes++;return {receivable:{id:rid}};}}});
 const context={companyId:company,actorId:actor,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'receivables.receive':true}};
 const input={context,receivableId:rid,idempotencyKey:'terms:test',method:'boleto',installments:2,firstDueDate:'2027-01-01',expectedVersions:[{id:rid,version:1}]};assert.equal((await service.changeTerms(input)).ok,false);context.effectivePermissions['sales.edit']=true;assert.equal((await service.changeTerms({...input,installments:0})).ok,false);assert.equal(writes,0);assert.equal((await service.changeTerms(input)).ok,true);assert.equal(writes,1);assert.equal((await service.changeTerms({...input,method:'consignado',installments:0,firstDueDate:''})).ok,true);assert.equal(writes,2);
});

test('consignado nunca gera saldo vencido nem é apresentado como recebido',()=>{const r={method:'Consignado',value:109,received:0,refunded:0,reversed:0,dueDate:'2020-01-01'};assert.equal(receivableBalance(r),0);assert.equal(receivableStatus(r,'2026-11-26'),'Consignado');});
