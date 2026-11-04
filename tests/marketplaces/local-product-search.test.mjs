import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { findProductSearchIds, productMatchesSearch, productSearchDelay } from '../../app/modules/marketplaces/local-product-search.ts';
import { productPublicationChannels } from '../../app/modules/marketplaces/local-product-publications.ts';
import { createClient } from '@supabase/supabase-js';

const root = resolve(import.meta.dirname, '../..');
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export{}', shortCircuit: true };
  if (specifier === './management-access') return { url: 'data:text/javascript,export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}', shortCircuit: true };
  if (specifier === './imported-product-photos') return { url: 'data:text/javascript,export async function readImportedProductPictures(){throw Error("Busca local não pode consultar fotos externas")}', shortCircuit: true };
  if (specifier.startsWith('.') && !/\.ts$/.test(specifier) && context.parentURL?.includes('/app/')) return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
  return next(specifier, context);
} });
const { listLocalProducts } = await import(pathToFileURL(resolve(root, 'app/modules/marketplaces/services/local-products.ts')).href);
hooks.deregister();
const row = (id, extra = {}) => ({ id, name: 'Produto demonstrativo', sku: `SKU-${id}`, ean: null, description: '', empresa_id: 'empresa', archived_at: null, created_at: '2026-10-18', ...extra });

test('maquina encontra Máquina, maquina e Unicode decomposto; cedilha e termos separados preservam os dados',()=>{
 for(const name of ['Máquina de Costura','Maquina de Costura','MÁQUINA de COSTURA']){
  const product=row('one',{name,description:'Ação e acessórios'});
  for(const query of ['maquina','MÁQUINA','maquina costura','acao acessorios','AÇAO'])assert.equal(productMatchesSearch(product,query),true,`${name}: ${query}`);
  assert.equal(product.name,name);
 }
 assert.equal(productMatchesSearch(row('one',{name:'Máquina'}),'maquina liquidificador'),false);
});

test('busca nome, qualquer trecho da descrição, SKU e EAN sem acentos/caixa/espaços repetidos', () => {
  const product = row('a', { name:'Máscara de Ação', description:'Hidratação   INTENSA e proteção dos fios', ean:'7891129598607' });
  for (const term of ['mascara', 'AÇÃO', 'hidratacao intensa', 'protecao', 'sku-a', '7891129598607']) assert.equal(productMatchesSearch(product, term), true, term);
  assert.equal(productMatchesSearch(product, 'inexistente'), false);
  assert.equal(productSearchDelay('7891129598607'), 100);
  assert.equal(productSearchDelay('shampoo'), 300);
});

test('pesquisa todas as páginas, inclusive além de mil registros; EAN exato vem primeiro e preserva duplicados', async () => {
  const rows = Array.from({ length: 1125 }, (_, i) => row(String(i), { description: i === 1124 ? '7891129598607' : '', ean: [1101,1102].includes(i) ? '7891129598607' : null }));
  const offsets = [];
  const ids = await findProductSearchIds(async offset => { offsets.push(offset); return rows.slice(offset, offset + 137); }, '7891129598607');
  assert.deepEqual(ids, ['1101','1102','1124']);
  assert.ok(offsets.at(-1) >= 1125);
});

