import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createFiscalDraftDeleteService,handleFiscalDraftDelete} from '../../app/vendas/lib/server/fiscal-draft-delete.mjs';
import {createPostgresFiscalRepository} from '../../app/vendas/lib/server/fiscal-postgres-repository.mjs';
const companyId='ec9604fd-38f2-429b-9c00-c4bc6c642b0e',actorId='20000000-0000-4000-8000-000000000001',draftId='30000000-0000-4000-8000-000000000001',otherId='30000000-0000-4000-8000-000000000002';
const context={companyId,actorId,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'fiscal.cancel':true}};
async function fixture(){
 const db=new PGlite();await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;create role avanta_vendas_runtime;create table auth.users(id uuid primary key);create table empresas(id uuid primary key);create table vendas_fiscal_rascunhos(empresa_id uuid,id uuid,documento_tipo text,operacao_id uuid,primary key(empresa_id,id));`);
 await db.exec(readFileSync('supabase/migrations/20260905153000_vendas_fiscal_privado.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/20260905154000_vendas_fiscal_recuperacao.sql','utf8'));
 await db.exec(`create function public.vendas_rejeitar_alteracao_imutavel() returns trigger language plpgsql as $$begin raise exception 'imutável';end$$;`);
 await db.exec(readFileSync('supabase/migrations/20261106031000_vendas_exclusao_rascunho.sql','utf8'));
 await db.query('insert into empresas values($1)',[companyId]);await db.query('insert into auth.users values($1)',[actorId]);await db.query("insert into vendas_fiscal_rascunhos(empresa_id,id,documento_tipo) values($1,$2,'nfe'),($1,$3,'nfe')",[companyId,draftId,otherId]);
 const pool={query:(...args)=>db.query(...args)};return {db,pool,service:createFiscalDraftDeleteService({pool})};
}
test('rascunho sem emissão sai da operação sem consumir número; confirmação e acesso são obrigatórios',async()=>{
 const f=await fixture();try{
  const input={context,draftId,expectedVersion:0,confirmation:'EXCLUIR_RASCUNHO_NFE'};
  assert.equal((await f.service.remove({...input,context:{...context,effectivePermissions:{}}})).ok,false);
  assert.equal((await f.service.remove({...input,confirmation:''})).ok,false);
  assert.equal((await f.service.remove(input)).ok,true);assert.equal((await f.service.remove(input)).ok,true);
  assert.equal((await f.db.query('select count(*)::int n from fiscal_private.number_reservations')).rows[0].n,0);
  assert.equal((await f.db.query('select count(*)::int n from fiscal_private.draft_deletions')).rows[0].n,1);
 }finally{await f.db.close();}
});
test('rejeição confirmada libera número e próximo rascunho reutiliza; auditoria preservada e duplicidade protegida',async()=>{
 const f=await fixture();try{
  await f.db.query("insert into fiscal_private.emissions(id,company_id,establishment_id,draft_id,origin_id,document_type,model,environment,state) values($1::uuid,$2::uuid,$2::uuid,$1::text,$1::text,'nfe','55','homologacao','draft'),($3::uuid,$2::uuid,$2::uuid,$3::text,$3::text,'nfe','55','homologacao','draft')",[draftId,companyId,otherId]);
  await f.db.query("insert into fiscal_private.number_sequences(company_id,establishment_id,document_type,series,next_number) values($1,$1,'nfe','1',1)",[companyId]);
  const repo=createPostgresFiscalRepository({pool:f.pool});const reserve=id=>repo.runInTransaction(tx=>tx.reserveNextFiscalNumber({companyId,establishmentId:companyId,emissionId:id,documentType:'nfe',idempotencyKey:`reserve:${id}`,at:new Date().toISOString()}));
  const first=await reserve(draftId);assert.equal(first.reservation.number,1);
  await f.db.query("update fiscal_private.emissions set state='rejected',series='1',number=1,reservation_id=$2,status_code='391',submitted_at=now(),batch_id='1',version=2 where id=$1",[draftId,first.reservation.id]);
  assert.equal((await f.service.remove({context,draftId,expectedVersion:1,confirmation:'EXCLUIR_RASCUNHO_NFE'})).ok,false);
  const deleted=await f.service.remove({context,draftId,expectedVersion:2,confirmation:'EXCLUIR_RASCUNHO_NFE'});assert.equal(deleted.ok,true);assert.equal(deleted.numberReleased,true);
  const second=await reserve(otherId);assert.equal(second.reservation.number,1);
  const ledger=(await f.db.query('select status,number from fiscal_private.number_reservations order by reserved_at')).rows;assert.equal(ledger.length,2);assert.equal(ledger[0].status,'released');assert.equal(ledger[1].status,'reserved');
  assert.equal((await f.db.query('select number,previous_state from fiscal_private.draft_deletions')).rows[0].number,1);
  assert.equal((await f.db.query('select next_number from fiscal_private.number_sequences')).rows[0].next_number,2);
 }finally{await f.db.close();}
});
test('envio sem resultado e autorização nunca são apagados; falha HTTP não divulga dados internos',async()=>{
 const f=await fixture();try{
  await f.db.query("insert into fiscal_private.emissions(id,company_id,establishment_id,draft_id,document_type,model,environment,state,series,number,reservation_id,access_key) values($1::uuid,$2::uuid,$2::uuid,$1::text,'nfe','55','homologacao','submitted','1',1,$3,$4)",[draftId,companyId,otherId,'1'.repeat(44)]);
  assert.equal((await f.service.remove({context,draftId,expectedVersion:1,confirmation:'EXCLUIR_RASCUNHO_NFE'})).ok,false);
  assert.equal((await f.db.query('select count(*)::int n from fiscal_private.draft_deletions')).rows[0].n,0);
  const request=new Request('https://example.test',{method:'POST',body:'{}'});const response=await handleFiscalDraftDelete({request,companyId,draftId,runtime:{configured:true,pendingDraftService:f.service,accessResolver:{resolve:async()=>({authenticated:false})}}});assert.equal(response.status,401);
 }finally{await f.db.close();}
});
