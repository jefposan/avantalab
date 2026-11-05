import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mercadoLivreValidationError as diagnostic, isWarningOnlyPrevalidation } from '../../app/modules/marketplaces/services/mercadolivre-validation-error.ts';

test('somente advertências libera exclusivamente o pré-validador, nunca a criação/edição',()=>{
  const warning={type:'warning',code:'item.attributes.ignored',message:'Attribute ignored because it is not modifiable.'};
  const body={error:'validation_error',status:400,cause:[warning]};
  assert.equal(isWarningOnlyPrevalidation(body,400,'/items/validate','POST'),true);
  for(const [input,status,path,method] of [
    [body,400,'/items','POST'],[body,400,'/items/MLB123','PUT'],[body,400,'/items/validate','GET'],[body,422,'/items/validate','POST'],
    [{...body,cause:[]},400,'/items/validate','POST'],[{...body,cause:[warning,{type:'error',code:'item.price.invalid',message:'Bad price'}]},400,'/items/validate','POST'],
    [{...body,cause:[warning,{}]},400,'/items/validate','POST'],[{...body,error:'unknown'},400,'/items/validate','POST'],
    [{...body,cause:[{...warning,type:undefined}]},400,'/items/validate','POST'],[null,400,'/items/validate','POST'],
    [{...body,cause:[...Array(1000).fill(warning),{type:'error'}]},400,'/items/validate','POST']
  ]) assert.equal(isWarningOnlyPrevalidation(input,status,path,method),false);
});

test('recusa real de garantia orienta em português e guarda resposta original separada',()=>{
  const result=diagnostic({cause:[{code:'sale_term.invalid_value',message:'Sale term WARRANTY_TIME with value 3 is invalid. You can use a number followed by one of these valid units: [dias, meses, anos].'}]},400);
  assert.match(result.fields.warrantyTime,/Ex\.: 3 meses/);
  assert.doesNotMatch(result.message,/Sale term|invalid_value/);
  assert.match(result.details,/Sale term WARRANTY_TIME/);
});

test('avisos conhecidos orientam ação, sem expor inglês na mensagem principal',()=>{
  for (const [code,reference,expected] of [
    ['item.category_id.invalid','category_id',/Escolha uma categoria/],
    ['item.listing_type_id.requiresPictures','pictures',/Adicione uma imagem/],
    ['item.pictures.max','pictures',/Reduza a quantidade/],
    ['item.attribute.missing_required','attributes[BRAND]',/Marca:.*Preencha/],
    ['item.attribute.product_identifier.invalid_format','GTIN',/código da embalagem/],
    ['shipping.mode.me2_mandatory','shipping.mode',/Selecione essa forma/]
  ]) {
    const result=diagnostic({cause:[{code,references:[reference],message:'PROVIDER_ENGLISH_TEXT'}]},400);
    assert.match(result.message,expected);assert.doesNotMatch(result.message,/PROVIDER_ENGLISH_TEXT/);assert.match(result.details,/PROVIDER_ENGLISH_TEXT/);
  }
});

