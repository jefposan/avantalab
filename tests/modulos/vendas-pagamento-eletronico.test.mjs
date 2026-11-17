import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeElectronicPayment} from '../../app/vendas/lib/server/fiscal-payment.mjs';
import {fiscalValidationTarget} from '../../app/vendas/lib/fiscal-validation.mjs';
const details={integrationType:'1',institutionDocument:'10573521000191',authorizationCode:'A123'};
test('pagamentos eletrônicos normalizam máscara sem mudar CNPJ, integração ou autorização',()=>{
 for(const method of ['PIX dinâmico','Cartão de crédito','Cartão de débito']){
  assert.deepEqual(normalizeElectronicPayment(method,details).details,details);
  assert.deepEqual(normalizeElectronicPayment(method,{...details,institutionDocument:'10.573.521/0001-91'}).details,details);
 }
});
test('cada erro mantém destino preciso e PIX usa o nome do identificador',()=>{
 for(const field of ['integrationType','institutionDocument','authorizationCode']){
  const {error}=normalizeElectronicPayment('Cartão de crédito',{...details,[field]:''});
  assert.equal(error.field,field);assert.equal(fiscalValidationTarget(error),field);
 }
 assert.match(normalizeElectronicPayment('PIX dinâmico',{...details,authorizationCode:''}).error.message,/EndToEndId/);
 for(const authorizationCode of ['a\nb','a\tb','a'.repeat(129)]) assert.equal(normalizeElectronicPayment('Cartão de crédito',{...details,authorizationCode}).error.field,'authorizationCode');
 assert.equal(normalizeElectronicPayment('Cartão de crédito',{...details,institutionDocument:'X10573521000191'}).error.field,'institutionDocument');
 assert.equal(normalizeElectronicPayment('Cartão de crédito',{...details,unexpected:'x'}).error.field,'integrationType');
 assert.equal(normalizeElectronicPayment('Cartão de crédito',[]).error.field,'integrationType');
 assert.deepEqual(normalizeElectronicPayment('PIX estático',undefined),{details:undefined});
});
