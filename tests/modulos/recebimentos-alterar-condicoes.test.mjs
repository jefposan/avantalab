import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {PGlite} from '@electric-sql/pglite';
import {receivableBalance,receivableStatus,applyReceivablePayment,calculateCommercialReport} from '../../app/vendas/lib/domain.mjs';
import {paymentSchedule} from '../../app/vendas/lib/server/commercial-receivable-terms.mjs';
import {createPostgresCommercialReceivableRepository,createCommercialReceivableService} from '../../app/vendas/lib/server/commercial-receivable-service.mjs';
import {handleCommercialReceivableRequest} from '../../app/vendas/lib/server/commercial-receivable-http.mjs';
const company='10000000-0000-4000-8000-000000000001',actor='20000000-0000-4000-8000-000000000001',op='30000000-0000-4000-8000-000000000001',rid='40000000-0000-4000-8000-000000000001';
test('parcelamento fecha centavos e preserva dia nos meses curtos',()=>{const p=paymentSchedule(10001,3,'2027-01-31');assert.deepEqual(p.map(r=>r.amount),[33.33,33.33,33.35]);assert.deepEqual(p.map(r=>r.dueDate),['2027-01-31','2027-02-28','2027-03-31']);assert.throws(()=>paymentSchedule(3,4,'2027-01-31'));assert.throws(()=>paymentSchedule(100,2,'2027-02-30'));});
test('SQL real: altera condições, preserva total/histórico, idempotência, concorrência, empresa e rollback',async()=>{
 const db=new PGlite();try{
 await db.exec(`create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${actor}');create table empresas(id uuid primary key);insert into empresas values('${company}');create table vendas_clientes(empresa_id uuid,id uuid,unique(empresa_id,id));create table vendas_operacoes(id uuid primary key,empresa_id uuid,cliente_id uuid,tipo text,situacao text,pagamento_retrato jsonb,atualizado_por uuid,unique(empresa_id,id));insert into vendas_operacoes values('${op}','${company}',null,'pedido','faturado','{"method":"pix","installments":1}',null);`);
 await db.exec("alter table vendas_operacoes add column versao integer not null default 1,add column entrega_retrato jsonb not null default '{}'::jsonb,add column cliente_retrato jsonb not null default '{}'::jsonb,add column criado_em timestamptz not null default now(),add column atualizado_em timestamptz not null default now(),add column ano integer default 2026,add column numero integer default 18");
 const sql=readFileSync('supabase/migrations/20260905152000_vendas_comercial.sql','utf8');
 await db.exec(sql.slice(sql.indexOf('create table public.vendas_contas_receber ('),sql.indexOf('create table public.vendas_fiscal_configuracoes (')));
 await db.exec(sql.slice(sql.indexOf('create table public.vendas_eventos ('),sql.indexOf('create index vendas_clientes_busca_idx')));
 await db.exec(`create function touch() returns trigger language plpgsql as $$begin new.versao=old.versao+1;new.atualizado_em=now();return new;end$$;create trigger touch_operation before update on vendas_operacoes for each row execute function touch();create trigger touch before update on vendas_contas_receber for each row execute function touch();insert into vendas_contas_receber(id,empresa_id,operacao_id,parcela,total_parcelas,vencimento,valor_original,saldo_aberto,meio_pagamento,chave_idempotencia) values('${rid}','${company}','${op}',1,1,'2027-01-31',100.01,100.01,'pix','original');`);
 await db.exec('alter table vendas_contas_receber_eventos add column data_movimentacao date');
 const pool={query:(...a)=>db.query(...a),connect:async()=>({query:(...a)=>db.query(...a),release(){}})},repo=createPostgresCommercialReceivableRepository({pool});
 const rows=async()=>(await db.query('select * from vendas_contas_receber order by parcela')).rows;
 const input=async(key,extra={})=>({companyId:company,actorId:actor,receivableId:rid,idempotencyKey:key,method:'boleto',installments:3,firstDueDate:'2027-01-31',expectedVersions:(await rows()).map(r=>({id:r.id,version:r.versao})),allowedTypes:['pedido'],...extra});
 const first=await input('terms:first');const confirmed=await repo.changeTerms(first);assert.equal(confirmed.receivables.length,3);assert.equal(confirmed.operation.id,op);assert.equal(confirmed.operation.version,2);assert.equal(confirmed.operation.payment.method,'boleto');assert.ok(confirmed.receivables.every(r=>r.method==='boleto'&&r.operationId===op&&r.events.some(e=>e.type==='alteracao_condicoes')));assert.equal(confirmed.receivable.id,rid);let r=await rows();assert.equal(r.length,3);assert.equal(r.reduce((s,x)=>s+Math.round(Number(x.valor_original)*100),0),10001);assert.deepEqual(r.map(x=>Number(x.valor_original)),[33.33,33.33,33.35]);
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
 assert.equal((await rows()).filter(r=>r.meio_pagamento==='consignado'&&r.situacao==='aberto').length,2);
 assert.equal((await rows())[2].situacao,'cancelado');
 const payment=(await db.query('select pagamento_retrato from vendas_operacoes')).rows[0].pagamento_retrato;
 assert.deepEqual(payment,{method:'consignado',installments:0,firstDueDate:''});assert.equal((await repo.changeTerms(consigned)).reused,true);
 // Simula exatamente o efeito da versão anterior, com o mesmo timestamp da auditoria.
 await db.exec('begin');
 await db.exec("update vendas_contas_receber set situacao='cancelado' where meio_pagamento='consignado'");
 await db.exec("update vendas_eventos set criado_em=now() where chave_idempotencia='terms:consigned'");
 await db.exec('commit');
 const recovery=readFileSync('supabase/migrations/20261127010000_vendas_consignado_saldo_recebivel.sql','utf8');
 await db.exec(recovery);
 assert.equal((await rows()).filter(r=>r.situacao==='aberto').length,2);
 assert.equal((await rows())[2].situacao,'cancelado');
 const recoveredVersions=(await rows()).map(r=>r.versao);
 await db.exec(recovery);
 assert.deepEqual((await rows()).map(r=>r.versao),recoveredVersions);
 // Um cancelamento real posterior não pode ser reaberto pela reaplicação.
 await db.exec("update vendas_contas_receber set situacao='cancelado' where parcela=2");
 await db.exec(recovery);
 assert.equal((await rows())[1].situacao,'cancelado');
 const move=async(key,type,amount)=>repo.move({companyId:company,actorId:actor,receivableId:rid,expectedVersion:(await rows())[0].versao,idempotencyKey:key,type,amount,date:'2026-11-26',method:'PIX',account:'Caixa',description:'Teste sintético'});
 const partial=await move('consigned:partial','recebimento',10);
 assert.equal(partial.receivable.balance,40);
 assert.equal((await move('consigned:partial','recebimento',10)).reused,true);
 await assert.rejects(move('consigned:excess','recebimento',41),e=>e.code==='AV-RECEIVABLE-AMOUNT');
 assert.equal((await move('consigned:full','recebimento',40)).receivable.balance,0);
 assert.equal((await move('consigned:refund','estorno_recebimento',5)).receivable.balance,5);
 assert.equal((await rows())[2].situacao,'cancelado');

 }finally{await db.close();}
});
test('servidor recusa alteração sem permissão e corpo inválido antes de escrever',async()=>{
 let writes=0;const service=createCommercialReceivableService({repository:{list:async()=>[],move:async()=>{},changeTerms:async()=>{writes++;return {receivable:{id:rid}};}}});
 const context={companyId:company,actorId:actor,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'receivables.receive':true}};
 const input={context,receivableId:rid,idempotencyKey:'terms:test',method:'boleto',installments:2,firstDueDate:'2027-01-01',expectedVersions:[{id:rid,version:1}]};assert.equal((await service.changeTerms(input)).ok,false);context.effectivePermissions['sales.edit']=true;assert.equal((await service.changeTerms({...input,installments:0})).ok,false);assert.equal(writes,0);assert.equal((await service.changeTerms(input)).ok,true);assert.equal(writes,1);assert.equal((await service.changeTerms({...input,method:'consignado',installments:0,firstDueDate:''})).ok,true);assert.equal(writes,2);
});

