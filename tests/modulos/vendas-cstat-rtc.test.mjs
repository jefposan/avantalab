import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {parseNfeAuthorizationSoapResponse} from '../../app/vendas/lib/server/nfe-authorization-service.mjs';
import {createSyntheticNfeOrchestratorLab} from '../../app/vendas/scripts/verificar-orquestrador-nfe-local.mjs';
import {createFiscalEmissionLifecycleService} from '../../app/vendas/lib/server/fiscal-emission-lifecycle.mjs';
import {createFiscalCorrectionRequest} from '../../app/vendas/lib/fiscal-status-bridge.mjs';
const soap=body=>`<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body>${body}</s:Body></s:Envelope>`;
const rejected=(key,code='1040')=>soap(`<retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cUF>35</cUF><cStat>104</cStat><xMotivo>Lote processado</xMotivo><protNFe versao="4.00"><infProt><tpAmb>2</tpAmb><chNFe>${key}</chNFe><cStat>${code}</cStat><xMotivo>Rejeição sintética RTC para correção</xMotivo></infProt></protNFe></retEnviNFe>`);
const absent=key=>soap(`<retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cUF>35</cUF><cStat>217</cStat><xMotivo>NF-e não consta na base</xMotivo><chNFe>${key}</chNFe></retConsSitNFe>`);
test('TStat oficial e toda a emissão aceitam rejeição com quatro dígitos sem prender em submitted',async()=>{
 assert.match(readFileSync('schemas/nfe/PL_010e_v1.02/tiposBasico_v4.00.xsd','utf8'),/\[0-9\]\{3,4\}/);
 const parsed=parseNfeAuthorizationSoapResponse(rejected('35'+'1'.repeat(42)));assert.equal(parsed.valid,true);assert.equal(parsed.protocolStatus,'1040');assert.equal(parsed.authorized,false);
 for(const invalid of ['40','10400','10x0'])assert.equal(parseNfeAuthorizationSoapResponse(rejected('35'+'1'.repeat(42),invalid)).valid,false);
 const lab=await createSyntheticNfeOrchestratorLab({authorizationResponder:async({accessKey})=>rejected(accessKey)});
 try{const result=await lab.continueEmission();assert.equal(result.ok,true,JSON.stringify(result.errors));assert.equal(result.result.rejected,true);assert.equal(result.result.statusCode,'1040');assert.equal(lab.snapshot().state,'rejected');assert.equal(lab.metrics.externalNetworkCalls,0);}finally{await lab.cleanup();}
 const note={customerName:'Sintético',items:[]};assert.ok(createFiscalCorrectionRequest({requestId:'rtc:correction:1234',emissionId:'10000000-0000-4000-8000-000000000001',expectedVersion:8,rejectedStatusCode:'1040',note}));
});
test('migração amplia só os três checks e continua recusando códigos inválidos',async()=>{
 const db=new PGlite();try{
 await db.exec(`create schema fiscal_private;create table fiscal_private.emissions(status_code text check(status_code is null or status_code ~ '^[0-9]{3}$'));create table fiscal_private.transmission_attempts(status_code text check(status_code is null or status_code ~ '^[0-9]{3}$'));create table fiscal_private.emission_corrections(source_status_code text not null check(source_status_code ~ '^[0-9]{3}$'));insert into fiscal_private.emissions values('100');`);
 await assert.rejects(db.exec("insert into fiscal_private.emissions values('1040')"));
 await db.exec(readFileSync('supabase/migrations/20261106180000_vendas_cstat_rtc.sql','utf8'));
 for(const [table,column] of [['emissions','status_code'],['transmission_attempts','status_code'],['emission_corrections','source_status_code']]){
 for(const code of ['391','1040'])await db.query(`insert into fiscal_private.${table}(${column}) values($1)`,[code]);
 for(const code of ['1','10400','a040'])await assert.rejects(db.query(`insert into fiscal_private.${table}(${column}) values($1)`,[code]));}
 assert.equal((await db.query("select count(*)::int n from fiscal_private.emissions where status_code='100'")).rows[0].n,1);
 }finally{await db.close();}
});
test('edição de tentativa anterior exige prova imutável 217; conserva reserva e artefatos, sem transmitir',async()=>{
 const lab=await createSyntheticNfeOrchestratorLab({authorizationResponder:async()=>{throw new Error('Timeout sintético');},returnResponder:async({accessKey})=>absent(accessKey)});
 try{
 await lab.continueEmission();const service=createFiscalEmissionLifecycleService({repository:lab.repository});let current=[...lab.repository.state.emissions.values()][0];
 const input={companyId:current.companyId,emissionId:current.id,expectedVersion:current.version,operationKey:'explicit:reopen:217',actorId:'10000000-0000-4000-8000-000000000002'};
 assert.equal((await service.reopenUnreceivedForCorrection(input)).ok,false);
 await lab.runRecoveryOnce();current=structuredClone([...lab.repository.state.emissions.values()][0]);const artifacts=structuredClone([...lab.repository.state.artifacts.values()]);
 assert.equal((await service.reopenUnreceivedForCorrection({...input,expectedVersion:current.version,companyId:'other'})).ok,false);
 const proof=lab.repository.state.events.find(e=>e.eventType==='emission.not_received_confirmed');lab.repository.state.events=lab.repository.state.events.filter(e=>e!==proof);
 assert.equal((await service.reopenUnreceivedForCorrection({...input,expectedVersion:current.version})).ok,false);lab.repository.state.events.push(proof);
 const result=await service.reopenUnreceivedForCorrection({...input,expectedVersion:current.version});assert.equal(result.ok,true,JSON.stringify(result.errors));assert.equal(result.emission.state,'number_reserved');
 for(const field of ['number','series','reservationId'])assert.equal(result.emission[field],current[field]);assert.equal(result.emission.accessKey,'');assert.equal(result.emission.signedChecksum,'');assert.deepEqual([...lab.repository.state.artifacts.values()],artifacts);assert.equal(lab.metrics.syntheticAuthorizationCalls,1);assert.equal(lab.metrics.externalNetworkCalls,0);
 }finally{await lab.cleanup();}
});

