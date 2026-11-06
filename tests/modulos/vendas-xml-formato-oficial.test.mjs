import {buildCommercialNfePreparationInput} from '../../app/vendas/lib/server/commercial-nfe-preparation.mjs';
import {buildUnsignedNfeSpXml,prototypeDraftToNfeSpXmlInput} from '../../app/vendas/lib/nfe-sp-xml.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,verify,X509Certificate} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {DOMParser,XMLSerializer} from '@xmldom/xmldom';
import {validateNfeXmlAgainstXsd} from '../../app/vendas/lib/server/nfe-xsd-validator.mjs';
import {createSyntheticNfeOrchestratorLab} from '../../app/vendas/scripts/verificar-orquestrador-nfe-local.mjs';
import {verifyProtectedSignedNfeXml} from '../../app/vendas/lib/server/nfe-signature-lab.mjs';
import {buildNfeAuthorizationSoapRequest} from '../../app/vendas/lib/server/nfe-authorization-service.mjs';
import {createCommercialNfeRejectionCorrectionService,NFE_REJECTION_CORRECTION_CONFIRMATION} from '../../app/vendas/lib/server/commercial-nfe-rejection-correction.mjs';

const DS='http://www.w3.org/2000/09/xmldsig#';
// Verificador independente: resolve os namespaces herdados na árvore completa,
// em vez de repetir a extração/injeção de namespace usada pelo assinador.
function canonicalInDocument(node) {
 const copy=node.cloneNode(true),namespaces=new Map();
 for(let ancestor=node;ancestor?.nodeType===1;ancestor=ancestor.parentNode){
  for(let i=0;i<ancestor.attributes.length;i++){const attr=ancestor.attributes.item(i);if((attr.name==='xmlns'||attr.name.startsWith('xmlns:'))&&!namespaces.has(attr.name))namespaces.set(attr.name,attr.value);}
 }
 for(const [name,value]of namespaces)copy.setAttribute(name,value);
 return execFileSync('/usr/bin/xmllint',['--nonet','--c14n','-'],{input:new XMLSerializer().serializeToString(copy)});
}

test('NF-e e envelope não contêm edição; digest, assinatura no documento completo e XSD continuam válidos',async()=>{
 const lab=await createSyntheticNfeOrchestratorLab();
 try{
  const a=[...lab.repository.state.artifacts.values()].find(x=>x.artifactType==='signed_xml');
  const loaded=await lab.storage.readByReference({accessKey:lab.accessKey,storageReference:a.storageReference,storageVersion:a.storageVersion,contentType:'application/xml',expectedChecksum:a.checksum});
  const xml=new TextDecoder().decode(loaded.content),doc=new DOMParser().parseFromString(xml,'application/xml');
  assert.doesNotMatch(xml,/[\r\n\t]|>[ ]+</);assert.doesNotMatch(xml,/<ds:/);
  const info=doc.getElementsByTagName('infNFe')[0],signedInfo=doc.getElementsByTagNameNS(DS,'SignedInfo')[0];
  const digest=doc.getElementsByTagNameNS(DS,'DigestValue')[0].textContent;
  assert.equal(createHash('sha1').update(canonicalInDocument(info)).digest('base64'),digest);
  const cert=new X509Certificate(Buffer.from(doc.getElementsByTagNameNS(DS,'X509Certificate')[0].textContent,'base64'));
  assert.equal(verify('RSA-SHA1',canonicalInDocument(signedInfo),cert.publicKey,Buffer.from(doc.getElementsByTagNameNS(DS,'SignatureValue')[0].textContent,'base64')),true);
  const verification=await verifyProtectedSignedNfeXml(xml,lab.accessKey.slice(6,20));assert.equal(verification.valid,true);assert.equal(verification.signedXsdValid,true);
  const unsigned=xml.replace(/<Signature\b[\s\S]*?<\/Signature>/,'');const unsignedBefore=unsigned;
  const unsignedSchema=await validateNfeXmlAgainstXsd(unsigned);assert.equal(unsignedSchema.valid,true,JSON.stringify(unsignedSchema.errors));assert.equal(unsignedSchema.executed,true);assert.equal(unsigned,unsignedBefore);assert.doesNotMatch(unsigned,/<Signature\b/);
  const formattedUnsigned=unsigned.replace(/></g,'>\n<');const formattedSchema=await validateNfeXmlAgainstXsd(formattedUnsigned);assert.equal(formattedSchema.valid,true);
  const invalidUnsigned=await validateNfeXmlAgainstXsd(unsigned.replace(/<NCM>[^<]*<\/NCM>/,''));assert.equal(invalidUnsigned.executed,true);assert.equal(invalidUnsigned.valid,false);
  const missingRoot=await validateNfeXmlAgainstXsd(unsigned.replace(/<\/NFe>$/, '</Nota>'));assert.equal(missingRoot.valid,false);assert.ok(missingRoot.errors.some(error=>error.code==='AV-NFE-XSD-ROOT'));
  const request=buildNfeAuthorizationSoapRequest({signedXml:xml,lotId:'1'});assert.equal(request.valid,true);assert.doesNotMatch(request.envelope,/[\r\n\t]|>[ ]+</);
  const altered=xml.replace('</ide>','</ide>\n');const blocked=buildNfeAuthorizationSoapRequest({signedXml:altered,lotId:'1'});assert.equal(blocked.valid,false);assert.ok(blocked.errors.some(e=>e.code==='AV-NFE-AUTH-XML-FORMAT'));
 }finally{await lab.cleanup();}
});

