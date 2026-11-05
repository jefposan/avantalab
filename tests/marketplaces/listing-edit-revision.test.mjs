import test from 'node:test';
import assert from 'node:assert/strict';
import {commonListingRevisionState,individualListingRevisionState} from '../../app/modules/marketplaces/listing-edit-revision.ts';
const item={seller_id:123,user_product_id:'MLBU123',catalog_listing:false,status:'active',sub_status:[],last_updated:'first'};
const editor={id:'MLB123',currency:'BRL',values:{title:'Produto',description:'Descrição',listingType:'gold_special',price:120,stock:1},fields:Object.fromEntries(['title','description','listingType','price','stock'].map(k=>[k,{editable:true,maxLength:100}])),listingTypes:[{id:'gold_special',name:'Clássico',fee:12,percent:10},{id:'gold_pro',name:'Premium',fee:18,percent:15}]};
const revision=(i=item,e=editor,connection='a')=>JSON.stringify(commonListingRevisionState(connection,i,e));
test('edição comum não entra em falso conflito por horário, taxa, ordem das opções, preço ou estoque fora da edição',()=>{
 const changed=structuredClone(editor);changed.values.price=121;changed.values.stock=2;changed.fields.price={editable:false,reason:'Automatização atualizada'};changed.fields.stock.notice='Saldo local atualizado';changed.listingTypes.reverse();changed.listingTypes[0].fee=19;changed.listingTypes[0].notice='Estimativa atualizada';
 assert.equal(revision({...item,last_updated:'later'},changed),revision());
});
const individual=(i=item,e=editor,connection='a')=>JSON.stringify(individualListingRevisionState(connection,i,e));
test('editor individual não bloqueia salvar por estimativas, horário ou textos auxiliares de uma nova consulta',()=>{
 const changed=structuredClone(editor);changed.listingTypes.reverse();changed.listingTypes[0].fee=19;changed.listingTypes[0].percent=16;changed.listingTypes[0].name='Premium atualizado';changed.fields.price.notice='Nova consulta de tarifa';changed.fields.price.label='Preço';
 assert.equal(individual({...item,last_updated:'later'},changed),individual());
});
test('edição de preço vinculado ignora atualização de dados que são somente leitura',()=>{
 const linked=structuredClone(editor);for(const field of ['title','description','listingType','stock'])linked.fields[field].editable=false;
 const after=structuredClone(linked);after.values.title='Título do catálogo atualizado';after.values.stock=0;after.fields.stock.notice='Saldo atualizado';after.listingTypes=[];
 assert.equal(individual(item,after),individual(item,linked));
 after.values.price=121;assert.notEqual(individual(item,after),individual(item,linked));
});
test('revisão individual preserva conflito de preço, permissão, limites e identidade',()=>{
 for(const field of ['title','price','description','listingType','stock']){const changed=structuredClone(editor);changed.values[field]=field==='price'||field==='stock'?999:'externo';assert.notEqual(individual(item,changed),individual());const blocked=structuredClone(editor);blocked.fields[field].editable=false;assert.notEqual(individual(item,blocked),individual());}
 for(const field of ['seller_id','user_product_id','catalog_listing','status','category_id','currency_id','buying_mode','condition']){
  if(field==='currency_id')continue;
  assert.notEqual(individual({...item,[field]:'different'}),individual(),field);
 }
 const currency=structuredClone(editor);currency.currency='USD';assert.notEqual(individual(item,currency),individual());
 const limit=structuredClone(editor);limit.fields.price.max=90;assert.notEqual(individual(item,limit),individual());
 assert.notEqual(individual(item,editor,'b'),individual());
 const options=structuredClone(editor);options.listingTypes.pop();assert.notEqual(individual(item,options),individual());
});
test('alterações reais, permissões, vínculo, conta e situação continuam invalidando a revisão',()=>{
 for(const field of ['title','description','listingType']){const changed=structuredClone(editor);changed.values[field]='externo';assert.notEqual(revision(item,changed),revision());const blocked=structuredClone(editor);blocked.fields[field].editable=false;assert.notEqual(revision(item,blocked),revision());}
 for(const field of ['seller_id','user_product_id','catalog_listing','status'])assert.notEqual(revision({...item,[field]:'different'}),revision());
 assert.notEqual(revision(item,editor,'b'),revision());
 const removed=structuredClone(editor);removed.listingTypes.pop();assert.notEqual(revision(item,removed),revision());
 const limit=structuredClone(editor);limit.fields.title.maxLength=50;assert.notEqual(revision(item,limit),revision());
});
