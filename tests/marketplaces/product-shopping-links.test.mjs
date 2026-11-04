import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
import {validProductPostPrice,shoppingLinkPriceIssue,productShoppingCaption,productPostDestinations} from '../../app/modules/marketplaces/product-shopping-link.ts';
import {productListingUrl} from '../../app/modules/marketplaces/product-listing-update.ts';
import {accountDisplayName} from '../../app/marketplaces/account-identification.ts';
const source=readFileSync('app/modules/marketplaces/services/product-shopping-links.ts','utf8');
function fixture(){
 const snapshot={id:'MLB123456',status:'active',currency:'BRL',price:297.27,stock:1,substatus:[],permalink:'https://produto.mercadolivre.com.br/MLB-123456-produto-_JM'};
 const tables={marketplace_product_links:[{id:'l',empresa_id:'c',product_id:'p',connection_id:'a',provider:'mercado_livre',provider_listing_id:'MLB123456',status:'active'}],marketplace_connections:[{id:'a',empresa_id:'c',provider:'mercado_livre',seller_name:'Seller',seller_reference:'123',status:'connected',token_sealed:'NEVER_RETURN'}],marketplace_connection_labels:[{empresa_id:'c',connection_id:'a',local_label:'ALINE'}],marketplace_listings:[{id:'row',empresa_id:'c',connection_id:'a',provider:'mercado_livre',provider_listing_id:'MLB123456',status:'active',snapshot}],marketplace_price_consultations:[{id:'r',empresa_id:'c',local_product_id:'p',market_price_cents:33030,medium_price_cents:23121,ideal_price_cents:29727,created_at:'2026-10-22'}]};
 const errors={},queries=[];
 const db={from(table){let rows=tables[table]||[],single=false;const filters=[];const q={select(columns){queries.push({table,columns});return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},in(k,v){filters.push(r=>v.includes(r[k]));return q;},not(k,op,v){filters.push(r=>r[k]!==v);return q;},gt(k,v){filters.push(r=>r[k]>v);return q;},order(){return q;},limit(n){q.take=n;return q;},maybeSingle(){single=true;return q;},then(resolve,reject){const found=rows.filter(r=>filters.every(f=>f(r))).slice(0,q.take??Infinity);return Promise.resolve({data:single?found[0]||null:found,error:errors[table]||null}).then(resolve,reject);}};return q;}};
 const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,Number,Intl,Set,Promise,require(id){if(id==='server-only')return{};if(id.includes('management-access'))return{MarketplaceError:class extends Error{constructor(status,code,message){super(message);this.code=code;this.status=status;}}};if(id.includes('product-listing-update'))return{productListingUrl};if(id.includes('listing-model'))return{objectValue:v=>v&&typeof v==='object'?v:{}};if(id.includes('account-identification'))return{accountDisplayName};if(id.includes('product-shopping-link'))return{validProductPostPrice};throw Error(id);}});
 return{...exports,db,tables,errors,queries,snapshot};
}
test('De é a média e Por é qualquer preço anunciado válido, sem percentual ou cálculo de desconto',()=>{
 for(const n of [1,33030,49500,999999999])assert.equal(validProductPostPrice(n),true);
 for(const n of [null,undefined,0,-1,NaN,Infinity,1.1])assert.equal(validProductPostPrice(n),false);
 for(const [mean,sale] of [[55090,49500],[33030,32900],[33030,29727],[33030,33030],[33030,40000]]){
  assert.equal(shoppingLinkPriceIssue(mean,{priceCents:sale}),null);
  const text=productShoppingCaption({condition:'new',description:'Produto',details:'Sem caixa',referencePriceCents:mean,priceCents:sale,url:'https://produto.mercadolivre.com.br/MLB-123456-produto-_JM'});
  const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  assert.ok(text.endsWith(`*Link de compra:*\nhttps://produto.mercadolivre.com.br/MLB-123456-produto-_JM`));assert.ok(text.includes(`De: ~${money.format(mean/100)}~`));assert.ok(text.includes(`💰 *POR APENAS ${money.format(sale/100)}*`));assert.doesNotMatch(text,/%|desconto|495,81/i);
 }
 assert.match(shoppingLinkPriceIssue(null,undefined),/média/);assert.match(shoppingLinkPriceIssue(55090,{priceCents:0}),/válido/);
});
test('saldos definem escolha explícita quando Online e Saldão têm unidades',()=>{
 const w={warehousesReady:true,warehouses:[{is_online:true,quantity:1},{is_online:false,quantity:1}]};assert.deepEqual(productPostDestinations(w),{online:true,image:true});assert.deepEqual(productPostDestinations({...w,warehousesReady:false}),{online:false,image:false});assert.deepEqual(productPostDestinations({...w,warehouses:[{is_online:true,quantity:0},{is_online:false,quantity:1}]}),{online:false,image:true});
});
test('links usam conta e anúncio exatos da empresa, identificação separada e apenas projeção pública',async()=>{
 const f=fixture();f.tables.marketplace_product_links.push({...f.tables.marketplace_product_links[0],empresa_id:'other',connection_id:'foreign'});const links=await f.readProductShoppingLinks(f.db,'c','p');assert.equal(links.length,1);assert.equal(links[0].accountName,'ALINE');assert.equal(links[0].priceCents,29727);assert.equal(links[0].listingId,'MLB123456');assert.ok(!JSON.stringify(links).includes('NEVER_RETURN'));assert.equal(await f.readPostMarketReference(f.db,'c','p'),33030);assert.ok(f.queries.every(q=>!q.columns.includes('token_sealed')));assert.ok(f.queries.some(q=>q.table==='marketplace_connections'&&!q.columns.includes('local_label')));
});
test('pausados, sem saldo, moeda divergente, URL externa, anúncio de outra conta e identidade divergente não viram links',async()=>{
 for(const change of [f=>f.tables.marketplace_listings[0].status='paused',f=>f.snapshot.stock=0,f=>f.snapshot.currency='USD',f=>f.snapshot.permalink='https://mercadolivre.com.br.evil.invalid/p',f=>f.snapshot.id='MLB999999',f=>f.tables.marketplace_listings[0].connection_id='other',f=>f.tables.marketplace_connections[0].status='expired']){const f=fixture();change(f);assert.equal((await f.readProductShoppingLinks(f.db,'c','p')).length,0);}
});
test('falha de consulta é visível e ausência de média não inventa referência',async()=>{const f=fixture();f.errors.marketplace_listings={message:'offline'};await assert.rejects(f.readProductShoppingLinks(f.db,'c','p'),/consultar/);f.tables.marketplace_price_consultations=[];assert.equal(await f.readPostMarketReference(f.db,'c','p'),null);});

test('legenda Online mostra a condição escolhida e preserva De/Por sem percentual',()=>{
 for(const [condition,label] of Object.entries({new:'Novo',used:'Usado',refurbished:'Recondicionado',damaged:'Avaria',detailed:'Com detalhe'})){
  const text=productShoppingCaption({condition,description:'Produto',details:'Pequena marca na lateral',referencePriceCents:55090,priceCents:49500,url:'https://produto.mercadolivre.com.br/MLB-123456-produto-_JM'});
  assert.ok(text.includes(`Condição: ${label}`));assert.match(text,/💰 \*POR APENAS R\$\s495,00\*/);assert.doesNotMatch(text,/%|desconto/i);
 }
 for(const condition of ['', 'invented','constructor'])assert.throws(()=>productShoppingCaption({condition,description:'Produto',details:'',referencePriceCents:55090,priceCents:49500,url:'https://x'}),/condição/);
 assert.throws(()=>productShoppingCaption({condition:'detailed',description:'Produto',details:' ',referencePriceCents:55090,priceCents:49500,url:'https://x'}),/detalhe/);
});
