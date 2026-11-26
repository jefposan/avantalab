import test from 'node:test';
import assert from 'node:assert/strict';
import {CFOP_TABLE,CFOP_SOURCE,searchCfop,officialCfop,cfopNature,configuredNoteCfop,noteItemCfop} from '../../app/vendas/lib/fiscal-cfop.mjs';
import {createCommercialFiscalRuleResolver} from '../../app/vendas/lib/server/commercial-fiscal-rules.mjs';
import {newFiscalNoteFields} from '../../app/vendas/lib/fiscal-note-editor.mjs';

const rules=['Dentro da UF','Fora da UF','Qualquer'].map((destination,index)=>({id:`rule-${index}`,name:['Venda interna','Venda interestadual','Consumidor final'][index],documentType:'nfe',priority:10+index,operation:'Venda',destination,recipientProfile:index===2?'Qualquer':'Contribuinte ICMS',consumerFinal:index===2?'Sim':'Qualquer',presence:'Qualquer',issuePurpose:'Normal',operationNature:`Natureza ${index}`,cfopOverride:index===1?'6102':'5102',requiresStateRegistration:index!==2,active:true,reviewed:true}));
const matrix={rules,reviewedBy:'Responsável',reviewedAt:'2026-11-17',documentScope:['nfe']};
const configuration={status:'publicada',version:1,taxReviewConfirmed:true,taxReformReviewConfirmed:true,matrix};
const resolve=createCommercialFiscalRuleResolver({repository:{getPublished:async()=>configuration}});
const base={companyId:'10000000-0000-4000-8000-000000000001',documentType:'nfe',issuer:{state:'SP',taxRegime:'simples_nacional',fiscalConfiguration:{originCode:'0',csosn:'102',pisCst:'49',cofinsCst:'49'}},customer:{address:{state:'RJ'},stateRegistrationIndicator:'nao_contribuinte',consumerFinal:true},items:[{sku:'A',name:'Produto',unit:'UN',fiscal:{useCompanyFiscal:true,ncm:'33049990'}}],operationNature:cfopNature(officialCfop('6102')),fiscalForm:{...newFiscalNoteFields(),destination:'2'}};

test('tabela oficial completa e busca por código ou descrição, sem acentos',()=>{
 assert.equal(CFOP_TABLE.length,619);assert.equal(new Set(CFOP_TABLE.map(row=>row.code)).size,619);assert.match(CFOP_SOURCE.url,/nfe\.fazenda\.gov\.br/);assert.match(CFOP_SOURCE.sha256,/^[a-f0-9]{64}$/);
 assert.ok(searchCfop('51').some(row=>row.code==='1151'));assert.ok(searchCfop('transferencia').some(row=>row.code==='1151'));
 assert.equal(officialCfop('9999'),null);assert.equal(officialCfop('5102','2000-01-01'),null);assert.ok(cfopNature(officialCfop('5102')).length<=60);
});

test('padrões configurados preenchem 5102/6102 sem depender do perfil fiscal da pessoa e sem fixar códigos',()=>{
 const context={operation:'Venda',destination:'Dentro da UF',recipientProfile:'Não contribuinte',consumerFinal:'Sim',presence:'Não presencial',issuePurpose:'Normal'};
 assert.equal(configuredNoteCfop({matrix,context}),'5102');assert.equal(configuredNoteCfop({matrix,context:{...context,destination:'Fora da UF'}}),'6102');
 const changed={...matrix,rules:rules.map(rule=>({...rule,cfopOverride:rule.destination==='Fora da UF'?'6108':'5101'}))};
 assert.equal(configuredNoteCfop({matrix:changed,context:{...context,destination:'Fora da UF'}}),'6108');
 assert.equal(configuredNoteCfop({matrix:{...matrix,reviewedBy:''},context:{...context,destination:'Fora da UF'}}),'');
 assert.equal(noteItemCfop({product:{useCompanyFiscal:true},operationCfop:'6102',destination:'Fora da UF'}),'6102');
 assert.equal(noteItemCfop({manual:'6108',operationCfop:'6102',destination:'Fora da UF'}),'6108');assert.equal(noteItemCfop({manual:'',operationCfop:'6102',destination:'Fora da UF'}),'');
 assert.equal(noteItemCfop({product:{useCompanyFiscal:false,cfopInterstate:'6101'},operationCfop:'6102',destination:'Fora da UF'}),'6101');
});

test('CFOP oficial selecionado resolve regra pelo cliente e destino, sem exigir regra de contribuinte',async()=>{
 const before=JSON.stringify(configuration);const result=await resolve(base);
 assert.equal(result.valid,true,JSON.stringify(result.errors));assert.equal(result.ruleId,'rule-2');assert.equal(result.items.A.cfop,'6102');assert.equal(result.operationNature,base.operationNature);assert.equal(JSON.stringify(configuration),before);
 const manual=await resolve({...base,items:[{...base.items[0],fiscal:{...base.items[0].fiscal,noteCfopOverride:'6108'}}]});assert.equal(manual.valid,true);assert.equal(manual.items.A.cfop,'6108');
 const internal=await resolve({...base,customer:{...base.customer,address:{state:'SP'}},operationNature:cfopNature(officialCfop('5102')),fiscalForm:{...base.fiscalForm,destination:'1'}});assert.equal(internal.valid,true);assert.equal(internal.items.A.cfop,'5102');
});

test('seleção oficial não libera UF, tipo, revisão fiscal ou operação sem regra compatível',async()=>{
 const wrong=await resolve({...base,operationNature:cfopNature(officialCfop('5102'))});assert.equal(wrong.valid,false);assert.equal(wrong.errors[0].field,'operationNature');
 const input=await resolve({...base,operationNature:cfopNature(officialCfop('2102'))});assert.equal(input.valid,false);
 const transfer=await resolve({...base,operationNature:cfopNature(officialCfop('6151'))});assert.equal(transfer.valid,false);
 const pending=createCommercialFiscalRuleResolver({repository:{getPublished:async()=>({...configuration,taxReviewConfirmed:false})}});assert.equal((await pending(base)).valid,false);
 const wrongManual=await resolve({...base,items:[{...base.items[0],fiscal:{...base.items[0].fiscal,noteCfopOverride:'5102'}}]});assert.equal(wrongManual.valid,false);
});

test('trocar cliente SP → RJ → MG → SP recalcula a herança sem alterar exceções do produto ou da nota',()=>{
 const products=[{sku:'herdado',useCompanyFiscal:true,cfopInternal:'5101',cfopInterstate:'6101'},{sku:'excecao',useCompanyFiscal:false,cfopInternal:'5101',cfopInterstate:'6101'}];
 const before=structuredClone(products);
 const defaults={internal:'5102',interstate:'6102'};
 const results=[];
 for(const state of ['SP','RJ','MG','SP']){
  const destination=state==='SP'?'Dentro da UF':'Fora da UF';
  const context={operation:'Venda',destination,recipientProfile:'Não contribuinte',consumerFinal:'Sim',presence:'Não presencial',issuePurpose:'Normal'};
  const operationCfop=configuredNoteCfop({matrix,context,nature:'Venda de mercadoria',defaults});
  results.push(products.map(product=>noteItemCfop({product,operationCfop,destination})));
  assert.equal(noteItemCfop({manual:'6108',product:products[0],operationCfop,destination}),'6108','exceção explícita da nota continua visível para validação');
 }
 assert.deepEqual(results,[['5102','5101'],['6102','6101'],['6102','6101'],['5102','5101']]);
 assert.deepEqual(products,before,'trocar cliente não regrava o cadastro do produto');
});