test('repositório SQL real preserva rejeição RTC e prova de retomada dentro da transação',async()=>{
 const {sqlDeTesteURL}=await import('../helpers/sql-historico.mjs');const {createPostgresFiscalRepository}=await import('../../app/vendas/lib/server/fiscal-postgres-repository.mjs');
 const db=new PGlite();try{
 await db.exec('create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key);create table empresas(id uuid primary key);');
 for(const f of ['20260905153000_vendas_fiscal_privado.sql','20260905154000_vendas_fiscal_recuperacao.sql','20260905162000_vendas_artefatos_revisoes.sql','20260905163000_vendas_rejeicoes_correcoes.sql'])await db.exec(readFileSync(sqlDeTesteURL(f),'utf8'));
 await db.exec(readFileSync('supabase/migrations/20261106180000_vendas_cstat_rtc.sql','utf8'));
 const id='10000000-0000-4000-8000-000000000001',other='20000000-0000-4000-8000-000000000001';
 await db.query('insert into empresas values($1)',[id]);await db.query('insert into auth.users values($1)',[id]);
 await db.query(`insert into fiscal_private.emissions(id,company_id,establishment_id,draft_id,document_type,model,environment,state,version,series,number,reservation_id,access_key,signed_checksum,status_code) values($1::uuid,$1::uuid,$1::uuid,$1::text,'nfe','55','homologacao','submitted',5,'1',1,$1::uuid,$2,$3,null)`,[id,'35'+'1'.repeat(42),'a'.repeat(64)]);
 const client={query:async(sql,args)=>{const r=await db.query(sql,args);return {...r,rowCount:r.affectedRows??r.rows.length};},release(){}};
 const repo=createPostgresFiscalRepository({pool:{connect:async()=>client}}),service=createFiscalEmissionLifecycleService({repository:repo});
 const rejection=await service.transition({companyId:id,emissionId:id,expectedVersion:5,operationKey:'rtc:sql:reject:1040',toState:'rejected',patch:{statusCode:'1040',statusReason:'Rejeição RTC sintética'}});assert.equal(rejection.ok,true,JSON.stringify(rejection.errors));assert.equal((await db.query('select status_code from fiscal_private.emissions')).rows[0].status_code,'1040');
 assert.equal(await repo.runInTransaction(tx=>tx.findNotReceivedConfirmation(id,id,6)),false);
 await db.query(`insert into fiscal_private.events(company_id,emission_id,sequence,to_state,event_type,public_payload) values($1,$1,7,'signed','emission.not_received_confirmed','{"statusCode":"217"}')`,[id]);
 assert.equal(await repo.runInTransaction(tx=>tx.findNotReceivedConfirmation(id,id,7)),true);assert.equal(await repo.runInTransaction(tx=>tx.findNotReceivedConfirmation(other,id,7)),false);
 await db.query("update fiscal_private.emissions set state='signed',status_code='217',version=7 where id=$1",[id]);
 await db.query("insert into fiscal_private.artifacts(company_id,emission_id,artifact_type,storage_reference,checksum_sha256,byte_length,content_type) values($1,$1,'signed_xml','local://previous-attempt',$2,10,'application/xml')",[id,'a'.repeat(64)]);
 const reopened=await service.reopenUnreceivedForCorrection({companyId:id,emissionId:id,expectedVersion:7,operationKey:'rtc:sql:reopen:217',actorId:id});assert.equal(reopened.ok,true,JSON.stringify(reopened.errors));assert.equal(reopened.emission.state,'number_reserved');assert.equal(reopened.emission.number,1);
 assert.equal((await db.query('select count(*)::int n from fiscal_private.artifacts')).rows[0].n,1);assert.equal((await db.query("select count(*)::int n from fiscal_private.events where event_type='emission.reopened_after_not_received'")).rows[0].n,1);

 }finally{await db.close();}
});