test('correção 588 regenera os mesmos retratos e reutiliza o número; não inventa correção para outra rejeição',async()=>{
 const id='10000000-0000-4000-8000-000000000001',company='20000000-0000-4000-8000-000000000001',establishment='30000000-0000-4000-8000-000000000001';
 const draft={id,companyId:company,operationId:id,originType:'avulsa',documentType:'nfe',status:'pronto',issuerSnapshot:{establishmentId:establishment,document:'12345678000195',legalName:'Empresa Sintetica Ltda',stateRegistration:'110042490114',taxRegime:'Simples Nacional',state:'SP',city:'São Paulo',cityCode:'3550308',postalCode:'01001000',street:'Rua do Comercio',number:'100',district:'Centro'},customerSnapshot:{document:'11144477735',displayName:'Cliente',consumerFinal:true,address:{street:'Rua da Penha',number:'388',district:'Centro',city:'Sorocaba',cityCode:'3552205',state:'SP',postalCode:'18010160'}},itemsSnapshot:[{sku:'A',name:'Produto',unit:'UN',quantity:1,unitPrice:10,unitDiscount:0,fiscal:{ncm:'33059000',cfop:'5102',origin:'0',csosn:'102',pisCst:'49',cofinsCst:'49'}}],totalsSnapshot:{total:10,subtotalGross:10,itemDiscount:0,generalDiscount:0,freight:0,insurance:0,otherExpenses:0},paymentSnapshot:{method:'Pix',amount:10}};
 let emission={id,companyId:company,establishmentId:establishment,draftId:id,originId:id,documentType:'nfe',model:'55',environment:'homologacao',state:'rejected',statusCode:'588',version:6,reservationId:'reserved',series:'1',number:1};let writes=0;
 const data={draft,emission,baseIssuerDocument:draft.issuerSnapshot.document,reservation:{id:'reserved',companyId:company,establishmentId:establishment,emissionId:id,documentType:'nfe',status:'reserved',series:'1',number:1},numberingLedger:{sequences:[{documentType:'nfe',series:'1',nextNumber:2,lastReservedNumber:1,active:true}],reservations:[{id:'reserved',draftId:id,documentType:'nfe',series:'1',number:1,status:'reserved'}],voidRequests:[],audit:[]}};
 const original=structuredClone(draft),events=[];
 const service=createCommercialNfeRejectionCorrectionService({repository:{load:async()=>data,findByOperation:async()=>null,save:async input=>{writes++;for(const field of ['issuerSnapshot','customerSnapshot','itemsSnapshot','totalsSnapshot','paymentSnapshot'])assert.deepEqual(input.draft[field],original[field]);return{revision:1,correctionDigest:input.correctionDigest};}},emissionLifecycle:{transition:async input=>{assert.equal(input.expectedVersion,emission.version);emission={...emission,...input.patch,state:input.toState,version:emission.version+1};events.push(input);return{ok:true,emission};}},fiscalRuleResolver:async()=>({valid:true,items:{},operationNature:'Venda de mercadoria',presence:'Não presencial',matrixReviewConfirmed:true,taxReviewConfirmed:true,taxReformReviewConfirmed:true})});
 const context={companyId:company,actorId:establishment,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'fiscal.prepare':true}};
 const input={context,emissionId:id,expectedVersion:6,idempotencyKey:'repair-format-588-001',rejectedStatusCode:'588',confirmation:NFE_REJECTION_CORRECTION_CONFIRMATION};
 const result=await service.prepare(input);assert.equal(result.ok,true,JSON.stringify(result.errors));assert.equal(emission.state,'number_reserved');assert.equal(emission.number,1);assert.equal(emission.series,'1');assert.equal(writes,1);assert.ok(events.every(e=>e.publicPayload.automaticTransmission===false));
 assert.equal((await service.prepare({...input,rejectedStatusCode:'778'})).ok,false);assert.equal(writes,1);assert.deepEqual(draft,original);
});

