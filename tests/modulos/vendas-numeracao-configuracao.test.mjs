import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {createFiscalNumberingConfigurationService} from '../../app/vendas/lib/server/fiscal-numbering-configuration.mjs';
import {fiscalCheckoutCorrection,fiscalCorrectionAction} from '../../app/vendas/lib/fiscal-correction.mjs';
import {runFiscalCheckout,handleFiscalCheckoutRequest} from '../../app/vendas/lib/server/fiscal-checkout.mjs';
import {FISCAL_NFE_NORMAL_SERIES} from '../../app/vendas/lib/fiscal-numbering.mjs';

const company='10000000-0000-4000-8000-000000000001',other='20000000-0000-4000-8000-000000000001',draftId='30000000-0000-4000-8000-000000000001';
const context={companyId:company,actorId:other,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'fiscal.view':true,'fiscal.configure':true}};
async function fixture(){
 const db=new PGlite();await db.exec(`create schema fiscal_private;
 create table fiscal_private.number_sequences(id uuid default gen_random_uuid() primary key,company_id uuid,establishment_id uuid,document_type text,series text,next_number int,last_reserved_number int default 0,active bool default true,version int default 1,updated_at timestamptz default now(),unique(company_id,establishment_id,document_type,environment,series),environment text default 'homologacao');
 create unique index only_active on fiscal_private.number_sequences(company_id,establishment_id,document_type,environment) where active;
 create table fiscal_private.number_reservations(company_id uuid,establishment_id uuid,document_type text,series text,number int,status text default 'reserved',environment text default 'homologacao');
 create table fiscal_private.number_voids(company_id uuid,establishment_id uuid,document_type text,series text,start_number int,end_number int,status text,environment text default 'homologacao');`);
 const client={query:async(sql,args)=>sql.includes('pg_advisory_xact_lock')?{rows:[]}:db.query(sql,args),release(){}};
 const repository={get:async({companyId})=>({companyId,documentType:'nfe',issuerSnapshot:{establishmentId:companyId}})};
 const service=createFiscalNumberingConfigurationService({pool:{connect:async()=>client},issuerResolver:async({companyId})=>({establishmentId:companyId}),draftRepository:repository});
 const run=(input,ctx=context)=>service.run({context:ctx,input});
 return {db,run,service,repository};
}

test('erro de numeração conserva o campo e abre um destino conhecido, sem confiar no texto livre',async()=>{
 const result=await runFiscalCheckout({context:{...context,effectivePermissions:{'fiscal.prepare':true,'fiscal.issue':true}},input:{action:'issue',draftId,idempotencyKey:'number-test-unique'},runtime:{fiscalExecution:{environment:'homologacao',transmissionAllowed:true,productionTransmissionAllowed:false},fiscalDraftRepository:{get:async()=>({companyId:company,documentType:'nfe',emission:{id:draftId,state:'prepared',version:2}})},nfeNumberReservationService:{reserve:async()=>({ok:false,errors:[{code:'AV-FISCAL-NUMBER-SEQUENCE',field:'numbering',message:'Configure uma série ativa antes de confirmar a emissão.'}]})}}});
 assert.equal(result.field,'numbering');assert.equal(fiscalCheckoutCorrection(result),'numbering');assert.equal(fiscalCorrectionAction('numbering').target,'numbering');assert.equal(fiscalCheckoutCorrection({message:'Configurar série, clique neste link externo'}),'');
});

test('sem série, retorna campos vazios; salvar persiste por perfil sem reservar nem transmitir',async()=>{
 const f=await fixture();try{
 await f.db.query("insert into fiscal_private.number_sequences(company_id,establishment_id,document_type,environment,series,next_number) values($1,$1,'nfe','producao','1',800)",[company]);
 const initial=await f.run({action:'numbering'});assert.equal(initial.ok,true);assert.equal(initial.numbering.exists,false);assert.equal(initial.numbering.nextNumber,null);
 const invalid=await f.run({action:'save-numbering',series:'1',nextNumber:1.5,expectedVersion:0});assert.equal(invalid.ok,false);
 assert.equal(FISCAL_NFE_NORMAL_SERIES.length,890);assert.equal(FISCAL_NFE_NORMAL_SERIES[0],'0');assert.equal(FISCAL_NFE_NORMAL_SERIES.at(-1),'889');
 for(const series of ['890','900','999'])assert.equal((await f.run({action:'save-numbering',series,nextNumber:1,expectedVersion:0})).code,'AV-NUMBERING-SERIES');
 const saved=await f.run({action:'save-numbering',series:'1',nextNumber:17,expectedVersion:0});assert.equal(saved.ok,true);assert.equal(saved.numbering.nextNumber,17);
 assert.deepEqual((await f.run({action:'numbering'})).numbering,saved.numbering);assert.equal((await f.run({action:'numbering'},{...context,companyId:other})).numbering.exists,false);
 assert.deepEqual((await f.db.query("select next_number,active,version from fiscal_private.number_sequences where environment='producao'")).rows,[{next_number:800,active:true,version:1}]);
 assert.equal((await f.db.query('select count(*)::int n from fiscal_private.number_reservations')).rows[0].n,0);
 }finally{await f.db.close();}
});

