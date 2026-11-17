import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommercialFiscalRuleResolver} from '../../app/vendas/lib/server/commercial-fiscal-rules.mjs';
import {newFiscalNoteFields} from '../../app/vendas/lib/fiscal-note-editor.mjs';
import {fiscalValidationTarget} from '../../app/vendas/lib/fiscal-validation.mjs';

function fixture(){
 const rules=['Dentro da UF','Fora da UF'].map((destination,index)=>({id:`rule-${index}`,name:index?'Venda interestadual':'Venda interna',documentType:'nfe',priority:10,operation:'Venda',destination,recipientProfile:'Qualquer',consumerFinal:'Qualquer',presence:'Qualquer',issuePurpose:'Normal',operationNature:index?'Venda para outra UF':'Venda dentro da UF',cfopOverride:index?'6102':'5102',requiresStateRegistration:false,active:true,reviewed:true}));
 const configuration={status:'publicada',taxReviewConfirmed:true,taxReformReviewConfirmed:true,matrix:{rules,reviewedBy:"Responsável",reviewedAt:"2026-11-17"}};
 const resolve=createCommercialFiscalRuleResolver({repository:{getPublished:async()=>configuration}});
 const args={companyId:'10000000-0000-4000-8000-000000000001',documentType:'nfe',issuer:{state:'SP'},customer:{address:{state:'RJ'},stateRegistrationIndicator:'nao_contribuinte'},items:[],fiscalForm:{...newFiscalNoteFields(),destination:'2'},operationNature:rules[0].operationNature};
 return {resolve,args,configuration};
}

test('natureza incompatível com destino correto destaca Natureza nos dois sentidos, sem mudar regras',async()=>{
 const {resolve,args,configuration}=fixture();const before=JSON.stringify(configuration);
 for(const interstate of [true,false]){
  const result=await resolve({...args,customer:{...args.customer,address:{state:interstate?'RJ':'SP'}},operationNature:configuration.matrix.rules[interstate?0:1].operationNature,fiscalForm:{...args.fiscalForm,destination:interstate?'2':'1'}});
  assert.equal(result.valid,false);
  const error=result.errors[0];assert.equal(error.code,'AV-FISCAL-RULES-NO-MATCH');assert.equal(error.field,'operationNature');assert.equal(fiscalValidationTarget(error),'operationNature');assert.match(error.message,/campo Natureza da operação/);
 }
 assert.equal(JSON.stringify(configuration),before);
 const compatible=await resolve({...args,operationNature:configuration.matrix.rules[1].operationNature});
 assert.equal(compatible.errors.some(error=>error.code==='AV-FISCAL-RULES-NO-MATCH'),false);
});

test('destino realmente incompatível com endereço continua destacando Destino',async()=>{
 const {resolve,args}=fixture();
 const result=await resolve({...args,fiscalForm:{...args.fiscalForm,destination:'1'}});
 assert.equal(result.valid,false);assert.equal(result.errors[0].code,'AV-FISCAL-RULES-DESTINATION');assert.equal(fiscalValidationTarget(result.errors[0]),'destination');assert.match(result.errors[0].message,/endereço do destinatário/);
});
