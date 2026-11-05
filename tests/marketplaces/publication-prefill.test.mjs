import test from 'node:test';
import assert from 'node:assert/strict';
import {copiedSelectionOptions,copiedSelectionValue,copiedAttributeValues} from '../../app/modules/marketplaces/publication-prefill.ts';
import {publicationErrors} from '../../app/modules/marketplaces/services/catalog-publication.ts';

test('cópia preserva a seleção da origem mesmo se as opções estiverem vazias ou indisponíveis',()=>{
 for(const options of [undefined,[],[{id:'gold_pro',name:'Premium'}]]){
  assert.equal(copiedSelectionValue(options,'gold_special',true),'gold_special');
  assert.equal(copiedSelectionValue(options,'gold_special',false),'');
  const displayed=copiedSelectionOptions(options,'gold_special','Clássico',true);
  assert.equal(displayed.find(row=>row.id==='gold_special').name,'Clássico · anúncio de origem (revalidar)');
  assert.ok(!options?.some(option=>option.id==='gold_special'));
 }
 const allowed=[{id:'gold_special',name:'Clássico'}];assert.equal(copiedSelectionOptions(allowed,'gold_special','Clássico',true),allowed);
});
test('característica preenchida pelo nome seleciona o ID correspondente sem inventar opção',()=>{
 const prepared={status:'found',ean:'',requiredAttributes:[{id:'VOLTAGE',name:'Voltagem',values:[{id:'127-id',name:'127 V'}]}]};
 const source={attributes:{VOLTAGE:'127 V',COLOR:'Preto'}};
 assert.deepEqual(copiedAttributeValues(prepared,source),{VOLTAGE:'127-id',COLOR:'Preto'});assert.equal(source.attributes.VOLTAGE,'127 V');
 assert.equal(copiedAttributeValues(prepared,{attributes:{VOLTAGE:'220 V'}}).VOLTAGE,'220 V');
});
test('exibir valor de origem não o torna válido para publicar na conta nova',()=>{
 const form={ean:'7899882311471',productId:'MLB123',categoryId:'MLB456',price:100,stock:1,listingType:'gold_special',shippingMode:'me2',condition:'new',warrantyType:'none',description:'Original',attributes:{}};
 const prepared={status:'found',ean:form.ean,categoryId:form.categoryId,product:{id:form.productId,name:'Original',source:'marketplace_listing',pictures:['https://example.test/p.jpg'],attributes:[],description:'Original'},categories:[{id:form.categoryId,name:'Categoria'}],listingTypes:[{id:'gold_pro',name:'Premium'}],shippingModes:[{id:'me2',name:'Envios'}],conditions:[{id:'new',name:'Novo'}]};
 copiedSelectionOptions(prepared.listingTypes,form.listingType,'Clássico',true);
 assert.ok(publicationErrors(form,prepared).listingType);assert.equal(prepared.listingTypes.length,1);
});
