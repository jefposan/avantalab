import test from 'node:test';import assert from 'node:assert/strict';
import {createSyntheticNfeOrchestratorLab} from '../../app/vendas/scripts/verificar-orquestrador-nfe-local.mjs';
import {runFiscalCheckout} from '../../app/vendas/lib/server/fiscal-checkout.mjs';
import {fiscalValidationTarget} from '../../app/vendas/lib/fiscal-validation.mjs';
test('retorno de comunicação/217 não transforma o número preservado em campo inválido',()=>{for(const code of ['AV-NFE-NOT-RECEIVED','AV-NFE-SUBMISSION-PENDING','AV-NFE-SUBMISSION-DUPLICATE-539'])assert.equal(fiscalValidationTarget({code,field:'authorization',message:'A SEFAZ não recebeu a nota. O mesmo número foi preservado.'}),'');assert.equal(fiscalValidationTarget({field:'numbering',message:'Configure o número'}),'series');});
test('204/539 preservam o retorno individual da SEFAZ e não inventam autorização',async()=>{for(const code of ['204','539']){const lab=await createSyntheticNfeOrchestratorLab({authorizationResponder:async({accessKey})=>`<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body><retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cUF>35</cUF><cStat>104</cStat><xMotivo>Lote processado</xMotivo><protNFe versao="4.00"><infProt><tpAmb>2</tpAmb><chNFe>${accessKey}</chNFe><cStat>${code}</cStat><xMotivo>Duplicidade sintética com diferença na chave</xMotivo></infProt></protNFe></retEnviNFe></s:Body></s:Envelope>`});try{const result=await lab.continueEmission();assert.equal(result.ok,false);assert.equal(result.pendingRecovery,true);assert.equal(result.errors[0].code,`AV-NFE-SUBMISSION-DUPLICATE-${code}`);assert.match(result.errors[0].message,/Duplicidade sintética/);assert.equal(lab.metrics.syntheticAuthorizationCalls,1);assert.equal(lab.metrics.externalNetworkCalls,0);assert.notEqual(lab.snapshot().state,'authorized');}finally{await lab.cleanup();}}});
test('checkout não substitui duplicidade do envio por 217 da consulta; autorização confirmada prevalece',async()=>{
 const companyId='10000000-0000-4000-8000-000000000001',actorId='10000000-0000-4000-8000-000000000002',draftId='10000000-0000-4000-8000-000000000003';
 let emission={id:draftId,state:'signed',statusCode:'217',series:'1',number:1,version:8};const runtime={fiscalExecution:{environment:'homologacao',transmissionAllowed:true,productionTransmissionAllowed:false},fiscalDraftRepository:{get:async()=>({id:draftId,companyId,documentType:'nfe',emission})},nfeAutomaticIssuanceService:{continue:async()=>({ok:false,pendingRecovery:true,errors:[{code:'AV-NFE-SUBMISSION-DUPLICATE-539',field:'authorization',message:'SEFAZ 539: diferença de chave'}]})}};const context={companyId,actorId,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'fiscal.prepare':true,'fiscal.issue':true}};
 let result=await runFiscalCheckout({runtime,context,input:{action:'issue',draftId,idempotencyKey:'test:duplicate:original'}});assert.equal(result.ok,false);assert.equal(result.code,'AV-NFE-SUBMISSION-DUPLICATE-539');assert.match(result.message,/539/);assert.equal(result.emission.number,1);
 runtime.nfeAutomaticIssuanceService.continue=async()=>({ok:false,pendingRecovery:true,errors:[{code:'AV-NFE-AUTH-RESPONSE-PROTOCOL',field:'response.protNFe',message:'Lote processado sem resultado individual válido'}]});result=await runFiscalCheckout({runtime,context,input:{action:'issue',draftId,idempotencyKey:'test:original:xml-response'}});assert.equal(result.code,'AV-NFE-AUTH-RESPONSE-PROTOCOL');assert.match(result.message,/resultado individual/);assert.equal(fiscalValidationTarget(result),'');
 runtime.nfeAutomaticIssuanceService.continue=async()=>{emission={...emission,state:'authorized',version:9};return {ok:false,pendingRecovery:true,errors:[{code:'AV-NFE-SUBMISSION-DUPLICATE-204'}]};};result=await runFiscalCheckout({runtime,context,input:{action:'issue',draftId,idempotencyKey:'test:duplicate:authorized'}});assert.equal(result.ok,true);assert.equal(result.emission.authorized,true);
});

test('checkout de produção envia NF-e assinada pelo transporte simulado e recupera XML e DANFE', async () => {
 const lab=await createSyntheticNfeOrchestratorLab({environment:'producao',startPrepared:true});
 try {
  const result=await lab.checkout();
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(result.emission.series,'2');
  assert.equal(result.emission.number,1);
  for (let step=0;step<3;step++) await lab.runRecoveryOnce();
  assert.equal(lab.snapshot().state,'danfe_ready',JSON.stringify(lab.snapshot()));
  assert.equal((await lab.checkout()).ok,true);
  assert.equal(lab.reservations,1);
  assert.equal(lab.snapshot().attempts,1);
  assert.equal(lab.metrics.syntheticAuthorizationCalls,1);
  assert.equal(lab.metrics.externalNetworkCalls,0);
 } finally { await lab.cleanup(); }
});
