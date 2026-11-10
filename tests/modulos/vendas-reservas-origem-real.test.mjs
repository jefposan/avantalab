import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {createPostgresCommercialNfePreparationRepository} from '../../app/vendas/lib/server/commercial-nfe-preparation.mjs';
import {buildNfeIssuancePreparation} from '../../app/vendas/lib/server/nfe-issuance-preparation.mjs';

test('reservas de outras notas não tomam o lugar da série ativa de um novo rascunho',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create schema fiscal_private;
   create table vendas_fiscal_rascunhos(id text,empresa_id text,operacao_id text,origem_tipo text,documento_tipo text,situacao text,emitente_retrato jsonb,destinatario_retrato jsonb,itens_retrato jsonb,totais_retrato jsonb,pagamento_retrato jsonb,conteudo_hash text);
   create table vendas_operacoes(id text,empresa_id text,situacao text,situacao_fiscal text);
   create table fiscal_private.emissions(id text,company_id text,establishment_id text,draft_id text,origin_id text,document_type text,model text,environment text,state text,version int);
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
 }finally{await db.close();}
});