test('falha, cancelamento e paginação inválida nunca viram vazio confirmado ou resultado parcial', async () => {
  await assert.rejects(findProductSearchIds(async offset => { if (offset) throw new Error('Rede'); return [row('a')]; }, 'produto'), /Rede/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(findProductSearchIds(async () => [], 'produto', controller.signal), { name:'AbortError' });
  await assert.rejects(findProductSearchIds(async () => [row('a')], 'produto'), /não avançou/);
});

function database(products, { failAt = null, warehouses = [], balances = [], links = [], connections = [] } = {}) {
  const calls = [];
  return { calls, from(table) {
    const call = { table, equals: [], nulls: [], greater: [], ids:null, range:null, columns:'', signal:null }; calls.push(call);
    const builder = {
      select(columns,options) { call.columns=columns;call.options=options; return this; },
      eq(key,value) { call.equals.push([key,value]); return this; },
      gt(key,value) { call.greater.push([key,value]); return this; },
      is(key,value) { call.nulls.push([key,value]); return this; },
      not(key,operator,value) { call.advertised=true; return this; },
      neq() { return this; }, or(value,options) { call.publicationStatus={value,options}; return this; },
      in(key,values) { if(!key.startsWith('publication_link.'))call.ids={key,values};return this; },
      order() { return this; }, range(a,b) { call.range=[a,b]; return this; },
      abortSignal(signal) { call.signal=signal; return this; },
      then(resolve) {
        if (failAt === call.range?.[0]) return Promise.resolve(resolve({data:null,error:{message:'Falha simulada'}}));
        const rows=table==='marketplace_connections'?connections:table==='marketplace_product_links'?links:table==='marketplace_warehouses'?warehouses:table==='marketplace_warehouse_balances'?balances:products;
        const nested=call.equals.filter(([k])=>k.startsWith('warehouse_balance.'));
        let data = rows.filter(p => call.equals.filter(([k])=>!k.startsWith('warehouse_balance.')&&!k.startsWith('publication_link.')).every(([k,v])=>p[k]===v) && call.nulls.filter(([k])=>k!=='publication_link').every(([k,v])=>p[k]===v) && (!call.ids || call.ids.values.includes(p[call.ids.key])) && (!nested.length || balances.some(b=>b.product_id===p.id&&nested.every(([k,v])=>b[k.split('.')[1]]===v)&&call.greater.every(([k,v])=>b[k.split('.')[1]]>v))));
        if(call.columns.includes('publication_link:'))data=data.filter(p=>{
          const selectedLinks=links.filter(l=>l.product_id===p.id&&l.empresa_id===p.empresa_id&&call.equals.filter(([k])=>k.startsWith('publication_link.')).every(([k,v])=>l[k.split('.')[1]]===v));
          const match=call.publicationStatus?productPublicationChannels(selectedLinks).length:selectedLinks.filter(l=>l.provider_listing_id.trim()).length;
          return Boolean(match)===Boolean(call.advertised);
        });
        const count=data.length;
        if (call.range) data=data.slice(call.range[0],call.range[1]+1);
        return Promise.resolve(resolve({data,error:null,count}));
      },
    };
    return builder;
  }};
}

test('publicação filtra antes da paginação e da pesquisa; não duplica produto nem mistura empresa',async()=>{
  const products=Array.from({length:62},(_,i)=>row(String(i)));
  const links=products.slice(0,30).map(p=>({empresa_id:'empresa',product_id:p.id,connection_id:'a',provider:'mercado_livre',provider_listing_id:'MLB'+p.id,status:p.id==='0'?'paused':'active'}));
  links.push({...links[1],connection_id:'b'}, {...links[1],product_id:'60',empresa_id:'outra'});
  const db=database(products,{links});
  const advertised=await listLocalProducts(db,'empresa','',2,undefined,null,'advertised');
  assert.equal(advertised.total,29);assert.equal(advertised.products.length,4);assert.equal(advertised.products[0].id,'26');
  const unadvertised=await listLocalProducts(database(products,{links}),'empresa','demonstrativo',2,undefined,null,'unadvertised');
  assert.equal(unadvertised.total,33);assert.equal(unadvertised.products[0].id,'54');
  assert.ok(db.calls[0].columns.includes('publication_link:marketplace_product_links()'));
  assert.equal(db.calls[0].publicationStatus.options.referencedTable,'publication_link');
  await assert.rejects(listLocalProducts(db,'empresa','',1,undefined,null,'invalid'),e=>e.code==='invalid_publication_filter');
});

test('conta do estoque cruza publicação/busca/HEAD sem somar anúncios e sem acessar conta de outra empresa',async()=>{
  const a=crypto.randomUUID(),b=crypto.randomUUID(),foreign=crypto.randomUUID(),products=['a','b','closed','none'].map(id=>row(id));
  const connections=[{id:a,empresa_id:'empresa'},{id:b,empresa_id:'empresa'},{id:foreign,empresa_id:'outra'}];
  const link=(product_id,connection_id,status='active')=>({product_id,connection_id,status,empresa_id:'empresa',provider:'mercado_livre',provider_listing_id:'MLB'+product_id});
  const links=[link('a',a),link('a',a),link('b',b),link('closed',a,'closed')];
  const db=()=>database(products,{links,connections});
  const list=(account,publication='all',countOnly=false,search='')=>listLocalProducts(db(),'empresa',search,1,undefined,null,publication,countOnly,false,account);
  assert.equal((await list(null)).total,4);
  assert.deepEqual((await list(a)).products.map(p=>p.id),['a','closed']);
  assert.deepEqual((await list(b)).products.map(p=>p.id),['b']);
  assert.deepEqual((await list(a,'advertised')).products.map(p=>p.id),['a']);
  assert.deepEqual((await list(a,'unadvertised')).products.map(p=>p.id),['b','closed','none']);
  assert.equal((await list(a,'unadvertised',true,'demonstrativo')).total,3);
  assert.equal((await list(a,'advertised',true)).total,1);
  await assert.rejects(list(foreign),e=>e.status===403);await assert.rejects(list('bad'),e=>e.status===400);
});

test('SDK gera exists/anti-join por vínculo filtrado sem carregar nem filtrar somente a página',async()=>{
  const requests=[];
  const db=createClient('https://example.invalid','test-only',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(url)=>{requests.push(new URL(url));return new Response('[]',{status:200,headers:{'content-type':'application/json','content-range':'*/0'}});}}});
  for(const publication of ['advertised','unadvertised'])await listLocalProducts(db,'empresa','',2,undefined,null,publication);
  const calls=requests.filter(url=>url.pathname.endsWith('/marketplace_products'));
  assert.equal(calls.length,2);
  assert.equal(calls[0].searchParams.get('publication_link'),'not.is.null');
  assert.equal(calls[1].searchParams.get('publication_link'),'is.null');
  for(const url of calls){assert.match(url.searchParams.get('select'),/publication_link:marketplace_product_links\(\)/);assert.equal(url.searchParams.get('publication_link.empresa_id'),'eq.empresa');assert.match(url.searchParams.get('publication_link.or'),/status.in/);assert.equal(url.searchParams.get('offset'),'25');assert.equal(url.searchParams.get('limit'),'25');}
});
test('SDK filtra novas tarjas pela mesma prioridade, sem anúncio de outra conta interferir',async()=>{
 const requests=[];
 const db=createClient('https://example.invalid','test-only',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(url)=>{requests.push(new URL(url));return new Response('[]',{status:200,headers:{'content-type':'application/json','content-range':'*/0'}});}}});
 for(const publication of ['paused','review','disabled'])await listLocalProducts(db,'empresa','',1,undefined,null,publication,true);
 const calls=requests.filter(url=>url.pathname.endsWith('/marketplace_products'));assert.equal(calls.length,3);
 for(const url of calls){assert.match(url.searchParams.get('select'),/higher_link:marketplace_product_links\(\)/);assert.equal(url.searchParams.get('higher_link'),'is.null');assert.equal(url.searchParams.get('higher_link.empresa_id'),'eq.empresa');assert.equal(url.searchParams.get('publication_link'),'not.is.null');}
 assert.match(calls[0].searchParams.get('publication_link.or'),/paused/);assert.match(calls[0].searchParams.get('higher_link.or'),/active/);assert.doesNotMatch(calls[0].searchParams.get('higher_link.or'),/paused/);
 assert.match(calls[1].searchParams.get('higher_link.or'),/paused/);assert.match(calls[2].searchParams.get('higher_link.or'),/under_review/);
});

