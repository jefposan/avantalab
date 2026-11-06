import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {createPostgresCommercialNfeSigningPreparationRepository} from '../../app/vendas/lib/server/commercial-nfe-signing-preparation.mjs';
import {commercialNfeFiscalSnapshotDigest} from '../../app/vendas/lib/server/commercial-nfe-preparation.mjs';
import {fiscalValidationTarget} from '../../app/vendas/lib/fiscal-validation.mjs';
test('SQL real: consumidor final assina com dados e preparação da mesma revisão, sem reutilizar evidência antiga',async()=>{
 const db=new PGlite();try{
 await db.exec(`create schema fiscal_private;
 create table vendas_fiscal_rascunhos(id text,empresa_id text,operacao_id text,origem_tipo text,documento_tipo text,situacao text,emitente_retrato jsonb,destinatario_retrato jsonb,itens_retrato jsonb,totais_retrato jsonb,pagamento_retrato jsonb,conteudo_hash text);
 create table vendas_operacoes(id text,empresa_id text,situacao text,situacao_fiscal text);
 create table fiscal_private.emissions(id text,company_id text,establishment_id text,draft_id text,origin_id text,document_type text,model text,environment text,state text,version int,series text,number int,reservation_id text);
 create table fiscal_private.number_reservations(id text,company_id text,establishment_id text,emission_id text,document_type text,series text,number int,status text);
 create table fiscal_private.events(company_id text,emission_id text,event_type text,sequence int,public_payload jsonb);
 create table fiscal_private.emission_corrections(company_id text,emission_id text,revision int,issuer_snapshot jsonb,recipient_snapshot jsonb,items_snapshot jsonb,totals_snapshot jsonb,payment_snapshot jsonb,correction_digest text,preparation_payload jsonb);
 insert into fiscal_private.emissions values ('note','company','issuer','note','note','nfe','55','homologacao','number_reserved',5,'1',1,'reservation');
 insert into fiscal_private.number_reservations values ('reservation','company','issuer','note','nfe','1',1,'reserved');`);
 const draft={id:'note',companyId:'company',operationId:'note',issuerSnapshot:{establishmentId:'issuer'},customerSnapshot:{document:'11144477735',consumerFinal:false,address:{state:'SP'}},itemsSnapshot:[{sku:'A',unit:'UN',quantity:1,unitPrice:10,unitDiscount:0,fiscal:{ncm:'33059000'}}],totalsSnapshot:{total:10,operationNature:'Venda interna'},paymentSnapshot:{method:'Dinheiro'}};
 const revised={...structuredClone(draft),customerSnapshot:{...draft.customerSnapshot,consumerFinal:true},totalsSnapshot:{total:10,operationNature:'Venda para consumidor final'}};
 const rules={presence:'Não presencial',matrixReviewConfirmed:true,taxReviewConfirmed:true,taxReformReviewConfirmed:true};const issuedAt='2026-11-06T12:00:00-03:00';
 const old={issuedAt,schemaValid:true,fiscalSnapshotDigest:commercialNfeFiscalSnapshotDigest({draft},rules,issuedAt)};
 const current={issuedAt,schemaValid:true,fiscalSnapshotDigest:commercialNfeFiscalSnapshotDigest({draft:revised},rules,issuedAt)};
 await db.query('insert into vendas_fiscal_rascunhos values ($1,$2,$1,$3,$4,$5,$6,$7,$8,$9,$10,$11)',['note','company','avulsa','nfe','pronto',draft.issuerSnapshot,draft.customerSnapshot,draft.itemsSnapshot,draft.totalsSnapshot,draft.paymentSnapshot,'base']);
 await db.query('insert into fiscal_private.events values ($1,$2,$3,1,$4)',['company','note','emission.prepared',old]);
 const repo=createPostgresCommercialNfeSigningPreparationRepository({pool:db});assert.deepEqual((await repo.load({companyId:'company',emissionId:'note'})).preparationPayload,old);
 await db.query('insert into fiscal_private.emission_corrections values ($1,$2,1,$3,$4,$5,$6,$7,$8,$9)',['company','note',revised.issuerSnapshot,revised.customerSnapshot,revised.itemsSnapshot,revised.totalsSnapshot,revised.paymentSnapshot,'revised',current]);
 const loaded=await repo.load({companyId:'company',emissionId:'note'});assert.equal(loaded.draft.customerSnapshot.consumerFinal,true);assert.equal(loaded.draft.totalsSnapshot.operationNature,'Venda para consumidor final');assert.deepEqual(loaded.preparationPayload,current);assert.equal(commercialNfeFiscalSnapshotDigest(loaded,rules,issuedAt),current.fiscalSnapshotDigest);assert.notEqual(current.fiscalSnapshotDigest,old.fiscalSnapshotDigest);
 assert.equal(await repo.load({companyId:'other',emissionId:'note'}),null);
 await db.query('update fiscal_private.emission_corrections set preparation_payload=$1 where emission_id=$2',[{schemaValid:false,source:'saved_pending_revision'},'note']);assert.equal((await repo.load({companyId:'company',emissionId:'note'})).preparationPayload.schemaValid,false,'Revisão pendente nunca pode herdar evidência válida antiga.');
 }finally{await db.close();}
});
test('falha técnica de preparação aponta natureza/conferência, não produtos',()=>{assert.equal(fiscalValidationTarget({code:'AV-NFE-SIGNING-RULE-CHANGE',field:'fiscal'}),'operationNature');});
