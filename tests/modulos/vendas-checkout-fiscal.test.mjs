import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommercialNfeAutomaticIssuanceService} from '../../app/vendas/lib/server/commercial-nfe-automatic-issuance.mjs';
import {runFiscalCheckout,handleFiscalCheckoutRequest} from '../../app/vendas/lib/server/fiscal-checkout.mjs';
import {canResumeFiscalDraft,fiscalDraftForReview} from '../../app/vendas/lib/fiscal-checkout.mjs';

const companyId='10000000-0000-4000-8000-000000000001';
const actorId='10000000-0000-4000-8000-000000000002';
const draftId='10000000-0000-4000-8000-000000000003';
const emissionId='10000000-0000-4000-8000-000000000004';
const orderId='10000000-0000-4000-8000-000000000005';
const context={companyId,actorId,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'fiscal.prepare':true,'fiscal.issue':true}};
const input={action:'issue',draftId,idempotencyKey:'checkout:test:unique'};

function fixture(state){
 const calls=[];let emission=state?{id:emissionId,state,version:2,series:'1',number:['prepared','draft'].includes(state)?0:10}:null;
 const runtime={configured:true,fiscalExecution:{environment:'homologacao',transmissionAllowed:true,productionTransmissionAllowed:false},
  accessResolver:{resolve:async()=>({authenticated:true,boundary:{source:'authenticated',authenticated:true,userId:actorId,companyId,moduleId:'vendas',userActive:true,membershipActive:true,companyActive:true,moduleActive:true},effectivePermissions:context.effectivePermissions})},
  fiscalDraftRepository:{get:async scope=>{assert.equal(scope.companyId,companyId);assert.equal(scope.draftId,draftId);return {id:draftId,companyId,documentType:'nfe',emission};}},
  orderFiscalDraftService:{create:async args=>{calls.push('persist-order');assert.equal(args.input.originOrderId,orderId);return {ok:true,document:{draftId}};}},
  emissionBridge:{createNfeDraft:async args=>{calls.push('open');assert.equal(args.context,context);emission={id:emissionId,state:'draft',version:1};return {ok:true};}},
  nfePreparationService:{prepare:async()=>{calls.push('validate');emission={...emission,state:'prepared',version:emission.version+1};return {ok:true};}},
  nfeNumberReservationService:{reserve:async args=>{calls.push('number');assert.equal(args.expectedVersion,emission.version);emission={...emission,state:'number_reserved',version:emission.version+1,series:'1',number:10};return {ok:true};}},
  nfeAutomaticIssuanceService:{continue:async args=>{calls.push('sign-send');assert.equal(args.expectedVersion,emission.version);emission={...emission,state:'authorized',version:emission.version+2};return {ok:true,result:{...emission,emissionId,signed:true,persisted:true,submitted:true,transmitted:true}};}},
 };
 return {runtime,calls,getEmission:()=>emission,run:(changes={})=>runFiscalCheckout({runtime,context,input:{...input,...changes}})};
}

test('uma única ação valida, numera, assina e envia; não encerra como apenas preparada',async()=>{
 const f=fixture();const result=await f.run();assert.equal(result.ok,true);assert.equal(result.emission.authorized,true);assert.equal(result.emission.number,10);assert.deepEqual(f.calls,['open','validate','number','sign-send']);
 const repeat=await f.run();assert.equal(repeat.ok,true);assert.deepEqual(f.calls,['open','validate','number','sign-send']);
});

test('Salvar não prepara, numera, transmite nem altera financeiro/estoque',async()=>{
 for(const state of [undefined,'draft','prepared','number_reserved']){const f=fixture(state);const before=structuredClone(f.getEmission());const result=await f.run({action:'save'});assert.equal(result.ok,true);assert.deepEqual(f.calls,[]);assert.deepEqual(f.getEmission(),before);}
 const f=fixture();const result=await f.run({action:'save',draftId:undefined,originOrderId:orderId,expectedVersion:4});assert.equal(result.draftId,draftId);assert.deepEqual(f.calls,['persist-order']);
});