test('nota 391 salva pagamento explícito, prepara XML com PIX estático e preserva numeração e origem',async()=>{
 const id='10000000-0000-4000-8000-000000000001',company='20000000-0000-4000-8000-000000000001',establishment='30000000-0000-4000-8000-000000000001';
 const draft={id,companyId:company,operationId:id,originType:'avulsa',documentType:'nfe',status:'pronto',issuerSnapshot:{establishmentId:establishment,document:'12345678000195',legalName:'Empresa Sintetica Ltda',stateRegistration:'110042490114',taxRegime:'Simples Nacional',state:'SP',city:'São Paulo',cityCode:'3550308',postalCode:'01001000',street:'Rua do Comercio',number:'100',district:'Centro'},customerSnapshot:{document:'11144477735',displayName:'Cliente',consumerFinal:true,address:{street:'Rua da Penha',number:'388',district:'Centro',city:'Sorocaba',cityCode:'3552205',state:'SP',postalCode:'18010160'}},itemsSnapshot:[{sku:'A',name:'Produto',unit:'UN',quantity:1,unitPrice:10,unitDiscount:0,fiscal:{ncm:'33059000',cfop:'5102',origin:'0',csosn:'102',pisCst:'49',cofinsCst:'49'}}],totalsSnapshot:{total:10,subtotalGross:10,itemDiscount:0,generalDiscount:0,freight:0,insurance:0,otherExpenses:0},paymentSnapshot:{method:'Pix',amount:10}};
 let emission={id,companyId:company,establishmentId:establishment,draftId:id,originId:id,documentType:'nfe',model:'55',environment:'homologacao',state:'rejected',statusCode:'391',version:6,reservationId:'reserved',series:'1',number:1};let writes=0,revised;
 const data={draft,emission,baseIssuerDocument:draft.issuerSnapshot.document,reservation:{id:'reserved',companyId:company,establishmentId:establishment,emissionId:id,documentType:'nfe',status:'reserved',series:'1',number:1},numberingLedger:{sequences:[{documentType:'nfe',series:'1',nextNumber:2,lastReservedNumber:1,active:true}],reservations:[{id:'reserved',draftId:id,documentType:'nfe',series:'1',number:1,status:'reserved'}],voidRequests:[],audit:[]}};
 const original=structuredClone(draft),events=[];
 const service=createCommercialNfeRejectionCorrectionService({repository:{load:async()=>data,findByOperation:async()=>null,save:async input=>{writes++;revised=input.draft;assert.deepEqual(revised.issuerSnapshot,original.issuerSnapshot);assert.deepEqual(revised.customerSnapshot.address,original.customerSnapshot.address);assert.equal(revised.paymentSnapshot.method,'PIX estático');assert.equal(revised.totalsSnapshot.total,20);return{revision:1,correctionDigest:input.correctionDigest};}},emissionLifecycle:{transition:async input=>{assert.equal(input.expectedVersion,emission.version);emission={...emission,...input.patch,state:input.toState,version:emission.version+1};events.push(input);return{ok:true,emission};}},fiscalRuleResolver:async()=>({valid:true,items:{},operationNature:'Venda de mercadoria',presence:'Não presencial',matrixReviewConfirmed:true,taxReviewConfirmed:true,taxReformReviewConfirmed:true})});
 const context={companyId:company,actorId:establishment,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'fiscal.prepare':true}};
 const input={context,emissionId:id,expectedVersion:6,idempotencyKey:'repair-format-588-001',rejectedStatusCode:'391',confirmation:NFE_REJECTION_CORRECTION_CONFIRMATION,changes:{note:{customerName:'Cliente',customerDocument:'11144477735',paymentMethod:'PIX estático',items:[{sku:'A',quantity:2,unitPrice:10,unitDiscount:0,ncm:'33059000',cfop:'5102'}],freight:0,insurance:0,otherExpenses:0,generalDiscount:0}}};
 const result=await service.prepare(input);assert.equal(result.ok,true,JSON.stringify(result.errors));assert.equal(emission.state,'number_reserved');assert.equal(emission.number,1);assert.equal(emission.series,'1');assert.equal(writes,1);assert.ok(events.every(e=>e.publicPayload.automaticTransmission===false));
 assert.equal((await service.prepare({...input,rejectedStatusCode:'778'})).ok,false);assert.equal(writes,1);assert.deepEqual(draft,original);
 const rules={operationNature:'Venda de mercadoria',matrixReviewConfirmed:true,taxReviewConfirmed:true,taxReformReviewConfirmed:true};const mapped=buildCommercialNfePreparationInput({...data,draft:revised},rules,'note-edit-391-test','2026-11-05T12:00:00-03:00');const xml=buildUnsignedNfeSpXml(prototypeDraftToNfeSpXmlInput({...mapped,draft:{...mapped.draft,series:'1'},config:{...mapped.config,testDocumentNumber:'1',testNumericCode:'12345678'}}));assert.equal(xml.valid,true,JSON.stringify(xml.errors));assert.match(xml.xml,/<tPag>20<\/tPag>/);
});

