import test from 'node:test';
import assert from 'node:assert/strict';
import {createSyntheticNfeOrchestratorLab} from '../../app/vendas/scripts/verificar-orquestrador-nfe-local.mjs';
import {buildNfeAuthorizationSoapRequest} from '../../app/vendas/lib/server/nfe-authorization-service.mjs';
import {nfeTransportDiagnostic} from '../../app/vendas/lib/server/nfe-transport-diagnostic.mjs';

test('uma NF-e exige resposta síncrona; diagnóstico de transporte contém somente código e status permitidos',()=>{
 const result=buildNfeAuthorizationSoapRequest({signedXml:'invalid',lotId:'1',synchronous:false});assert.equal(result.valid,false);assert.ok(result.errors.some(item=>item.code==='AV-NFE-AUTH-SYNCHRONOUS-REQUIRED'));
 assert.deepEqual(nfeTransportDiagnostic({code:'HTTP_STATUS',httpStatus:403,message:'password=private',signedXml:'private'}),{transportErrorCode:'HTTP_STATUS',httpStatus:403});
 assert.deepEqual(nfeTransportDiagnostic({code:'UNABLE_TO_VERIFY_LEAF_SIGNATURE',httpStatus:999}),{transportErrorCode:'UNABLE_TO_VERIFY_LEAF_SIGNATURE',httpStatus:0});
 assert.deepEqual(nfeTransportDiagnostic({code:'PRIVATE_DATA',message:'secret'}),{transportErrorCode:'CONNECTION_FAILED',httpStatus:0});
});

function soap(body) {
  return `<?xml version="1.0"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body>${body}</soap:Body></soap:Envelope>`;
}

function protocolAuthorizedResponse(accessKey) {
  return soap(`<retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cUF>35</cUF><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo><chNFe>${accessKey}</chNFe><protNFe versao="4.00"><infProt><tpAmb>2</tpAmb><chNFe>${accessKey}</chNFe><dhRecbto>2026-09-04T12:00:03-03:00</dhRecbto><nProt>135260000000001</nProt><digVal>SINTETICO</digVal><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe></retConsSitNFe>`);
}

for (const legacy of [false,true]) test(`consulta preserva a versão imutável e entrega XML/DANFE${legacy ? ' com metadado legado incompleto' : ''}`,async()=>{
 const lab=await createSyntheticNfeOrchestratorLab({authorizationResponder:async()=>{throw new Error('Timeout sintético');},returnResponder:async({accessKey})=>protocolAuthorizedResponse(accessKey)});
 try {
  assert.equal((await lab.continueEmission()).pendingRecovery,true);
  assert.equal((await lab.runRecoveryOnce()).completed,1);
  const protocol=[...lab.repository.state.artifacts.values()].find(artifact=>artifact.artifactType==='protocol_xml');
  assert.match(protocol.storageVersion,/^[a-f0-9]{64}$/);assert.equal(protocol.storageVersion,protocol.checksum);
  if(legacy)protocol.storageVersion='';
  await lab.runRecoveryOnce();await lab.runRecoveryOnce();
  assert.equal(lab.snapshot().state,'danfe_ready');assert.deepEqual(await lab.inspectFinalArtifacts(),{processed:true,danfe:true,contentReturned:false});
  assert.equal(lab.metrics.syntheticAuthorizationCalls,1);assert.equal(lab.metrics.externalNetworkCalls,0);
 }finally{await lab.cleanup();}
});
