import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommercialNfeRejectionCorrectionService,NFE_REJECTION_CORRECTION_CONFIRMATION} from '../../app/vendas/lib/server/commercial-nfe-rejection-correction.mjs';
const id='10000000-0000-4000-8000-000000000001',companyId='20000000-0000-4000-8000-000000000001',establishmentId='30000000-0000-4000-8000-000000000001';
const context={companyId,actorId:establishmentId,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'fiscal.prepare':true}};
function fixture(state='number_reserved',extra={}){
 const draft={id,companyId,operationId:id,originType:'avulsa',documentType:'nfe',status:'pronto',issuerSnapshot:{establishmentId,document:'12345678000195'},customerSnapshot:{document:'11144477735'},itemsSnapshot:[{sku:'A',name:'Produto',quantity:1,unitPrice:10,unitDiscount:0,fiscal:{ncm:'33059000',cfop:'5102'}}],totalsSnapshot:{total:10},paymentSnapshot:{method:'Dinheiro',amount:10}};
 const emission={id,companyId,establishmentId,draftId:id,originId:id,documentType:'nfe',model:'55',environment:'homologacao',state,version:6,reservationId:'reservation',series:'1',number:1,...extra};
 const reservation={id:'reservation',companyId,establishmentId,emissionId:id,documentType:'nfe',status:'reserved',series:'1',number:1};
 let saved;
 const service=createCommercialNfeRejectionCorrectionService({repository:{load:async()=>({draft,emission,reservation,baseIssuerDocument:'12345678000195'}),findByOperation:async()=>null,save:async input=>{saved=input;return{revision:1,version:7};}},emissionLifecycle:{transition:async()=>{throw Error('Não pode transmitir nem refazer a reserva');}},fiscalRuleResolver:async()=>({valid:true}),preparationBuilder:async()=>({valid:true,schemaValid:true,numberPreviouslyReserved:true,series:'1',candidateNumber:1,accessKeyPreview:'1'.repeat(44)})});
 const note={customerName:'Cliente',customerDocument:'11144477735',paymentMethod:'Dinheiro',items:[{sku:'A',quantity:2,unitPrice:10,unitDiscount:1,ncm:'33059000',cfop:'5102'}],freight:0,insurance:0,otherExpenses:0,generalDiscount:0};
 return{draft,service,saved:()=>saved,input:{context,emissionId:id,expectedVersion:6,idempotencyKey:'edit-note-before-send-001',rejectedStatusCode:'000',confirmation:NFE_REJECTION_CORRECTION_CONFIRMATION,changes:{note}}};
}
test('nota reservada salva revisão completa sem enviar, mantém número e não altera a origem',async()=>{
 const f=fixture(),original=structuredClone(f.draft);const result=await f.service.prepare(f.input);assert.equal(result.ok,true,JSON.stringify(result.errors));assert.equal(result.result.version,7);assert.equal(result.result.number,1);assert.equal(result.result.series,'1');assert.equal(result.result.automaticTransmission,false);assert.equal(f.saved().draft.totalsSnapshot.total,18);assert.deepEqual(f.draft,original);
});
test('revisão pendente recusa estados enviados, assinatura existente, versão antiga e acesso negado',async()=>{
 for(const state of ['signed','submitted','processing','authorized','canceled']){const f=fixture(state);assert.equal((await f.service.prepare(f.input)).ok,false);assert.equal(f.saved(),undefined);}
 for(const extra of [{submittedAt:'2026-11-06'},{signedChecksum:'a'.repeat(64)},{protocolNumber:'123'}]){const f=fixture('number_reserved',extra);assert.equal((await f.service.prepare(f.input)).ok,false);assert.equal(f.saved(),undefined);}
 const f=fixture();assert.equal((await f.service.prepare({...f.input,expectedVersion:5})).ok,false);assert.equal((await f.service.prepare({...f.input,context:{...context,effectivePermissions:{}}})).ok,false);assert.equal(f.saved(),undefined);
});