test('retoma no ponto salvo e reutiliza o número, sem criar emissão paralela',async()=>{
 for(const [state,expected]of [['draft',['validate','number','sign-send']],['prepared',['number','sign-send']],['number_reserved',['sign-send']],['signed',['sign-send']]]){const f=fixture(state);const result=await f.run();assert.equal(result.ok,true);assert.deepEqual(f.calls,expected);assert.equal(result.emission.number,10);}
});

test('notas já enviadas ou autorizadas nunca são retransmitidas; cancelamento fiscal é terminal',async()=>{
 for(const state of ['authorized','artifacts_stored','danfe_ready']){const f=fixture(state);assert.equal((await f.run()).ok,true);assert.deepEqual(f.calls,[]);}
 for(const state of ['submitted','processing']){const f=fixture(state);let consulted=0;f.runtime.reconcileFiscalEmission=async scope=>{assert.equal(scope.companyId,companyId);assert.equal(scope.emissionId,emissionId);consulted++;};const response=await f.run();assert.equal(response.ok,false);assert.equal(response.code,'AV-NFE-SUBMISSION-UNCONFIRMED');assert.equal(consulted,1);assert.deepEqual(f.calls,[]);}
 for(const state of ['canceled','rejected','failed']){const f=fixture(state);assert.equal((await f.run()).ok,false);assert.deepEqual(f.calls,[]);}
});

test('falha na validação impede numeração/envio; erro de transporte não perde a identidade',async()=>{
 const f=fixture('draft');f.runtime.nfePreparationService.prepare=async()=>({ok:false,errors:[{code:'NCM',message:'NCM inválido'}]});assert.equal((await f.run()).message,'NCM inválido');assert.deepEqual(f.calls,[]);
 const retry=fixture('number_reserved');const real=retry.runtime.nfeAutomaticIssuanceService.continue;retry.runtime.nfeAutomaticIssuanceService.continue=async()=>{throw Error('network');};assert.equal((await retry.run()).ok,false);assert.equal(retry.getEmission().number,10);retry.runtime.nfeAutomaticIssuanceService.continue=real;assert.equal((await retry.run()).ok,true);assert.deepEqual(retry.calls,['sign-send']);
});

test('resultado parcial, de outra emissão ou sem confirmação de transmissão nunca vira sucesso',async()=>{
 for(const result of [{emissionId,state:'prepared'}, {emissionId,state:'authorized',signed:true,persisted:true,submitted:true,transmitted:false}, {emissionId:orderId,state:'authorized',signed:true,persisted:true,submitted:true,transmitted:true}]){const f=fixture('number_reserved');f.runtime.nfeAutomaticIssuanceService.continue=async()=>({ok:true,result});assert.equal((await f.run()).ok,false);}
 const f=fixture('number_reserved');f.runtime.nfeAutomaticIssuanceService.continue=async()=>({ok:true,result:{emissionId,state:'rejected',version:5,series:'1',number:10,signed:true,persisted:true,submitted:true,transmitted:true,statusReason:'CFOP incompatível'}});const result=await f.run();assert.equal(result.ok,false);assert.equal(result.emission.state,'rejected');assert.equal(result.message,'CFOP incompatível');
});

test('perfil, permissões, tipo da nota e bloqueio de produção permanecem obrigatórios',async()=>{
 for(const changed of [{active:false},{moduleActive:false},{moduleId:'outro'},{effectivePermissions:{'fiscal.prepare':true}},{companyId:'invalid'}]){const f=fixture();assert.equal((await runFiscalCheckout({runtime:f.runtime,context:{...context,...changed},input})).ok,false);assert.deepEqual(f.calls,[]);}
 const foreign=fixture();foreign.runtime.fiscalDraftRepository.get=async()=>({companyId:actorId,documentType:'nfe'});assert.equal((await foreign.run()).ok,false);assert.deepEqual(foreign.calls,[]);
 for(const execution of [{environment:'producao',transmissionAllowed:true,productionTransmissionAllowed:false},{environment:'homologacao',transmissionAllowed:false,productionTransmissionAllowed:false}]){const f=fixture();f.runtime.fiscalExecution=execution;assert.equal((await f.run()).ok,false);assert.deepEqual(f.calls,[]);}
});

