import { sqlDeTesteURL } from '../helpers/sql-historico.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createPostgresFiscalRepository} from '../../app/vendas/lib/server/fiscal-postgres-repository.mjs';
import {createFiscalEmissionLifecycleService} from '../../app/vendas/lib/server/fiscal-emission-lifecycle.mjs';
import {createCommercialNfeSubmissionService} from '../../app/vendas/lib/server/commercial-nfe-submission.mjs';
import {fiscalCheckoutCorrection,fiscalCorrectionAction} from '../../app/vendas/lib/fiscal-correction.mjs';

const company='10000000-0000-4000-8000-000000000001',other='20000000-0000-4000-8000-000000000001';
const actor='30000000-0000-4000-8000-000000000001',emission='40000000-0000-4000-8000-000000000001',otherEmission='50000000-0000-4000-8000-000000000001';
const accessKey='1'.repeat(44),checksum='a'.repeat(64),now='2026-11-05T22:00:00.000Z';
const migration='supabase/historico-sem-registro/runtime/20261105233000_vendas_fila_recuperacao_runtime.sql';

async function fixture(){
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;create role avanta_vendas_runtime noinherit nobypassrls;
 create schema auth;create table auth.users(id uuid primary key);create table public.empresas(id uuid primary key);`);
 for(const f of ['20260905153000_vendas_fiscal_privado.sql','20260905154000_vendas_fiscal_recuperacao.sql','20260905162000_vendas_artefatos_revisoes.sql'])await db.exec(await readFile(sqlDeTesteURL(f),'utf8'));
 await db.query('insert into public.empresas values($1),($2)',[company,other]);await db.query('insert into auth.users values($1)',[actor]);
 for(const [id,tenant]of [[emission,company],[otherEmission,other]])await db.query(`insert into fiscal_private.emissions(id,company_id,establishment_id,draft_id,document_type,model,environment,state,version,series,number,reservation_id,access_key,signed_checksum)
 values($1,$2,$2,$5,'nfe','55','homologacao','signed',4,'1',1,$1,$3,$4)`,[id,tenant,accessKey,checksum,id]);
 await db.query(`insert into fiscal_private.artifacts(company_id,emission_id,artifact_type,storage_reference,checksum_sha256,byte_length,content_type) values($1,$2,'signed_xml','local://synthetic-signed',$3,10,'application/xml')`,[company,emission,checksum]);
 await db.query(`insert into fiscal_private.recovery_jobs(company_id,emission_id,job_type,idempotency_key)values($1,$2,'authorization_status','foreign-job')`,[other,otherEmission]);
 await db.exec(`grant usage on schema fiscal_private,public to avanta_vendas_runtime;
 grant select,update on fiscal_private.emissions to avanta_vendas_runtime;grant select on fiscal_private.artifacts to avanta_vendas_runtime;
 grant select,insert on fiscal_private.events,fiscal_private.operations,fiscal_private.transmission_attempts,fiscal_private.recovery_jobs to avanta_vendas_runtime;
 grant usage,select on all sequences in schema fiscal_private to avanta_vendas_runtime;`);
 for(const table of ['emissions','artifacts','events','operations','transmission_attempts','recovery_jobs'])await db.exec(`create policy fixture_scope on fiscal_private.${table} for all to avanta_vendas_runtime using(company_id='${company}'::uuid)with check(company_id='${company}'::uuid)`);
 await db.exec('set role avanta_vendas_runtime');
 const client={query:async(sql,args)=>{if(sql.includes('pg_advisory_xact_lock'))return{rows:[]};const r=await db.query(sql,args);return{...r,rowCount:r.affectedRows??r.rows.length};},release(){}};
 const repo=createPostgresFiscalRepository({pool:{connect:async()=>client}});const lifecycle=createFiscalEmissionLifecycleService({repository:repo,clock:()=>now});
 return{db,repo,lifecycle,async apply(){await db.exec('reset role');await db.exec(await readFile(migration,'utf8'));await db.exec('set role avanta_vendas_runtime');}};
}

test('abertura transacional não exige UPDATE da identidade da fila; repetição não duplica nem redefine tarefa',async()=>{
 const f=await fixture();try{
 const input={companyId:company,emissionId:emission,expectedVersion:4,operationKey:'synthetic-begin-submission',actorId:actor,accessKey,signedChecksum:checksum,batchId:'1234567'};
 const first=await f.lifecycle.beginSubmission(input);assert.equal(first.ok,true);assert.equal(first.emission.state,'submitted');
 const again=await f.lifecycle.beginSubmission(input);assert.equal(again.ok,true);assert.equal(again.reused,true);
 assert.equal((await f.db.query('select count(*)::int n from fiscal_private.transmission_attempts')).rows[0].n,1);
 const job=(await f.db.query('select * from fiscal_private.recovery_jobs')).rows[0];assert.equal(job.emission_id,emission);
 const reused=await f.repo.runInTransaction(tx=>tx.enqueueRecoveryJob({companyId:company,emissionId:emission,jobType:'authorization_status',idempotencyKey:job.idempotency_key,maxAttempts:8,availableAt:now,createdAt:now}));assert.equal(reused.id,job.id);
 await assert.rejects(f.db.query(`update fiscal_private.recovery_jobs set idempotency_key='changed'`),e=>e.code==='42501');
 }finally{await f.db.close();}
});

test('migração libera só campos operacionais e preserva RLS, identidade e documentos de outro perfil',async()=>{
 const f=await fixture();try{
 await f.db.query(`insert into fiscal_private.recovery_jobs(company_id,emission_id,job_type,idempotency_key,available_at)values($1,$2,'authorization_status','own-job-key',$3)`,[company,emission,now]);
 await assert.rejects(f.repo.runInTransaction(tx=>tx.claimRecoveryJobs({workerId:'worker',limit:4,leaseSeconds:30,now})),e=>e.code==='42501');
 await f.apply();await f.apply();
 const claimed=await f.repo.runInTransaction(tx=>tx.claimRecoveryJobs({workerId:'worker',limit:4,leaseSeconds:30,now}));assert.equal(claimed.length,1);assert.equal(claimed[0].emissionId,emission);
 const completed=await f.repo.runInTransaction(tx=>tx.completeRecoveryJob({jobId:claimed[0].id,workerId:'worker',now}));assert.equal(completed.state,'completed');
 for(const column of ['company_id','emission_id','job_type','idempotency_key','max_attempts']){const granted=(await f.db.query('select has_column_privilege(current_user,$1,$2,$3) as allowed',['fiscal_private.recovery_jobs',column,'UPDATE'])).rows[0].allowed;assert.equal(granted,false,column);}
 assert.equal((await f.db.query('select count(*)::int n from fiscal_private.recovery_jobs')).rows[0].n,1);
 await f.db.exec('reset role');const foreign=(await f.db.query('select state from fiscal_private.recovery_jobs where company_id=$1',[other])).rows[0];assert.equal(foreign.state,'pending');
 }finally{await f.db.close();}
});

test('exceção mantém diagnóstico seguro sem criar etapa manual de consulta ou expor segredo',async()=>{
 let report;
 const service=createCommercialNfeSubmissionService({repository:{load:async()=>{throw Object.assign(Error('password=secret signedXml=private'),{code:'42501'});}},certificateBindingResolver:async()=>null,artifactStorage:{readByReference(){},putImmutable(){}},authorizationAdapter:{authorizeProtected(){}},lifecycle:{beginSubmission(){},commitAuthorization(){},transition(){}},internalErrorReporter:event=>{report=event;}});
 const result=await service.submit({context:{companyId:company,actorId:actor,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'fiscal.issue':true}},emissionId:emission,expectedVersion:4,idempotencyKey:'synthetic-submission-error'});
 assert.equal(result.ok,false);assert.equal(result.errors[0].code,'AV-NFE-SUBMISSION-DOCUMENT-READ');assert.match(result.errors[0].message,/leitura do documento fiscal/);assert.match(result.errors[0].message,/42501/);assert.doesNotMatch(JSON.stringify(result),/password|secret|signedXml|private/);assert.equal(report.diagnostic.transmissionAttempted,false);
 assert.equal(fiscalCheckoutCorrection({code:result.errors[0].code}),'');assert.equal(fiscalCorrectionAction('submission-status').target,'note');
});

test('consulta dirigida não captura tarefas de outra nota do mesmo perfil',async()=>{
 const f=await fixture();try{
 await f.apply();await f.db.exec('reset role');
 const second='60000000-0000-4000-8000-000000000001';
 await f.db.query(`insert into fiscal_private.emissions(id,company_id,establishment_id,draft_id,document_type,model,environment,state,version)values($1,$2,$2,$3,'nfe','55','homologacao','draft',1)`,[second,company,second]);
 for(const id of [emission,second])await f.db.query(`insert into fiscal_private.recovery_jobs(company_id,emission_id,job_type,idempotency_key,available_at)values($1,$2,'authorization_status',$3,$4)`,[company,id,'scoped:'+id,now]);
 await f.db.exec('set role avanta_vendas_runtime');
 const claimed=await f.repo.runInTransaction(tx=>tx.claimRecoveryJobs({workerId:'scoped-worker',limit:4,leaseSeconds:30,now,companyId:company,emissionId:emission}));
 assert.equal(claimed.length,1);assert.equal(claimed[0].emissionId,emission);
 assert.equal((await f.db.query('select state from fiscal_private.recovery_jobs where emission_id=$1',[second])).rows[0].state,'pending');
 }finally{await f.db.close();}
});