test('saldo pendente consignado não vence nem é apresentado como recebido',()=>{const r={method:'Consignado',value:109,received:0,refunded:0,reversed:0,dueDate:'2020-01-01'};assert.equal(receivableBalance(r),109);assert.equal(receivableStatus(r,'2026-11-26'),'Consignado');});


test('saldos consignados aceitam parcial e total sem vencer ou atrasar nos resumos',()=>{
 const base={method:'Consignado',value:109,received:0,refunded:0,reversed:0,dueDate:'2020-01-01'};
 assert.equal(applyReceivablePayment(base,40).valid,true);
 assert.equal(receivableBalance({...base,received:40}),69);
 assert.equal(receivableStatus({...base,received:40},'2026-11-26'),'Consignado');
 assert.equal(receivableStatus({...base,received:109},'2026-11-26'),'Recebido');
 assert.equal(applyReceivablePayment({...base,received:109},1).valid,false);
 assert.equal(applyReceivablePayment(base,110).valid,false);
 const report=calculateCommercialReport({receivables:[base],todayIso:'2026-11-26'});
 assert.equal(report.openReceivables,109);
 assert.equal(report.overdueReceivables,0);
});

test('resposta com dados financeiros confirmados respeita permissão de visualização',async()=>{
 const confirmed={receivable:{id:rid,clientName:'Cliente sintético'},receivables:[{id:rid}],operation:{id:op,version:3,payment:{method:'pix'}}};
 const service=createCommercialReceivableService({repository:{list:async()=>[],move:async()=>{},changeTerms:async()=>confirmed}});
 const context={companyId:company,actorId:actor,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'receivables.receive':true,'sales.edit':true}};
 const input={context,receivableId:rid,idempotencyKey:'terms:privacy',method:'pix',installments:1,firstDueDate:'2026-11-27',expectedVersions:[{id:rid,version:2}]};
 const restricted=await service.changeTerms(input);assert.equal(restricted.ok,true);assert.equal(restricted.receivables,undefined);assert.equal(restricted.operation,undefined);assert.deepEqual(restricted.receivable,{id:rid});
 context.effectivePermissions['receivables.view']=true;const visible=await service.changeTerms(input);assert.equal(visible.receivables.length,1);assert.equal(visible.operation.version,3);
});