test('cancelar preparação local permite retomar; cancelamento fiscal real nunca permite',()=>{
 const draft={status:'Cancelado',checks:[{ready:true}]};assert.equal(canResumeFiscalDraft(draft),true);assert.equal(fiscalDraftForReview(draft).status,'Pronto para homologação');assert.equal(draft.status,'Cancelado');
 for(const state of ['canceled','authorized','processing','rejected'])assert.equal(canResumeFiscalDraft(draft,{state}),false);
 assert.equal(fiscalDraftForReview(draft,{state:'canceled'}).status,'Cancelado');
});

test('rota exige sessão real do mesmo módulo/perfil e limita o corpo antes de processar',async()=>{
 const req=(body=input,headers={})=>new Request(`https://avantalab.com.br/api/modulos/vendas/fiscal/checkout?companyId=${companyId}`,{method:'POST',body:JSON.stringify(body),headers});
 const f=fixture('prepared');const response=await handleFiscalCheckoutRequest({request:req({...input,action:'save',issuer:{document:'FORGED'},unitPrice:1}),runtime:f.runtime});assert.equal(response.status,200);assert.deepEqual(f.calls,[]);
 const oversized=await handleFiscalCheckoutRequest({request:req({padding:'x'.repeat(8001)}),runtime:f.runtime});assert.equal(oversized.status,413);
 for(const change of [{authenticated:false},{boundary:{source:'demo',authenticated:false}},{boundary:{source:'authenticated',authenticated:true,userId:actorId,companyId:actorId,moduleId:'vendas',userActive:true,membershipActive:true,companyActive:true,moduleActive:true}},{boundary:{source:'authenticated',authenticated:true,userId:actorId,companyId,moduleId:'outro',userActive:true,membershipActive:true,companyActive:true,moduleActive:true}}]){const f=fixture();const original=await f.runtime.accessResolver.resolve();f.runtime.accessResolver.resolve=async()=>({...original,...change});const response=await handleFiscalCheckoutRequest({request:req(),runtime:f.runtime});assert.ok([401,403].includes(response.status));assert.deepEqual(f.calls,[]);}
});

test('checkout integra com o serviço automático existente: preparar assinatura, assinar e transmitir',async()=>{
 const f=fixture('prepared');const stages=[];
 f.runtime.nfeAutomaticIssuanceService=createCommercialNfeAutomaticIssuanceService({
  emissionStateResolver:async()=>f.getEmission(),
  signingPreparationService:{prepare:async args=>{stages.push('signature-check');return {ok:true,result:{version:args.expectedVersion}};}},
  signingService:{sign:async args=>{stages.push('sign');return {ok:true,result:{emissionId,state:'signed',version:args.expectedVersion+1,series:'1',number:10,signed:true,persisted:true}};}},
  submissionService:{submit:async args=>{stages.push('send');return {ok:true,result:{emissionId,state:'processing',version:args.expectedVersion+1,series:'1',number:10}};}},
 });
 const result=await f.run();assert.equal(result.ok,false);assert.equal(result.code,'AV-NFE-SUBMISSION-UNCONFIRMED');assert.equal(result.emission.processing,true);assert.deepEqual(stages,['signature-check','sign','send']);assert.deepEqual(f.calls,['number']);
});


