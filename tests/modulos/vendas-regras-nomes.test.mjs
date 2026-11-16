import test from 'node:test';
import assert from 'node:assert/strict';
import {createDefaultFiscalMatrix, normalizeFiscalMatrix, resolveFiscalMatrixRule} from '../../app/vendas/lib/fiscal-matrix.mjs';
test('modelos não recriam regras gerais; preserva regras existentes e nomes personalizados',()=>{
 const matrix=createDefaultFiscalMatrix();
 assert.equal(matrix.rules.some(r=>r.id.endsWith('regra-geral')),false);
 for(const documentType of ['nfe','nfce']) {
  const prefix=documentType==='nfce'?'NFC-e':'NF-e';
  const old={...matrix.rules[0],id:`${documentType}-regra-geral`,documentType,name:`${prefix} · regra geral de segurança`,active:false,reviewed:true,cfopOverride:'5102',priority:455};
  assert.deepEqual(normalizeFiscalMatrix({rules:[old]}).rules[0],{...old,name:`${prefix} · regra para operações não previstas`});
  assert.equal(normalizeFiscalMatrix({rules:[{...old,name:'Minha regra'}]}).rules[0].name,'Minha regra');
 }
});
test('consumidor final não contribuinte já corresponde dentro e fora da UF',()=>{
 const matrix=createDefaultFiscalMatrix();
 for(const destination of ['Dentro da UF','Fora da UF']) {
  const result=resolveFiscalMatrixRule({matrix,documentType:'nfe',operation:'Venda',destination,recipientProfile:'Não contribuinte',consumerFinal:'Sim',presence:'Internet',issuePurpose:'Normal'});
  assert.equal(result.rule.id,'nfe-venda-consumidor-final');
 }
});