test('serviço real isola empresa/arquivados, conta todos os encontrados e devolve somente 25 com vínculos da empresa', async () => {
  const products = Array.from({length:260},(_,i)=>row(String(i),{description:'Proteção profissional'}));
  products.push(row('segredo',{empresa_id:'outra',description:'Proteção'}),row('arquivo',{archived_at:'2026',description:'Proteção'}));
  const db=database(products);
  const result=await listLocalProducts(db,'empresa','protecao',2);
  assert.equal(result.total,260); assert.equal(result.products.length,25); assert.equal(result.products[0].id,'25');
  assert.ok(db.calls.every(call=>call.equals.some(([k,v])=>k==='empresa_id'&&v==='empresa')));
  assert.ok(db.calls.filter(call=>call.table==='marketplace_products').every(call=>call.nulls.some(([k,v])=>k==='archived_at'&&v===null)));
  assert.ok(db.calls.every(call=>call.signal instanceof AbortSignal));
  assert.equal(db.calls.findLast(call=>call.table==='marketplace_product_links').ids.values.length,25);
});

test('mesma lista completa é filtrada pelo estoque antes da busca/paginação e nunca mistura saldos ou perfis', async()=>{
  const wid=crypto.randomUUID(),other=crypto.randomUUID();
  const products=Array.from({length:61},(_,i)=>row(String(i),{description:'Hidratação intensa',ean:i===30?'7891129598607':null,stock_quantity:999,pictures:['https://example.com/photo.jpg']}));
  const warehouses=[{id:wid,name:'Saldão',empresa_id:'empresa',archived_at:null,is_online:true},{id:other,name:'Outra empresa',empresa_id:'outra',archived_at:null,is_online:true}];
  const balances=products.slice(0,60).map(p=>({empresa_id:'empresa',warehouse_id:wid,product_id:p.id,quantity:2}));
  balances.push({empresa_id:'outra',warehouse_id:other,product_id:'60',quantity:10});
  const db=database(products,{warehouses,balances});
  const result=await listLocalProducts(db,'empresa','hidratacao',2,undefined,wid);
  assert.equal(result.total,60);assert.equal(result.products.length,25);assert.equal(result.products[0].id,'25');assert.equal(result.products[0].stock_quantity,999);assert.deepEqual(result.products[0].pictures,['https://example.com/photo.jpg']);
  for(const q of db.calls.filter(c=>c.table==='marketplace_products')){assert.ok(q.columns.includes('marketplace_warehouse_balances!inner'));assert.ok(q.equals.some(([k,v])=>k==='warehouse_balance.empresa_id'&&v==='empresa'));assert.ok(q.equals.some(([k,v])=>k==='warehouse_balance.warehouse_id'&&v===wid));assert.deepEqual(q.greater,[['warehouse_balance.quantity',0]]);}
  const exact=await listLocalProducts(database(products,{warehouses,balances}),'empresa','7891129598607',1,undefined,wid);assert.deepEqual(exact.products.map(p=>p.id),['30']);
  const unfiltered=await listLocalProducts(database(products,{warehouses,balances}),'empresa','',1);assert.equal(unfiltered.total,61);
  await assert.rejects(listLocalProducts(db,'empresa','',1,undefined,other),e=>e.status===404);
  await assert.rejects(listLocalProducts(db,'empresa','',1,undefined,''),e=>e.status===400);
});

