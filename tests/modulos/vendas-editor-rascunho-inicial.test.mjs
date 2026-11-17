import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommercialNfeRejectionCorrectionService,NFE_REJECTION_CORRECTION_CONFIRMATION} from '../../app/vendas/lib/server/commercial-nfe-rejection-correction.mjs';
import {parseFiscalCorrectionResponse,FISCAL_CORRECTION_RESPONSE_TYPE} from '../../app/vendas/lib/fiscal-status-bridge.mjs';
import {newFiscalNoteFields} from '../../app/vendas/lib/fiscal-note-editor.mjs';
const id='11111111-1111-4111-8111-111111111111',companyId='22222222-2222-4222-8222-222222222222',actorId='33333333-3333-4333-8333-333333333333';
const context={companyId,actorId,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'fiscal.prepare':true}};
function fixture(environment){
 const draft={id,companyId,operationId:id,originType:'avulsa',documentType:'nfe',status:'pronto',issuerSnapshot:{establishmentId:companyId,document:'10573521000191',state:'SP'},customerSnapshot:{displayName:'Cliente',document:'11144477735',address:{state:'RJ'}},itemsSnapshot:[{sku:'A',name:'Produto',quantity:1,unitPrice:10,unitDiscount:0,fiscal:{ncm:'33059000',cfop:'5102'}}],totalsSnapshot:{total:10},paymentSnapshot:{method:'Dinheiro',amount:10}};
 const data={draft,baseIssuerDocument:'10573521000191',emission:{id,companyId,establishmentId:companyId,draftId:id,originId:id,state:'draft',documentType:'nfe',model:'55',environment,version:1,series:'',number:0,reservationId:''},reservation:null};
 const saves=[];
 const repository={load:async()=>structuredClone(data),findByOperation:async()=>null,save:async args=>{saves.push(args);return {version:2,revision:1};}};
 const service=createCommercialNfeRejectionCorrectionService({repository,environment,emissionLifecycle:{transition:()=>{throw Error('Não pode reservar ou transmitir.');}},fiscalRuleResolver:()=>{throw Error('Conferência completa ocorre no checkout, após gravar revisão.');}});
 const note={customerName:'Cliente',customerDocument:'11144477735',paymentMethod:'Dinheiro',items:[{sku:'A',quantity:1,unitPrice:10,unitDiscount:0,ncm:'33059000',cfop:'6102'}],freight:0,insurance:0,otherExpenses:0,generalDiscount:0,operationNature:'Venda interestadual',fiscalForm:newFiscalNoteFields()};
 return {service,data,saves,note,run:saveOnly=>service.prepare({context,emissionId:id,expectedVersion:1,idempotencyKey:'edit-initial-draft-test',rejectedStatusCode:'000',confirmation:NFE_REJECTION_CORRECTION_CONFIRMATION,changes:{note},saveOnly})};
}
for(const environment of ['homologacao','producao'])test(`rascunho ${environment} sem número permite revisão e devolve o vínculo para continuar emissão`,async()=>{
 for(const saveOnly of [true,false]){
  const f=fixture(environment),before=structuredClone(f.data);const result=await f.run(saveOnly);
  assert.equal(result.ok,true,JSON.stringify(result.errors));assert.equal(result.result.state,'draft');assert.equal(result.result.number,0);assert.equal(result.result.version,2);assert.equal(result.result.transmitted,false);assert.equal(f.saves.length,1);
  assert.equal(f.saves[0].draft.totalsSnapshot.operationNature,'Venda interestadual');assert.equal(f.saves[0].draft.itemsSnapshot[0].fiscal.cfop,'6102');assert.deepEqual(f.data,before);
  const parsed=parseFiscalCorrectionResponse({type:FISCAL_CORRECTION_RESPONSE_TYPE,requestId:'edit-initial-draft-response',ok:true,emission:result.result});assert.equal(parsed.ok,true);assert.equal(parsed.emission.state,'draft');
 }
});
test('rascunho com sinais de transmissão, reserva ou ambiente divergente não ganha liberação de edição',async()=>{
 for(const change of [{submittedAt:'2026-11-17T12:00:00Z'},{signedChecksum:'a'.repeat(64)},{number:1,reservationId:'reservation'},{environment:'homologacao'}]){
  const f=fixture('producao');Object.assign(f.data.emission,change);const result=await f.run(false);assert.equal(result.ok,false);assert.equal(f.saves.length,0);
 }
});

test('documento em produção conserva o ambiente ao atravessar a ponte e montar a tela',async()=>{
 const {parseFiscalDocumentsMessage,FISCAL_DOCUMENTS_MESSAGE_TYPE}=await import('../../app/vendas/lib/fiscal-documents-bridge.mjs');
 const {readFileSync}=await import('node:fs');const vm=await import('node:vm');const {default:ts}=await import('typescript');
 const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8'),ast=ts.createSourceFile('view.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const mapper=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='mapPersistedFiscalDocument');
 const scope={exports:{},persistedFiscalItem:value=>value,Date};vm.runInNewContext(ts.transpileModule(mapper.getText(ast)+'\nexports.map=mapPersistedFiscalDocument;',{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,scope);
 for(const [environment,label]of [['producao','Produção'],['homologacao','Homologação']]){
  const parsed=parseFiscalDocumentsMessage({type:FISCAL_DOCUMENTS_MESSAGE_TYPE,companyId,documents:[{draftId:id,originId:id,originType:'avulsa',documentType:'nfe',draftStatus:'pronto',emissionId:id,emission:{id,environment,state:'draft',version:1}}]});
  assert.equal(parsed.documents[0].emission.environment,environment);assert.equal(scope.exports.map(parsed.documents[0]).environment,label);
 }
});