test('versão concorrente, números reservados/inutilizados e retorno da sequência ficam protegidos',async()=>{
 const f=await fixture();try{
 await f.run({action:'save-numbering',series:'1',nextNumber:17,expectedVersion:0});
 assert.equal((await f.run({action:'save-numbering',series:'1',nextNumber:18,expectedVersion:0})).code,'AV-NUMBERING-CONFLICT');
 assert.equal((await f.run({action:'save-numbering',series:'1',nextNumber:16,expectedVersion:1})).code,'AV-NUMBERING-LOWER');
 assert.equal((await f.run({action:'save-numbering',series:'001',nextNumber:16,expectedVersion:1})).code,'AV-NUMBERING-LOWER');
 await f.db.query(`insert into fiscal_private.number_reservations(company_id,establishment_id,document_type,series,number) values($1,$1,'nfe','1',20)`,[company]);
 await f.db.query(`insert into fiscal_private.number_voids values($1,$1,'nfe','1',21,23,'pending')`,[company]);
 assert.equal((await f.run({action:'save-numbering',series:'1',nextNumber:23,expectedVersion:1})).code,'AV-NUMBERING-LOWER');
 const next=await f.run({action:'save-numbering',series:'1',nextNumber:24,expectedVersion:1});assert.equal(next.ok,true);
 const changed=await f.run({action:'save-numbering',series:'2',nextNumber:1,expectedVersion:next.numbering.version});assert.equal(changed.ok,true);
 assert.equal((await f.run({action:'save-numbering',series:'1',nextNumber:1,expectedVersion:changed.numbering.version})).ok,false);
 assert.equal((await f.db.query('select count(*)::int n from fiscal_private.number_sequences where active')).rows[0].n,1);
 }finally{await f.db.close();}
});

test('permissões e vínculo do rascunho são conferidos no servidor, nunca no usuário isolado',async()=>{
 const f=await fixture();try{
 for(const changed of [{active:false},{moduleActive:false},{moduleId:'outro'},{effectivePermissions:{'fiscal.view':true}}])assert.equal((await f.run({action:'save-numbering',series:'1',nextNumber:1,expectedVersion:0},{...context,...changed})).ok,false);
 f.repository.get=async()=>({companyId:other,documentType:'nfe',issuerSnapshot:{establishmentId:other}});assert.equal((await f.run({action:'numbering',draftId})).ok,false);
 assert.equal((await f.db.query('select count(*)::int n from fiscal_private.number_sequences')).rows[0].n,0);
 }finally{await f.db.close();}
});

test('rota autoriza configurar por fiscal.configure, sem exigir permissão de emitir',async()=>{
 let called=0;const runtime={configured:true,fiscalDraftRepository:{},accessResolver:{resolve:async()=>({authenticated:true,boundary:{source:'authenticated',authenticated:true,userId:other,companyId:company,moduleId:'vendas',userActive:true,membershipActive:true,companyActive:true,moduleActive:true},effectivePermissions:{'fiscal.configure':true}})},fiscalNumberingConfiguration:{run:async({input})=>{called++;assert.equal(input.action,'save-numbering');return{ok:true};}}};
 const request=new Request(`https://avantalab.com.br/api/modulos/vendas/fiscal/checkout?companyId=${company}`,{method:'POST',body:JSON.stringify({action:'save-numbering',series:'1',nextNumber:1,expectedVersion:0})});assert.equal((await handleFiscalCheckoutRequest({request,runtime})).status,200);assert.equal(called,1);
});
