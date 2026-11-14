import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {analyzeMercadoLivreOffers} from '../../app/modules/marketplaces/market-price-research.ts';
const root=resolve(import.meta.dirname,'../..'),mock=s=>({url:'data:text/javascript,'+encodeURIComponent(s),shortCircuit:true});
const hook=registerHooks({resolve(s,c,next){
 if(s==='server-only')return mock('export {}');
 if(s==='./management-access')return mock('export class MarketplaceError extends Error{constructor(status,code,message){super(message);Object.assign(this,{status,code})}}');
 if(s==='./mercadolivre-management')return mock('export async function mlRequest(db,c,path,method){if(method&&method!=="GET")throw Error("Escrita proibida");return db.read(path)}');
 const f=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
 if(f&&existsSync(f+'.ts'))return next(pathToFileURL(f+'.ts').href,c);return next(s,c);
}});
const {consultMercadoLivreMarketPrices}=await import('../../app/modules/marketplaces/services/mercadolivre-market-prices.ts');hook.deregister();
const cat='MLB56235019',ean='7909569454787',name='Liquidificador Electrolux EBL1500 127V Cinza';
const offer=(n,price=100+n)=>({item_id:'MLB'+(1000+n),seller_id:2000+n,price,currency_id:'BRL',condition:'new'});
const identity=()=>({status:'found',ean,candidates:[{id:cat}],product:{id:cat,name,attributes:[{id:'BRAND',value:'Electrolux'},{id:'MODEL',value:'EBL1500'},{id:'VOLTAGE',value:'127V'},{id:'COLOR',value:'Cinza'}],raw:{status:'active',children_ids:[],attributes:[{id:'GTIN',value_name:ean}]}}});
const analyze=(rows,extra={})=>analyzeMercadoLivreOffers({catalogId:cat,productName:name,rows,total:rows.length,complete:true,ownSellers:[],...extra});
function fixture(rows=Array.from({length:49},(_,i)=>offer(i))){
 const calls=[],db={from(table){assert.equal(table,'marketplace_connections');const q={select(){return q},eq(k,v){assert(['empresa_id','provider'].includes(k));return q},then(ok,bad){return Promise.resolve({data:[{seller_reference:'999'}],error:null}).then(ok,bad)}};return q;},async read(path){calls.push(path);const u=new URL(path,'https://api.mercadolibre.com');assert.equal(u.pathname,`/products/${cat}/items`);const offset=Number(u.searchParams.get('offset'));return {paging:{total:rows.length,offset},results:rows.slice(offset,offset+20)};}};
 return {db,calls,connection:{empresa_id:'company',seller_reference:'999'},input:{ean,productName:name,attributes:identity().product.attributes,identification:identity()}};
}
test('catálogo percorre 49 ofertas em três páginas, calcula todos os vendedores e não pesquisa a lista geral ou IA',async()=>{
 const f=fixture(),r=await consultMercadoLivreMarketPrices(f.db,f.connection,f.input);
 assert.equal(f.calls.length,3);assert.deepEqual(f.calls.map(p=>new URL(p,'https://x').searchParams.get('offset')),['0','20','40']);
 assert.equal(r.status,'ready');assert.equal(r.totalReported,49);assert.equal(r.fetchedCount,49);assert.equal(r.count,49);assert.equal(r.mean,124);assert.equal(r.minimum,100);assert.equal(r.maximum,148);assert.equal(r.median,124);
 assert(f.calls.every(p=>p.startsWith(`/products/${cat}/items?`)));assert(r.offers.every(o=>o.url.includes(`item_id%3A${o.id}`)));
});
test('amostra incompleta, total alterado e página repetida não viram média pronta',async()=>{
 for(const scenario of ['changed','repeated','missing','overlap']){
  const f=fixture(),original=f.db.read;let n=0;f.db.read=async p=>{const r=await original(p);if(n++){if(scenario==='changed')r.paging.total++;if(scenario==='repeated')r.results=Array.from({length:20},(_,i)=>offer(i));if(scenario==='missing')r.results=[];if(scenario==='overlap')r.results[0]=offer(0);}return r;};
  assert.equal((await consultMercadoLivreMarketPrices(f.db,f.connection,f.input)).status,'partial');assert(f.calls.length<=3);
 }
 const f=fixture(Array.from({length:201},(_,i)=>offer(i)));const r=await consultMercadoLivreMarketPrices(f.db,f.connection,f.input);assert.equal(r.status,'partial');assert.equal(r.fetchedCount,200);assert.equal(f.calls.length,10);
});
test('rejeita identidade, voltagem, EAN divergente, pai de catálogo e falta de confirmação sem consultar ofertas',async()=>{
 const cases=[f=>f.input.identification.product.raw.children_ids=['MLB777'],f=>f.input.identification.product.raw.status='inactive',f=>f.input.attributes=[{id:'VOLTAGE',value:'220V'}],f=>f.input.identification.product.raw.attributes=[{id:'GTIN',value_name:'7896347195829'}],f=>f.input.identification.status='choose'];
 for(const change of cases){const f=fixture();change(f);assert.equal((await consultMercadoLivreMarketPrices(f.db,f.connection,f.input)).status,'identity_unconfirmed');assert.equal(f.calls.length,0);}
});
test('deduplica anúncios/vendedores, exclui próprias contas e valida condição/moeda/preço sem exigir estoque privado de terceiro',()=>{
 const rows=[offer(1,100),{...offer(2,120),seller_id:2001},offer(3,110),offer(4,120),offer(1,100),{...offer(5),seller_id:999},{...offer(6),condition:'used'},{...offer(7),currency_id:'USD'},{...offer(8),available_quantity:0},{...offer(9),catalog_product_id:'MLB999'},{...offer(10),price:NaN}];
 const r=analyze(rows,{ownSellers:['999']});assert.equal(r.status,'ready');assert.equal(r.count,3);assert.equal(r.mean,110);assert.equal(r.exclusions.mesmo_vendedor,1);assert.equal(r.exclusions.anuncio_repetido,1);assert.equal(r.exclusions.nossas_contas,1);assert.equal(r.exclusions.condicao_ou_indisponivel,2);assert.equal(r.exclusions.outro_produto,1);assert.equal(r.exclusions.dados_invalidos,2);
 assert(r.offers.every(o=>o.sellerId!=='999'));assert.equal(new Set(r.offers.map(o=>o.sellerId)).size,3);
});
test('uma ou duas ofertas preservam a referência; extremos e grande divergência são identificados',()=>{
 for(const n of [0,1,2])assert.equal(analyze(Array.from({length:n},(_,i)=>offer(i))).status,'insufficient');
 const r=analyze([offer(1,100),offer(2,101),offer(3,102),offer(4,103),offer(5,9999)]);assert.equal(r.status,'ready');assert.equal(r.count,4);assert.equal(r.mean,101.5);assert.equal(r.exclusions.valor_extremo,1);
 assert.equal(analyze([offer(1,100),offer(2,110),offer(3,1000)]).status,'review');
 assert.equal(analyze([offer(1),offer(2),offer(3)],{complete:false,total:49}).status,'partial');
});
test('falha de paginação/permissão, cancelamento e falha ao conferir contas não passam por fallback pago',async()=>{
 const f=fixture();f.db.read=async()=>{throw Object.assign(Error('Acesso negado'),{status:403});};await assert.rejects(consultMercadoLivreMarketPrices(f.db,f.connection,f.input),{status:403});
 const aborted=new AbortController();aborted.abort();await assert.rejects(consultMercadoLivreMarketPrices(f.db,f.connection,f.input,aborted.signal));
 const malformed=fixture();malformed.db.read=async()=>({results:[offer(1)]});await assert.rejects(consultMercadoLivreMarketPrices(malformed.db,malformed.connection,malformed.input),{code:'ml_price_response'});
 const code=['app/modules/marketplaces/services/local-product-price-research.ts','app/modules/marketplaces/services/mercadolivre-price-consultation.ts','app/api/modulos/marketplaces/precos/route.ts'].map(p=>readFileSync(p,'utf8')).join('\n');assert.doesNotMatch(code,/consultOpenAIWebPrices\s*\(/);
});
