import test from 'node:test';
import assert from 'node:assert/strict';
import {createSyntheticNfeOrchestratorLab} from '../../app/vendas/scripts/verificar-orquestrador-nfe-local.mjs';
import {createFiscalEmissionLifecycleService} from '../../app/vendas/lib/server/fiscal-emission-lifecycle.mjs';
import {fiscalNoteResult} from '../../app/vendas/lib/fiscal-note-result.mjs';

const soap=body=>`<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body>${body}</s:Body></s:Envelope>`;
const absent=key=>soap(`<retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cUF>35</cUF><cStat>217</cStat><xMotivo>Rejeição: NF-e não consta na base de dados da SEFAZ</xMotivo><chNFe>${key}</chNFe></retConsSitNFe>`);
const authorized=key=>soap(`<retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cUF>35</cUF><cStat>104</cStat><xMotivo>Lote processado</xMotivo><protNFe versao="4.00"><infProt><tpAmb>2</tpAmb><chNFe>${key}</chNFe><dhRecbto>2026-09-04T12:00:03-03:00</dhRecbto><nProt>135260000000001</nProt><digVal>SINTETICO</digVal><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe></retEnviNFe>`);

test('217 consultado encerra a incerteza, preserva XML/número e exige nova ação explícita para enviar',async()=>{
 const lab=await createSyntheticNfeOrchestratorLab({authorizationResponder:async({call,accessKey})=>{if(call===1)throw new Error('Timeout sintético');return authorized(accessKey);},returnResponder:async({accessKey})=>absent(accessKey)});
 try{
  await lab.continueEmission();const original=structuredClone([...lab.repository.state.emissions.values()][0]);
  const signed=structuredClone([...lab.repository.state.artifacts.values()].find(a=>a.artifactType==='signed_xml'));
  assert.equal((await lab.runRecoveryOnce()).completed,1);
  const resumed=[...lab.repository.state.emissions.values()][0];
  assert.equal(resumed.state,'signed');assert.equal(resumed.statusCode,'217');
  for(const field of ['accessKey','number','series','reservationId','signedChecksum'])assert.equal(resumed[field],original[field]);
  assert.deepEqual([...lab.repository.state.artifacts.values()].find(a=>a.artifactType==='signed_xml'),signed);
  assert.equal(lab.snapshot().attempts,1);assert.equal(lab.metrics.syntheticAuthorizationCalls,1);
  assert.equal(fiscalNoteResult((await lab.getStatus()).emission).retryAvailable,true);
  assert.equal((await lab.continueEmission({expectedVersion:resumed.version,idempotencyKey:'nova-acao-explicita-apos-consulta-217'})).ok,true);
  await lab.runRecoveryOnce();await lab.runRecoveryOnce();
  assert.equal(lab.snapshot().state,'danfe_ready');assert.equal(lab.snapshot().attempts,2);assert.equal(lab.metrics.externalNetworkCalls,0);
 }finally{await lab.cleanup();}
});

test('retomada bloqueia resposta incerta, outra chave/empresa/versão, autorização e alteração genérica de estado',async()=>{
 const lab=await createSyntheticNfeOrchestratorLab({authorizationResponder:async()=>{throw new Error('Timeout sintético');}});
 try{
  await lab.continueEmission();const current=[...lab.repository.state.emissions.values()][0];
  const service=createFiscalEmissionLifecycleService({repository:lab.repository});
  const query={valid:true,networkAttempted:true,responseReceived:true,kind:'protocol',status:'217',environment:'2',stateCode:'35',queriedAccessKey:current.accessKey,requestedAccessKey:current.accessKey,reason:'Não consta na base',authorized:false,canceled:false,protocolStatus:'',protocolNumber:''};
  const input={companyId:current.companyId,emissionId:current.id,expectedVersion:current.version,operationKey:'consulta-217-prova-001',query};
  for(const patch of [{valid:false},{networkAttempted:false},{status:'108'},{status:'100'},{environment:'1'},{stateCode:'43'},{queriedAccessKey:'35'+'9'.repeat(42)},{requestedAccessKey:'35'+'9'.repeat(42)},{protocolNumber:'123'},{authorized:true}])assert.equal((await service.resumeUnreceivedSubmission({...input,query:{...query,...patch}})).ok,false);
  assert.equal((await service.resumeUnreceivedSubmission({...input,companyId:'outra-empresa'})).ok,false);
  assert.equal((await service.resumeUnreceivedSubmission({...input,expectedVersion:current.version-1})).ok,false);
  assert.equal((await service.transition({...input,toState:'signed'})).ok,false);
  assert.equal(lab.snapshot().state,'submitted');assert.equal(lab.snapshot().attempts,1);
 }finally{await lab.cleanup();}
});
