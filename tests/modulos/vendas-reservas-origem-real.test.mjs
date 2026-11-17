import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {createPostgresCommercialNfePreparationRepository} from '../../app/vendas/lib/server/commercial-nfe-preparation.mjs';
import {createPostgresCommercialNfeRejectionCorrectionRepository} from '../../app/vendas/lib/server/commercial-nfe-rejection-correction.mjs';
import {buildNfeIssuancePreparation} from '../../app/vendas/lib/server/nfe-issuance-preparation.mjs';

test('reservas de outras notas não tomam o lugar da série ativa de um novo rascunho',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create schema fiscal_private;
   create table vendas_fiscal_rascunhos(id text,empresa_id text,operacao_id text,origem_tipo text,documento_tipo text,situacao text,emitente_retrato jsonb,destinatario_retrato jsonb,itens_retrato jsonb,totais_retrato jsonb,pagamento_retrato jsonb,conteudo_hash text);
   create table vendas_operacoes(id text,empresa_id text,situacao text,situacao_fiscal text);
   create table fiscal_private.emissions(id text,company_id text,establishment_id text,draft_id text,origin_id text,document_type text,model text,environment text,state text,version int);
   create table fiscal_private.emission_corrections(company_id text,emission_id text,revision int,issuer_snapshot jsonb,recipient_snapshot jsonb,items_snapshot jsonb,totals_snapshot jsonb,payment_snapshot jsonb,correction_digest text);
   create table fiscal_private.number_sequences(company_id text,establishment_id text,document_type text,series text,next_number int,last_reserved_number int,active boolean,updated_at text,environment text default 'homologacao');
   create table fiscal_private.number_reservations(id text,company_id text,establishment_id text,emission_id text,document_type text,series text,number int,status text,idempotency_key text,reserved_at text,updated_at text,environment text default 'homologacao');
   create table fiscal_private.number_voids(id text,company_id text,establishment_id text,document_type text,series text,start_number int,end_number int,reason text,status text,protocol_number text,created_at text,updated_at text,environment text default 'homologacao');
   insert into vendas_fiscal_rascunhos(id,empresa_id,origem_tipo,documento_tipo,situacao) values('new-draft','company','avulsa','nfe','pronto');
   insert into fiscal_private.emissions values('new-draft','company','issuer','new-draft','new-draft','nfe','55','homologacao','draft',1),('old-emission','company','issuer','old-draft','old-order','nfe','55','homologacao','signed',5),('foreign','other','issuer','foreign-draft','foreign-order','nfe','55','homologacao','signed',5);
   insert into fiscal_private.number_sequences values('company','issuer','nfe','1',2,1,false,''),('company','issuer','nfe','2',1,0,true,'');
   insert into fiscal_private.number_reservations values('old','company','issuer','old-emission','nfe','1',1,'reserved','old-key','',''),('released','company','issuer','old-emission','nfe','1',2,'released','released-key','',''),('foreign','other','issuer','foreign','nfe','2',1,'reserved','foreign-key','','');`);
  const repository=createPostgresCommercialNfePreparationRepository({pool:db});
  const loaded=await repository.load({companyId:'company',draftId:'new-draft'});
  assert.equal(loaded.numberingLedger.reservations.length,1);
  assert.equal(loaded.numberingLedger.reservations[0].draftId,'old-draft');
  assert.equal(loaded.numberingLedger.reservations[0].originId,'old-order');
  const preview=await buildNfeIssuancePreparation({draft:{id:'new-draft',documentType:'nfe',environment:'Homologação',issuer:{uf:'SP',document:'16978862000123'},fiscalForm:{series:'2',number:''}},numberingLedger:loaded.numberingLedger,attemptKey:'new-draft-attempt'});
  assert.equal(preview.series,'2');assert.equal(preview.candidateNumber,1);assert.equal(preview.numberPreviouslyReserved,false);
  assert.equal(preview.errors.some(e=>e.field==='numbering.sequence'),false);
  await db.exec(`update fiscal_private.emissions set draft_id='new-draft',origin_id='new-draft' where id='old-emission'`);
  const existing=await repository.load({companyId:'company',draftId:'new-draft'});
  const resumed=await buildNfeIssuancePreparation({draft:{id:'new-draft',documentType:'nfe',environment:'Homologação',issuer:{uf:'SP',document:'16978862000123'}},numberingLedger:existing.numberingLedger,attemptKey:'existing-attempt'});
  assert.equal(resumed.series,'1');assert.equal(resumed.candidateNumber,1);assert.equal(resumed.numberPreviouslyReserved,true);
  assert.equal(await repository.load({companyId:'other',draftId:'new-draft'}),null);
  await db.query(`insert into fiscal_private.emission_corrections(company_id,emission_id,revision,totals_snapshot,correction_digest)values('company','new-draft',1,$1,'latest-digest')`,[JSON.stringify({operationNature:'Natureza corrigida',total:10})]);
  const revised=await repository.load({companyId:'company',draftId:'new-draft'});assert.equal(revised.draft.totalsSnapshot.operationNature,'Natureza corrigida');assert.equal(revised.draft.contentDigest,'latest-digest');
  assert.equal((await db.query("select totais_retrato from vendas_fiscal_rascunhos where id='new-draft'")).rows[0].totais_retrato,null);
  // Gravação real da revisão de emissão ainda sem reserva, mantendo a origem imutável.
  await db.exec(`alter table fiscal_private.emissions add column series text,add column number int,add column reservation_id text,add column access_key text,add column signed_checksum text,add column batch_id text,add column submitted_at text,add column receipt_number text,add column status_code text,add column status_reason text,add column protocol_number text,add column authorized_at text,add column processed_storage_reference text,add column processed_checksum text,add column danfe_storage_reference text,add column danfe_checksum text,add column updated_at timestamptz;
    alter table fiscal_private.emission_corrections add column id uuid default gen_random_uuid(),add column operation_key text,add column source_status_code text,add column preparation_payload jsonb,add column created_by text,add column created_at timestamptz;`);
  const pool={query:(sql,args)=>sql.includes('pg_advisory_xact_lock')?Promise.resolve({rows:[]}):db.query(sql,args)};
  const corrections=createPostgresCommercialNfeRejectionCorrectionRepository({pool});
  const editable=await corrections.load({companyId:'company',emissionId:'new-draft'});assert.ok(editable);assert.equal(editable.reservation,null);assert.equal(editable.emission.state,'draft');
  const snapshot={issuerSnapshot:{establishmentId:'issuer'},customerSnapshot:{name:'Cliente'},itemsSnapshot:[{sku:'A',quantity:1,unitPrice:10}],totalsSnapshot:{operationNature:'Nova natureza',total:10},paymentSnapshot:{method:'Dinheiro'}};
  const saved=await corrections.save({companyId:'company',emissionId:'new-draft',expectedVersion:1,operationKey:'revision-without-number',sourceStatusCode:'000',draft:snapshot,correctionDigest:'a'.repeat(64),preparationPayload:{source:'saved_pending_revision'},actorId:'actor',createdAt:'2026-11-17T12:00:00Z'});
  assert.equal(saved.version,2);assert.equal(saved.revision,2);
  const updated=await repository.load({companyId:'company',draftId:'new-draft'});assert.equal(updated.draft.totalsSnapshot.operationNature,'Nova natureza');assert.equal(updated.draft.contentDigest,'a'.repeat(64));assert.equal(updated.emission.state,'draft');
  const persisted=(await db.query("select version,number,reservation_id from fiscal_private.emissions where id='new-draft'")).rows[0];assert.equal(persisted.version,2);assert.equal(persisted.number,null);assert.equal(persisted.reservation_id,null);
  assert.equal((await db.query("select totais_retrato from vendas_fiscal_rascunhos where id='new-draft'")).rows[0].totais_retrato,null);

 }finally{await db.close();}
});