test('serviço prioriza EAN exato e preserva literal de busca sem montar filtros do PostgREST', async () => {
  const db=database([row('outro',{description:'7891129598607'}),row('exato',{ean:'7891129598607'}),row('literal',{name:'%,sku.eq.segredo'})]);
  assert.deepEqual((await listLocalProducts(db,'empresa','7891129598607',1)).products.map(p=>p.id),['exato','outro']);
  assert.deepEqual((await listLocalProducts(db,'empresa','%,sku.eq.segredo',1)).products.map(p=>p.id),['literal']);
  await assert.rejects(listLocalProducts(db,'empresa','x'.repeat(121),1),error=>error.code==='invalid_search');
});

test('serviço retorna erro claro sem entregar resultados parciais; vazio mantém paginação no banco', async () => {
  await assert.rejects(listLocalProducts(database([row('a')],{failAt:0}),'empresa','produto',1),error=>error.code==='products_search');
  const db=database(Array.from({length:30},(_,i)=>row(String(i))));
  assert.equal((await listLocalProducts(db,'empresa','',2)).products.length,5);
  assert.deepEqual(db.calls[0].range,[25,49]);
});

test('countOnly usa HEAD exato sem hidratar fotos, vínculos, notas ou distribuição; busca conta toda a lista',async()=>{
  const rows=Array.from({length:62},(_,i)=>row(String(i))),db=database(rows);
  const count=await listLocalProducts(db,'empresa','',1,undefined,null,null,true);
  assert.equal(count.total,62);assert.deepEqual(count.products,[]);assert.equal(db.calls.length,1);
  assert.deepEqual(db.calls[0].options,{count:'exact',head:true});assert.equal(db.calls[0].columns,'id');assert.equal(db.calls[0].range,null);
  const search=database(rows);assert.equal((await listLocalProducts(search,'empresa','demonstrativo',1,undefined,null,null,true)).total,62);
  assert.ok(search.calls.every(c=>c.table==='marketplace_products'));assert.ok(search.calls.every(c=>!c.columns.includes('pictures')));
});

test('campo visível fora do bloco recolhido, sem Enter, atalho usa ref e rolagem compartilhada', () => {
  const source=readFileSync(resolve(root,'app/marketplaces/ProductsStock.tsx'),'utf8');
  assert.ok(source.indexOf('<CampoBusca id={searchId}') < source.indexOf('<div id={warehouseId ?'));
  assert.match(source,/warehouseId \? `warehouse-\$\{warehouseId\}-search` : 'local-product-search'/);
  assert.match(source,/productSearchDelay\(query\)/);
  assert.match(source,/generation.current === revision/);
  assert.match(source,/controller.current\?\.abort\(\); generation.current\+\+/);
  assert.match(source,/scrollMarketplaceRow\(panel.current\)/);
  assert.match(source,/focus\(\{ preventScroll: true \}\)/);
  const client=readFileSync(resolve(root,'app/marketplaces/MarketplacesClient.tsx'),'utf8');
  assert.match(client,/<ProductSearchShortcut onClick=\{\(\) => productSearchRef.current\?\.focusSearch\(\)\}/);
  const route=readFileSync(resolve(root,'app/api/modulos/marketplaces/produtos/route.ts'),'utf8');
  assert.match(route,/authorizeMarketplace\(request, params.get\('empresaId'\)\)/);
  assert.match(route,/listLocalProducts\([^\n]+request.signal/);
});

test('atalho flutuante fica a 20% em repouso e 100% no mouse, foco ou pressão sem animar', () => {
  const css=readFileSync(resolve(root,'app/marketplaces/marketplaces.module.css'),'utf8');
  const resting=css.match(/\.page \.productSearchShortcut \{([^}]+)\}/)?.[1];
  assert.match(resting,/opacity:\.2;/);
  assert.doesNotMatch(resting,/transition:|animation:/);
  assert.match(css,/\.page \.productSearchShortcut:is\(:hover,:focus-visible,:active\) \{ opacity:1; \}/);
});
