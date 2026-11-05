import assert from 'node:assert/strict';
import test from 'node:test';
import { dceFromProvider,nfeFromProvider,mergeFiscalConfirmation,fiscalWithOperation,legacyDce,fiscalStateText } from '../../app/modules/marketplaces/fiscal-state.ts';
import { labelUnavailableText, canIssueDce } from '../../app/modules/marketplaces/sales-status.ts';
import { inspectNfeXml } from '../../app/modules/marketplaces/services/nfe-xml.ts';
const at='2026-10-26T14:00:00Z';
test('404 não vira ausência; falha de leitura preserva recibo, documento e rejeição individual',()=>{
 const known={status:'completed',receiptId:'receipt',requestedAt:at,documents:[{id:'doc',status:'authorized',type:'NFe',formats:['pdf']}]};
 const merged=mergeFiscalConfirmation(known,{status:'unknown',documents:[],query:{checkedAt:at,ok:false,httpStatus:404}});
 assert.equal(merged.status,'completed');assert.equal(merged.receiptId,'receipt');assert.equal(merged.documents.length,1);assert.match(fiscalStateText('DC-e',merged),/não comprova ausência/);
 const rejected=dceFromProvider({status:'completed',sub_status:'issued',documents:[{dce_key:'doc',status:'rejected',error:{code:'539'},files:[{format:'pdf',location:'https://untrusted.example'}]}]},at);
 assert.equal(rejected.status,'rejected');assert.equal(rejected.documents[0].errorCode,'539');assert.equal(JSON.stringify(rejected).includes('https://'),false);
 assert.equal(legacyDce({status:'not_requested'}).status,'unknown');
 assert.equal(mergeFiscalConfirmation(known,{status:'pending',documents:[],query:{checkedAt:at,ok:true}}).status,'completed');
});
test('reserva sem recibo bloqueia; recusa definitiva libera nova tentativa; documento rejeitado exige revisão',()=>{
 const sending=fiscalWithOperation(null,{state:'sending',created_at:at});assert.equal(sending.status,'uncertain');assert.equal(sending.requestedAt,at);
 const rejected=fiscalWithOperation(null,{state:'rejected',http_status:400,error_code:'invalid_parameter',created_at:at});assert.equal(rejected.retryAllowed,true);assert.equal(rejected.requestedAt,undefined);
 const sale={status:'paid',shipmentStatus:'ready_to_ship',shipmentSubstatus:'invoice_pending',labelStatus:'unavailable',fiscal:{dce:rejected,nfe:{status:'unknown',documents:[]}}};assert.equal(canIssueDce(sale),true);
 sale.fiscal.dce={status:'rejected',documents:[]};assert.equal(canIssueDce(sale),false);
 const nfe=nfeFromProvider({id:123,status:'authorized',attributes:{xml_location:'/fixed',danfe_location:'/fixed'}},at);assert.deepEqual(nfe.documents[0].formats,['pdf','xml']);
});
test('buffering preserva dia civil à meia-noite UTC, sem mudar horários reais nem prazo de despacho',()=>{
 const sale={status:'paid',shipmentStatus:'pending',shipmentSubstatus:'buffered',labelStatus:'unavailable'};
 for(const date of ['2026-10-27','2026-10-27T00:00:00.000Z','2026-10-27T00:00:00+00:00'])assert.match(labelUnavailableText({...sale,labelReleaseAt:date}),/27\/10\/2026/);
 assert.match(labelUnavailableText({...sale,labelReleaseAt:'2026-10-27T01:30:00Z'}),/26\/10\/2026/);
});
const key='3'.repeat(44), issuer='1'.repeat(14);
const xml=`<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe${key}"><ide><mod>55</mod><tpAmb>1</tpAmb></ide><emit><CNPJ>${issuer}</CNPJ></emit></infNFe><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"/></NFe><protNFe><infProt><tpAmb>1</tpAmb><cStat>100</cStat><chNFe>${key}</chNFe></infProt></protNFe></nfeProc>`;
test('importação estrutural exige modelo 55 autorizado, produção, namespace e protocolo correspondente; bloqueia XXE',()=>{
 assert.deepEqual(inspectNfeXml(xml),{key,issuer});
 for(const invalid of [xml.replace('<mod>55','<mod>65'),xml.replace('<tpAmb>1','<tpAmb>2'),xml.replace('<cStat>100','<cStat>539'),xml.replace(`Id="NFe${key}"`,'Id="NFeother"'),xml.replace('http://www.portalfiscal.inf.br/nfe','https://evil.invalid'),`<!DOCTYPE nfeProc [<!ENTITY x SYSTEM "file:///etc/passwd">]>${xml}`,xml.slice(0,-5),'x'.repeat(2*1024*1024+1)])assert.throws(()=>inspectNfeXml(invalid));
});
