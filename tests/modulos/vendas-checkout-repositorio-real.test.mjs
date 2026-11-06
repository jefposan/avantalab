import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {createPostgresCommercialFiscalDraftRepository} from '../../app/vendas/lib/server/commercial-fiscal-emission-bridge.mjs';
import {runFiscalCheckout} from '../../app/vendas/lib/server/fiscal-checkout.mjs';
const companyId='10000000-0000-4000-8000-000000000001',actorId='10000000-0000-4000-8000-000000000002',draftId='10000000-0000-4000-8000-000000000003';
test('SQL real entrega código e motivo ao checkout: corrige 588 e distingue retomada 217 sem perder número',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create schema fiscal_private;create table public.vendas_fiscal_rascunhos(id text,empresa_id text,operacao_id text,origem_tipo text,documento_tipo text,situacao text);create table public.vendas_operacoes(id text,empresa_id text,situacao text,situacao_fiscal text);create table fiscal_private.emissions(id text,company_id text,establishment_id text,draft_id text,origin_id text,document_type text,model text,environment text,state text,version int,series text,number int,status_code text,status_reason text);`);
  await db.query(`insert into public.vendas_fiscal_rascunhos values($1,$2,null,'avulsa','nfe','pronto')`,[draftId,companyId]);
  await db.query(`insert into fiscal_private.emissions values($1,$2,$3,$1,$1,'nfe','55','homologacao','rejected',8,'1',1,'588','Formato XML rejeitado')`,[draftId,companyId,actorId]);
  const repository=createPostgresCommercialFiscalDraftRepository({pool:db});
  const loaded=await repository.get({companyId,draftId});assert.equal(loaded.emission.statusCode,'588');assert.equal(loaded.emission.statusReason,'Formato XML rejeitado');assert.equal(await repository.get({companyId:actorId,draftId}),null);
  const calls=[];const runtime={fiscalExecution:{environment:'homologacao',transmissionAllowed:true,productionTransmissionAllowed:false},fiscalDraftRepository:repository,nfeRejectionCorrectionService:{prepare:async args=>{calls.push('repair-588');assert.equal(args.expectedVersion,8);assert.equal(args.rejectedStatusCode,'588');await db.query(`update fiscal_private.emissions set state='number_reserved',version=9,status_code=null,status_reason=null where id=$1`,[draftId]);return{ok:true};}},nfeAutomaticIssuanceService:{continue:async args=>{calls.push('issue');const current=(await repository.get({companyId,draftId})).emission;assert.equal(args.expectedVersion,current.version);assert.equal(current.number,1);assert.equal(current.series,'1');if(current.statusCode==='217')assert.match(args.idempotencyKey,/^checkout-issue:/);await db.query(`update fiscal_private.emissions set state='authorized',version=version+1,status_code='100',status_reason='Autorizado' where id=$1`,[draftId]);return{ok:true,result:{...current,emissionId:draftId,state:'authorized',version:current.version+1,signed:true,persisted:true,submitted:true,transmitted:true}};}}};
  const context={companyId,actorId,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'fiscal.prepare':true,'fiscal.issue':true}},input={action:'issue',draftId,idempotencyKey:'repository-real-checkout-001'};
  assert.equal((await runFiscalCheckout({runtime,context,input})).ok,true);assert.deepEqual(calls,['repair-588','issue']);
  await db.query(`update fiscal_private.emissions set state='submitted',version=12,status_code=null,status_reason=null where id=$1`,[draftId]);runtime.reconcileFiscalEmission=async()=>{calls.push('reconcile-217');await db.query(`update fiscal_private.emissions set state='signed',version=13,status_code='217',status_reason='Não consta' where id=$1`,[draftId]);};
  assert.equal((await runFiscalCheckout({runtime,context,input:{...input,idempotencyKey:'repository-real-checkout-002'}})).ok,true);assert.deepEqual(calls,['repair-588','issue','reconcile-217','issue']);
 }finally{await db.close();}
});