test('Salvar e emitir resolve consulta 217 internamente e segue no mesmo clique com o mesmo número',async()=>{
 const f=fixture('submitted');
 f.runtime.reconcileFiscalEmission=async()=>{f.calls.push('conferencia-interna');Object.assign(f.getEmission(),{state:'signed',statusCode:'217',version:3});};
 const result=await f.run();assert.equal(result.ok,true);assert.equal(result.emission.number,10);assert.deepEqual(f.calls,['conferencia-interna','sign-send']);
 const uncertain=fixture('submitted');uncertain.runtime.reconcileFiscalEmission=async()=>uncertain.calls.push('conferencia-interna');
 assert.equal((await uncertain.run()).ok,false);assert.deepEqual(uncertain.calls,['conferencia-interna']);
});


test('rejeição técnica 588 é corrigida ao confirmar emissão, sem pedir dados fiscais nem reservar outro número',async()=>{
 const f=fixture('rejected');Object.assign(f.getEmission(),{statusCode:'588'});
 f.runtime.nfeRejectionCorrectionService={prepare:async args=>{f.calls.push('repair-format');assert.equal(args.rejectedStatusCode,'588');assert.equal(args.expectedVersion,2);assert.equal(args.correctedDraft,undefined);assert.equal(args.changes,undefined);Object.assign(f.getEmission(),{state:'number_reserved',version:4,statusCode:''});return{ok:true};}};
 assert.equal((await f.run()).ok,true);assert.deepEqual(f.calls,['repair-format','sign-send']);assert.equal(f.getEmission().number,10);
 const saved=fixture('rejected');Object.assign(saved.getEmission(),{statusCode:'588'});saved.runtime.nfeRejectionCorrectionService={prepare:async()=>{throw Error('Salvar não deve corrigir ou enviar');}};assert.equal((await saved.run({action:'save'})).ok,true);assert.deepEqual(saved.calls,[]);
 const other=fixture('rejected');Object.assign(other.getEmission(),{statusCode:'778'});other.runtime.nfeRejectionCorrectionService={prepare:async()=>{throw Error('Não corrigir outra rejeição automaticamente');}};assert.equal((await other.run()).ok,false);assert.deepEqual(other.calls,[]);
});


test('checkout de produção preserva emissão e bloqueia rascunho de outro ambiente', async () => {
 const f=fixture();
 f.runtime.fiscalExecution={environment:'producao',transmissionAllowed:true,productionTransmissionAllowed:true};
 assert.equal((await f.run()).message,'NF-e autorizada pela SEFAZ.');
 assert.equal((await f.run()).ok,true);
 assert.deepEqual(f.calls,['open','validate','number','sign-send']);
 const legacy=fixture('prepared');
 Object.assign(legacy.getEmission(),{environment:'homologacao'});
 legacy.runtime.fiscalExecution=f.runtime.fiscalExecution;
 assert.equal((await legacy.run()).code,'AV-FISCAL-CHECKOUT-ENVIRONMENT');
 assert.equal((await legacy.run({action:'save'})).ok,true);
 assert.deepEqual(legacy.calls,[]);
});

test('produção não retransmite depois de retorno incerto ou consulta 217', async () => {
 const f=fixture('submitted');
 Object.assign(f.getEmission(),{environment:'producao',series:'2',number:1});
 f.runtime.fiscalExecution={environment:'producao',transmissionAllowed:true,productionTransmissionAllowed:true};
 f.runtime.reconcileFiscalEmission=async()=>f.calls.push('consulta');
 const uncertain=await f.run();
 assert.equal(uncertain.code,'AV-NFE-SUBMISSION-UNCONFIRMED');
 assert.equal(uncertain.emission.number,1);
 f.runtime.reconcileFiscalEmission=async()=>{
  f.calls.push('consulta');
  Object.assign(f.getEmission(),{state:'signed',statusCode:'217',version:3});
 };
 const retried=await f.run();
 assert.equal(retried.code,'AV-NFE-SUBMISSION-UNCONFIRMED');
 assert.equal(retried.emission.number,1);
 assert.equal((await f.run()).code,'AV-NFE-SUBMISSION-UNCONFIRMED');
 assert.deepEqual(f.calls,['consulta','consulta']);
});
