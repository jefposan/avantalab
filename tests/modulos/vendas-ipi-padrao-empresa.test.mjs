import test from 'node:test';import assert from 'node:assert/strict';
import {validateIpiClassification} from '../../app/vendas/lib/fiscal-ipi.mjs';
import {validateCompanyFiscalDefaults} from '../../app/vendas/lib/fiscal-defaults-validation.mjs';
import {normalizeCompanyFiscalDefaults} from '../../app/vendas/lib/fiscal-tax-options.mjs';
import {resolverFiscalProduto} from '../../app/lib/fiscal-produto.mjs';
import {applyNoteItemFiscal,validateNoteItem} from '../../app/vendas/lib/fiscal-note-item.mjs';
test('padrão IPI é opcional, herda a empresa e preserva exceção preenchida somente na nota',()=>{
 const profile={taxRegime:'simples_nacional',fiscalConfiguration:{cst_ipi:'53',enquadramento_ipi:'999'}};const product={useCompanyFiscal:true,ncm:'84145110',unit:'un'};const before=structuredClone(profile);
 const inherited=resolverFiscalProduto(product,profile);assert.equal(inherited.ipiCst,'53');assert.equal(inherited.ipiLegalCode,'999');
 const legacy=resolverFiscalProduto({ipiCst:'52',ipiLegalCode:'301'},profile);assert.equal(legacy.ipiCst,'52');assert.equal(legacy.ipiLegalCode,'301');
 const exception=applyNoteItemFiscal(inherited,{ipiCst:'52',ipiLegalCode:'301'});assert.equal(exception.ipiCst,'52');assert.equal(exception.ipiLegalCode,'301');assert.deepEqual(profile,before);
 const noIpi=applyNoteItemFiscal(inherited,{ipiCst:'',ipiLegalCode:''});assert.equal(noIpi.ipiCst,'');assert.equal(noIpi.ipiLegalCode,'');assert.equal(validateNoteItem({ipiCst:'',ipiLegalCode:''}),'');
 assert.equal(validateCompanyFiscalDefaults(normalizeCompanyFiscalDefaults()),'');assert.equal(normalizeCompanyFiscalDefaults().cst_ipi,'');
});
test('mesma compatibilidade do IPI no padrão da empresa e no item impede combinação 52/999',()=>{
 for(const [cst,valid,invalid]of [['52','301','999'],['02','399','999'],['54','001','999'],['04','099','100'],['55','101','999'],['05','199','200']]){
  assert.equal(validateIpiClassification(cst,valid),'');assert.ok(validateIpiClassification(cst,invalid));assert.ok(validateNoteItem({ipiCst:cst,ipiLegalCode:invalid}));assert.ok(validateCompanyFiscalDefaults(normalizeCompanyFiscalDefaults({cst_ipi:cst,enquadramento_ipi:invalid})));
 }
 assert.equal(validateIpiClassification('53','999'),'');assert.ok(validateIpiClassification('','999'));assert.ok(validateIpiClassification('53',''));
});

test('padrão IPI da empresa chega ao XML através do resolvedor e do mapeamento reais',async()=>{
 const {createCommercialFiscalRuleResolver}=await import('../../app/vendas/lib/server/commercial-fiscal-rules.mjs');const {createDefaultFiscalMatrix}=await import('../../app/vendas/lib/fiscal-matrix.mjs');const {buildCommercialNfePreparationInput}=await import('../../app/vendas/lib/server/commercial-nfe-preparation.mjs');const {prototypeDraftToNfeSpXmlInput,buildUnsignedNfeSpXml}=await import('../../app/vendas/lib/nfe-sp-xml.mjs');const {validateNfeXmlAgainstXsd}=await import('../../app/vendas/lib/server/nfe-xsd-validator.mjs');
 const company='10000000-0000-4000-8000-000000000001';const issuer={establishmentId:company,document:'12345678000195',legalName:'Empresa Sintetica Ltda',stateRegistration:'110042490114',taxRegime:'simples_nacional',state:'SP',city:'São Paulo',cityCode:'3550308',postalCode:'01001000',street:'Rua do Comercio',number:'100',district:'Centro',fiscalConfiguration:{originCode:'0',csosn:'102',pisCst:'07',cofinsCst:'07',ipiCst:'53',ipiLegalCode:'999'}};
 const customer={document:'11144477735',displayName:'Cliente Sintético',consumerFinal:true,stateRegistrationIndicator:'9',address:{street:'Rua da Penha',number:'388',district:'Centro',city:'Sorocaba',cityCode:'3552205',state:'SP',postalCode:'18010160'}};const items=[{sku:'A',name:'Produto',unit:'un',quantity:1,unitPrice:10,unitDiscount:0,fiscal:{ncm:'84145110',taxableUnit:'un',useCompanyFiscal:true}}];const matrix=createDefaultFiscalMatrix();matrix.reviewedBy='Responsável sintético';matrix.reviewedAt='2026-11-18';matrix.rules=matrix.rules.filter(r=>r.id==='nfe-venda-consumidor-final').map(r=>({...r,active:true,reviewed:true,cfopOverride:'5102'}));
 const resolve=createCommercialFiscalRuleResolver({repository:{getPublished:async()=>({status:'publicada',taxReviewConfirmed:true,taxReformReviewConfirmed:true,matrix})},issuerResolver:async()=>issuer});const rules=await resolve({companyId:company,documentType:'nfe',issuer,customer,items});assert.equal(rules.valid,true,JSON.stringify(rules.errors));assert.equal(rules.items.A.ipiCst,'53');
 const draft={id:company,companyId:company,operationId:company,originType:'avulsa',documentType:'nfe',status:'pronto',issuerSnapshot:issuer,customerSnapshot:customer,itemsSnapshot:items,totalsSnapshot:{total:10,subtotalGross:10,itemDiscount:0,generalDiscount:0,freight:0,insurance:0,otherExpenses:0},paymentSnapshot:{method:'Dinheiro',amount:10}};
 const mapped=buildCommercialNfePreparationInput({draft},rules,'ipi-company-integration','2026-11-18T12:00:00-03:00');const xml=buildUnsignedNfeSpXml(prototypeDraftToNfeSpXmlInput({...mapped,draft:{...mapped.draft,series:'1'},config:{...mapped.config,documentStage:'signature',testDocumentNumber:'2',testNumericCode:'12345678'}}),{environment:'producao'});assert.equal(xml.valid,true,JSON.stringify(xml.errors));assert.match(xml.xml,/<IPI><cEnq>999<\/cEnq><IPINT><CST>53<\/CST><\/IPINT><\/IPI>/);assert.equal((await validateNfeXmlAgainstXsd(xml.xml)).valid,true);
});