test('nota 391 com PIX dinâmico mantém pagamento e inclui dados reais informados no grupo eletrônico',async()=>{
 const id='10000000-0000-4000-8000-000000000001',company='20000000-0000-4000-8000-000000000001',establishment='30000000-0000-4000-8000-000000000001';
 const draft={id,companyId:company,operationId:id,originType:'avulsa',documentType:'nfe',status:'pronto',issuerSnapshot:{establishmentId:establishment,document:'12345678000195',legalName:'Empresa Sintetica Ltda',stateRegistration:'110042490114',taxRegime:'Simples Nacional',state:'SP',city:'São Paulo',cityCode:'3550308',postalCode:'01001000',street:'Rua do Comercio',number:'100',district:'Centro'},customerSnapshot:{document:'11144477735',displayName:'Cliente',consumerFinal:true,address:{street:'Rua da Penha',number:'388',district:'Centro',city:'Sorocaba',cityCode:'3552205',state:'SP',postalCode:'18010160'}},itemsSnapshot:[{sku:'A',name:'Produto',unit:'UN',quantity:1,unitPrice:10,unitDiscount:0,fiscal:{ncm:'33059000',cfop:'5102',origin:'0',csosn:'102',pisCst:'49',cofinsCst:'49'}}],totalsSnapshot:{total:10,subtotalGross:10,itemDiscount:0,generalDiscount:0,freight:0,insurance:0,otherExpenses:0},paymentSnapshot:{method:'Pix',amount:10}};
 let emission={id,companyId:company,establishmentId:establishment,draftId:id,originId:id,documentType:'nfe',model:'55',environment:'homologacao',state:'rejected',statusCode:'391',version:6,reservationId:'reserved',series:'1',number:1};let writes=0,revised;
 const data={draft,emission,baseIssuerDocument:draft.issuerSnapshot.document,reservation:{id:'reserved',companyId:company,establishmentId:establishment,emissionId:id,documentType:'nfe',status:'reserved',series:'1',number:1},numberingLedger:{sequences:[{documentType:'nfe',series:'1',nextNumber:2,lastReservedNumber:1,active:true}],reservations:[{id:'reserved',draftId:id,documentType:'nfe',series:'1',number:1,status:'reserved'}],voidRequests:[],audit:[]}};
 const original=structuredClone(draft),events=[];
 const service=createCommercialNfeRejectionCorrectionService({repository:{load:async()=>data,findByOperation:async()=>null,save:async input=>{writes++;revised=input.draft;assert.deepEqual(revised.issuerSnapshot,original.issuerSnapshot);assert.deepEqual(revised.customerSnapshot.address,original.customerSnapshot.address);assert.equal(revised.paymentSnapshot.method,'PIX dinâmico');assert.equal(revised.totalsSnapshot.total,20);return{revision:1,correctionDigest:input.correctionDigest};}},emissionLifecycle:{transition:async input=>{assert.equal(input.expectedVersion,emission.version);emission={...emission,...input.patch,state:input.toState,version:emission.version+1};events.push(input);return{ok:true,emission};}},fiscalRuleResolver:async()=>({valid:true,items:{},operationNature:'Venda de mercadoria',presence:'Não presencial',matrixReviewConfirmed:true,taxReviewConfirmed:true,taxReformReviewConfirmed:true})});
 const context={companyId:company,actorId:establishment,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'fiscal.prepare':true}};
 const input={context,emissionId:id,expectedVersion:6,idempotencyKey:'repair-format-588-001',rejectedStatusCode:'391',confirmation:NFE_REJECTION_CORRECTION_CONFIRMATION,changes:{note:{customerName:'Cliente',customerDocument:'11144477735',paymentMethod:'PIX dinâmico',paymentDetails:{integrationType:'2',institutionDocument:'12345678000195',authorizationCode:'E123456782026110512000000000000000'},items:[{sku:'A',quantity:2,unitPrice:10,unitDiscount:0,ncm:'33059000',cfop:'5102'}],freight:0,insurance:0,otherExpenses:0,generalDiscount:0}}};
 const result=await service.prepare(input);assert.equal(result.ok,true,JSON.stringify(result.errors));assert.equal(emission.state,'number_reserved');assert.equal(emission.number,1);assert.equal(emission.series,'1');assert.equal(writes,1);assert.ok(events.every(e=>e.publicPayload.automaticTransmission===false));
 assert.equal((await service.prepare({...input,rejectedStatusCode:'778'})).ok,false);assert.equal(writes,1);assert.deepEqual(draft,original);
 const rules={operationNature:'Venda de mercadoria',matrixReviewConfirmed:true,taxReviewConfirmed:true,taxReformReviewConfirmed:true};const mapped=buildCommercialNfePreparationInput({...data,draft:revised},rules,'note-edit-391-test','2026-11-05T12:00:00-03:00');const xml=buildUnsignedNfeSpXml(prototypeDraftToNfeSpXmlInput({...mapped,draft:{...mapped.draft,series:'1'},config:{...mapped.config,testDocumentNumber:'1',testNumericCode:'12345678'}}));assert.equal(xml.valid,true,JSON.stringify(xml.errors));assert.match(xml.xml,/<tPag>17<\/tPag>/);assert.match(xml.xml,/<card><tpIntegra>2<\/tpIntegra><CNPJ>12345678000195<\/CNPJ><cAut>E123456782026110512000000000000000<\/cAut><\/card>/);
});