test('preserva motivo real e código; mapeia preço por referência ou código sem referência', () => {
  for (const references of [undefined, ['body.price']]) {
    const result = diagnostic({cause:[{type:'error',code:'item.price.invalid',references,message:'The category requires a minimum price of 20.'}]},400);
    assert.match(result.fields.price,/mínimo permitido.*20,00/);
    assert.match(result.details,/item.price.invalid/);
    assert.match(result.details,/HTTP 400/);
    assert.doesNotMatch(result.message,/minimum price|item.price.invalid|HTTP/);
  }
});
test('colchetes e mensagem identificam prazo da garantia, EAN e atributos específicos', () => {
  const result=diagnostic({cause:[
    {code:'item.sale_terms.invalid',references:['item.sale_terms[WARRANTY_TIME]'],message:'Invalid warranty duration: specify months.'},
    {code:'item.attribute.missing_conditional_required',references:['item.attributes'],message:'The attributes [BRAND, MODEL] are required.'},
    {code:'item.attribute.invalid',references:['item.attributes[COLOR]'],message:'Attribute [COLOR] invalid, values [BLACK] not accepted.'},
    {code:'item.attribute.product_identifier.invalid_format',message:'Product Identifier [GTIN] has invalid format.'}
  ]},422);
  assert.deepEqual(Object.keys(result.fields).sort(),['warrantyTime','attribute:BRAND','attribute:MODEL','attribute:COLOR','ean'].sort());
  assert.match(result.fields['attribute:COLOR'],/Cor: O valor desta característica/);
  assert.match(result.details,/values \[BLACK\]/);
  assert.equal(result.fields['attribute:BLACK'],undefined);
});
test('preserva múltiplas recusas do mesmo campo e não trata warning como erro',()=>{
  const result=diagnostic({cause:[{type:'warning',code:'item.price.warning',references:['price'],message:'WARN_ONLY'},
    {type:'error',references:['shipping.mode'],message:'Shipping mode is mandatory.'},
    {references:['shipping.mode'],message:'Local pickup is not allowed.'}]},409);
  assert.equal(result.fields.price,undefined);assert.doesNotMatch(result.message,/WARN_ONLY/);
  assert.match(result.details,/Advertência \(não bloqueante\): WARN_ONLY/);
  assert.match(result.fields.shippingMode,/Forma de envio:.*Revise/);assert.match(result.details,/mandatory/);assert.match(result.details,/not allowed/);
});
test('recusa com somente advertências não descarta diagnóstico nem inventa erro de campo',()=>{
  const result=diagnostic({message:'Validation error',error:'validation_error',cause:[{type:'warning',code:'normalize.item.attribute.values',references:['item.attributes[0]'],message:'Attribute [VOLTAGE] normalized.'}]},400);
  assert.deepEqual(result.fields,{});
  assert.match(result.message,/somente advertências/);
  assert.match(result.details,/VOLTAGE/);
  assert.match(result.details,/validation_error/);
});
test('recusa real family_name sem references identifica o nome/título da publicação',()=>{
  const result=diagnostic({cause:[{code:'body.required_fields',message:'The body does not contains some or none of the following properties [family_name]'}]},400);
  assert.match(result.fields.title,/formato desta conta/);assert.match(result.details,/family_name/);assert.doesNotMatch(result.message,/Sem campo indicado/);
});
test('índices em references apontam para o ID exato do payload enviado, não para outro atributo',()=>{
  const result=diagnostic({cause:[{references:['item.attributes[1].values'],message:'Invalid value'}, {references:['sale_terms[1]'],message:'Invalid duration'}]},400,{attributes:[{id:'BRAND'},{id:'VOLTAGE'}],sale_terms:[{id:'WARRANTY_TYPE'},{id:'WARRANTY_TIME'}],private_data:'NEVER_RETURN'});
  assert.deepEqual(Object.keys(result.fields),['attribute:VOLTAGE','warrantyTime']);
  assert.doesNotMatch(JSON.stringify(result),/NEVER_RETURN/);
});
test('não inventa campo para regra de conta, erro desconhecido ou corpo inválido',()=>{
  const result=diagnostic({cause:[{code:'seller.not_allowed',message:'Seller must complete identity verification.'}]},400);
  assert.deepEqual(result.fields,{});assert.match(result.message,/ainda não conseguimos explicar/);assert.match(result.details,/identity verification/);
  for(const body of [null,'<html>proxy failure</html>',{message:'Validation error'},{}]){
    const fallback=diagnostic(body,400);assert.deepEqual(fallback.fields,{});assert.match(fallback.message,/não informou qual dado/);
  }
});
test('limita diagnóstico e não retorna credenciais, URLs, HTML ou outros campos do corpo',()=>{
  const result=diagnostic({headers:{Authorization:'PRIVATE_BODY'},cause:[{code:'item.price.invalid',references:['price'],message:'Bad value <script>evil()</script> https://host.test/?secret=URL_SECRET user@example.com APP_USR-123-SECRET\naccess_token: TOKEN_SECRET'}]},400);
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE_BODY|URL_SECRET|TOKEN_SECRET|APP_USR-123|user@example.com|<script>/);
  assert.doesNotMatch(diagnostic({cause:[{code:'APP_USR-123-SECRET',message:'Invalid input'}]},400).message,/APP_USR/);
  assert.ok(diagnostic({cause:Array.from({length:1000},()=>({message:'x'.repeat(10000)}))},400).message.length<20000);
  assert.deepEqual(diagnostic({cause:[{references:['body.__proto__.constructor'],message:'Unknown rule'}]},400).fields,{});
});
test('interface mantém dados, destaca erros e oferece foco no campo ou características sem publicar automaticamente',()=>{
  const source=readFileSync('app/marketplaces/NewListing.tsx','utf8');
  assert.match(source,/setErrors\(detail.fields \|\| \{\}\)/);
  assert.match(source,/Conferir campo/);assert.match(source,/data-validation-error/);
  assert.match(source,/id="new-attributes" tabIndex=\{-1\}/);
  assert.match(source,/new-publication-error/);
  const failure=source.slice(source.indexOf('const detail = failure as Error'),source.indexOf('const product = prepared'));
  assert.doesNotMatch(failure,/setForm\(|setPrepared\(|void publish\(/);
  assert.match(failure,/if \(detail.code === 'invalid_fields'\) setRequestKey\(crypto.randomUUID\(\)\)/);
  assert.equal((failure.match(/setRequestKey\(/g)||[]).length,1,'só a recusa explícita pode renovar a tentativa');
});
