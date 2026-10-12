import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { initialListingQuantity, defaultInitialStockSelections } from '../../app/modules/marketplaces/services/initial-stock-model.ts';

const root = resolve(import.meta.dirname, '../..');
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true };
  if (specifier.endsWith('/management-access') || specifier === './management-access') return { url: 'data:text/javascript,export class MarketplaceError extends Error { constructor(status,code,message){super(message);this.status=status;this.code=code;} }', shortCircuit: true };
  let candidate;
  if (specifier.startsWith('@/')) candidate = resolve(root, specifier.slice(2));
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) candidate = resolve(dirname(new URL(context.parentURL).pathname), specifier);
  if (candidate && existsSync(`${candidate}.ts`)) return next(pathToFileURL(`${candidate}.ts`).href, context);
  return next(specifier, context);
} });
const { previewInitialStock, applyInitialStock } = await import('../../app/modules/marketplaces/services/initial-stock.ts');
const { sealMarketplaceSecret } = await import('../../app/modules/marketplaces/services/secret-vault.ts');
hooks.deregister();

const company = '11111111-1111-4111-8111-111111111111';
const other = '99999999-9999-4999-8999-999999999999';
const account = '22222222-2222-4222-8222-222222222222';
const account2 = '33333333-3333-4333-8333-333333333333';
const product = '44444444-4444-4444-8444-444444444444';
const listing = 'MLB5999999999';
const actor = '55555555-5555-4555-8555-555555555555';

class Query {
  constructor(db, table) { this.db=db; this.table=table; this.filters=[]; this.one=false; this.count=Infinity; }
  select() { return this; }
  eq(key,value) { this.filters.push(row=>row[key]===value); return this; }
  is(key,value) { this.filters.push(row=>(row[key]??null)===value); return this; }
  gt(key,value) { this.filters.push(row=>row[key]>value); return this; }
  order(key) { this.sort=key; return this; }
  limit(count) { this.count=count; return this; }
  maybeSingle() { this.one=true; return this; }
  then(success,failure) { return Promise.resolve().then(()=>{
    let rows=(this.db.tables[this.table]||[]).filter(row=>this.filters.every(filter=>filter(row)));
    if(this.sort) rows=rows.toSorted((a,b)=>String(a[this.sort]).localeCompare(String(b[this.sort])));
    rows=rows.slice(0,this.count);
    return {error:null,data:structuredClone(this.one?rows[0]||null:rows)};
  }).then(success,failure); }
}

function setup(t, itemChanges={}) {
  const oldKey=process.env.MARKETPLACE_SECRETS_KEY; process.env.MARKETPLACE_SECRETS_KEY=Buffer.alloc(32,8).toString('base64url');
  t.after(()=>{if(oldKey===undefined) delete process.env.MARKETPLACE_SECRETS_KEY; else process.env.MARKETPLACE_SECRETS_KEY=oldKey;});
  const item={id:listing,seller_id:230210240,status:'active',available_quantity:5,variations:[],sub_status:[],...itemChanges};
  const connection={id:account,empresa_id:company,provider:'mercado_livre',seller_reference:'230210240',seller_name:'FEJE',status:'connected',expires_at:new Date(Date.now()+3600000).toISOString(),token_sealed:sealMarketplaceSecret(JSON.stringify({accessToken:'test',refreshToken:'test-refresh'}))};
  const db={tables:{marketplace_products:[{id:product,empresa_id:company,name:'Produto',revision:1,stock_quantity:null,archived_at:null}],marketplace_product_links:[{id:crypto.randomUUID(),empresa_id:company,product_id:product,connection_id:account,provider:'mercado_livre',provider_listing_id:listing,reported_stock:999,status:'paused'}],marketplace_connections:[connection]},movements:[],calls:[],
    from(table){return new Query(this,table);},
    async rpc(name,args){
      assert.equal(name,'marketplace_product_command'); assert.equal(args.p_action,'confirm_stock'); assert.equal(args.p_empresa_id,company); assert.equal(args.p_actor_id,actor);
      const row=this.tables.marketplace_products.find(row=>row.id===args.p_data.product_id && row.empresa_id===args.p_empresa_id);
      if(row.revision!==args.p_data.revision) return {error:{code:'P0001',message:'O cadastro foi atualizado por outra operação.'}};
      row.stock_quantity=args.p_data.quantity; row.revision++; this.movements.push(args.p_data);
      return {data:{product_id:row.id,created:false},error:null};
    }};
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    db.calls.push({path:new URL(url).pathname,method:options.method}); assert.equal(options.method,'GET');
    return Response.json(item);
  });
  const input={productId:product,revision:1,connectionId:account,listingId:listing,quantity:5,confirmation:true,requestKey:crypto.randomUUID()};
  return {db,item,input,connection};
}

test('carga inicial aceita apenas anúncio ativo positivo, sem variações ou exclusão',()=>{
  const item={status:'active',available_quantity:5,variations:[],sub_status:[]};
  assert.equal(initialListingQuantity(item),5);
  assert.equal(initialListingQuantity({...item,sub_status:undefined}),5);
  for(const changes of [{status:'paused'},{status:'closed'},{status:'inactive'},{available_quantity:0},{available_quantity:null},{available_quantity:'5'},{available_quantity:2.5},{variations:[{available_quantity:5}]},{sub_status:['deleted']},{variations:undefined}]) assert.equal(initialListingQuantity({...item,...changes}),null);
});

test('múltiplos anúncios exigem escolha e nunca somam ou escolhem o maior saldo',()=>{
  const source={connectionId:account,listingId:listing,quantity:5,accountName:'FEJE',checkedAt:'2026-10-11T12:00:00Z'};
  const rows=[{productId:'one',sources:[source]},{productId:'many',sources:[source,{...source,connectionId:account2,quantity:9}]},{productId:'failed',sources:[source],warning:'Consulta parcial'},{productId:'none',sources:[]}];
  assert.deepEqual(defaultInitialStockSelections(rows),{one:`${account}:${listing}`,many:'',failed:'',none:''});
});

test('revisão lê o ML atual, ignora o cache e não grava saldo nem altera anúncio',async t=>{
  const {db}=setup(t); const result=await previewInitialStock(db,company,null);
  assert.equal(result.rows[0].sources[0].quantity,5); assert.equal(result.nextCursor,null);
  assert.equal(db.tables.marketplace_products[0].stock_quantity,null); assert.equal(db.movements.length,0);
  assert.deepEqual(db.calls,[{path:`/items/${listing}`,method:'GET'}]);
});

test('aplicação registra uma origem; repetir ou ajustar depois não reimporta saldo',async t=>{
  const {db,input}=setup(t);
  const result=await applyInitialStock(db,company,actor,input);
  assert.equal(result.status,'loaded'); assert.equal(result.quantity,5); assert.equal(db.movements.length,1);
  assert.match(db.movements[0].note,/Carga inicial.*MLB5999999999.*FEJE.*sem soma/);
  db.tables.marketplace_products[0].stock_quantity=3;
  assert.equal((await applyInitialStock(db,company,actor,input)).status,'preserved');
  assert.equal(db.tables.marketplace_products[0].stock_quantity,3); assert.equal(db.movements.length,1); assert.equal(db.calls.length,1);
});

test('saldo local zero é definido e preservado, não tratado como desconhecido',async t=>{
  const {db,input}=setup(t); db.tables.marketplace_products[0].stock_quantity=0;
  assert.equal((await previewInitialStock(db,company,null)).rows.length,0);
  assert.equal((await applyInitialStock(db,company,actor,input)).status,'preserved');
  assert.equal(db.calls.length,0); assert.equal(db.movements.length,0);
});

test('quantidade, revisão e confirmação obsoletas não passam para o banco',async t=>{
  const {db,input,item}=setup(t);
  await assert.rejects(applyInitialStock(db,company,actor,{...input,confirmation:false}),e=>e.code==='invalid_stock_review');
  await assert.rejects(applyInitialStock(db,company,actor,{...input,revision:2}),e=>e.code==='product_changed');
  item.available_quantity=7;
  await assert.rejects(applyInitialStock(db,company,actor,input),e=>e.code==='stock_changed');
  assert.equal(db.movements.length,0); assert.equal(db.tables.marketplace_products[0].stock_quantity,null);
});

test('vínculo, empresa e vendedor são conferidos antes de registrar saldo',async t=>{
  const {db,input,item}=setup(t);
  await assert.rejects(applyInitialStock(db,other,actor,input),e=>e.code==='product_missing');
  await assert.rejects(applyInitialStock(db,company,actor,{...input,connectionId:account2}),e=>e.code==='listing_missing');
  assert.equal(db.calls.length,0);
  item.seller_id=123;
  await assert.rejects(applyInitialStock(db,company,actor,input),e=>e.code==='listing_not_found');
  assert.equal(db.movements.length,0);
});

test('anúncio zerado ou inativo desde a revisão não zera nem inicializa o local',async t=>{
  const {db,item,input}=setup(t);
  for(const change of [{available_quantity:0,status:'active'},{available_quantity:5,status:'paused'},{available_quantity:5,status:'closed'}]) {
    Object.assign(item,change);
    assert.equal((await previewInitialStock(db,company,null)).rows[0].sources.length,0);
    await assert.rejects(applyInitialStock(db,company,actor,input),e=>e.code==='listing_not_eligible');
  }
  assert.equal(db.movements.length,0); assert.equal(db.tables.marketplace_products[0].stock_quantity,null);
});

test('resposta incompleta ou falha do ML gera aviso, não estoque zero ou sucesso',async t=>{
  const {db,item,input}=setup(t); delete item.available_quantity;
  const result=await previewInitialStock(db,company,null);
  assert.ok(result.rows[0].warning); assert.equal(result.rows[0].sources.length,0);
  await assert.rejects(applyInitialStock(db,company,actor,input),e=>e.code==='invalid_response');
  assert.equal(db.movements.length,0);
});

test('ajuste concorrente durante a consulta mantém o saldo e bloqueia a gravação antiga',async t=>{
  const {db,input,item}=setup(t);
  t.mock.method(globalThis,'fetch',async()=>{db.tables.marketplace_products[0].stock_quantity=2; db.tables.marketplace_products[0].revision=2; return Response.json(item);});
  await assert.rejects(applyInitialStock(db,company,actor,input),e=>e.code==='product_conflict');
  assert.equal(db.tables.marketplace_products[0].stock_quantity,2); assert.equal(db.movements.length,0);
});

test('falta de configuração local não desconecta conta nem confirma estoque',async t=>{
  const {db,input}=setup(t); delete process.env.MARKETPLACE_SECRETS_KEY;
  await assert.rejects(previewInitialStock(db,company,null),e=>e.code==='local_integration_not_configured');
  await assert.rejects(applyInitialStock(db,company,actor,input),e=>e.code==='local_integration_not_configured');
  assert.equal(db.calls.length,0); assert.equal(db.tables.marketplace_connections[0].status,'connected'); assert.equal(db.movements.length,0);
});

test('endpoint exige gestão, usa empresa/ator autorizados; interface exige revisão e confirmação',()=>{
  const route=readFileSync(new URL('../../app/api/modulos/marketplaces/produtos/estoque-anuncios/route.ts',import.meta.url),'utf8');
  assert.match(route,/authorizeMarketplace\(request, body.empresaId, 'manage'\)/); assert.match(route,/applyInitialStock\(db, empresaId, usuario.id, body\)/); assert.match(route,/'Cache-Control': 'no-store'/);
  const ui=readFileSync(new URL('../../app/marketplaces/InitialStockLoad.tsx',import.meta.url),'utf8');
  assert.match(ui,/defaultInitialStockSelections\(collected\)/); assert.match(ui,/ModalConfirmacao/); assert.match(ui,/confirmation: true/); assert.match(ui,/Saldos já definidos, inclusive zero, não serão substituídos/);
  assert.match(ui,/sincronização automática usará esses saldos nos anúncios vinculados compatíveis/);
  assert.doesNotMatch(ui,/setTimeout\([^\n]*apply\(/);
  const css=readFileSync(new URL('../../app/marketplaces/marketplaces.module.css',import.meta.url),'utf8');
  assert.match(css,/\.localStockLoad \{ margin-bottom: 24px; \}/);
  assert.match(css,/\.localStockLoad button, \.initialStockTrigger \{ min-height: 48px !important; \}/);
});

test('confirmação inicial precede a consulta; confirmação final permanece obrigatória antes da gravação',()=>{
  const products=readFileSync(new URL('../../app/marketplaces/ProductsStock.tsx',import.meta.url),'utf8');
  assert.match(products,/onClick=\{\(\) => setStockLoadConfirmation\(true\)\}>Carregar estoque dos anúncios/);
  assert.doesNotMatch(products,/onClick=\{\(\) => setStockLoadOpen\(true\)\}>Carregar estoque dos anúncios/);
  assert.match(products,/ModalConfirmacao aberto=\{stockLoadConfirmation\}/);
  assert.match(products,/Nada será salvo nesta consulta/);
  assert.match(products,/setStockLoadConfirmation\(false\); setStockLoadOpen\(true\)/);
  const ui=readFileSync(new URL('../../app/marketplaces/InitialStockLoad.tsx',import.meta.url),'utf8');
  assert.match(ui,/onClick=\{\(\) => setConfirming\(true\)\}/);
  assert.match(ui,/aoConfirmar=\{\(\) => \{ void apply\(\); \}\}/);
});

test('ações da carga inicial ficam antes dos resultados, sem duplicar no rodapé',()=>{
  const ui=readFileSync(new URL('../../app/marketplaces/InitialStockLoad.tsx',import.meta.url),'utf8');
  const results=ui.indexOf("{phase !== 'loading' && <>");
  assert.ok(results>0);
  for(const action of ['`Carregar ${selected.length} saldos no local`','Consultar novamente',"'Fechar'"]) {
    const position=ui.indexOf(action);
    assert.ok(position>=0&&position<results,`${action} deve ficar antes dos resultados`);
  }
  assert.equal((ui.match(/<div className=\{styles\.actionBar\}>/g)||[]).length,1);
});

test('cursor percorre pendentes sem incluir outra empresa ou saldos definidos',async t=>{
  const {db}=setup(t); db.tables.marketplace_products=[]; db.tables.marketplace_product_links=[];
  const ids=['66666666-6666-4666-8666-666666666661','66666666-6666-4666-8666-666666666662','66666666-6666-4666-8666-666666666663','66666666-6666-4666-8666-666666666664'];
  for(const id of ids) db.tables.marketplace_products.push({id,empresa_id:company,name:'Produto',revision:1,stock_quantity:null});
  db.tables.marketplace_products.push({id:product,empresa_id:other,name:'Outra empresa',revision:1,stock_quantity:null});
  const first=await previewInitialStock(db,company,null);
  assert.deepEqual(first.rows.map(row=>row.productId),ids.slice(0,3)); assert.equal(first.nextCursor,ids[2]);
  const last=await previewInitialStock(db,company,first.nextCursor);
  assert.deepEqual(last.rows.map(row=>row.productId),ids.slice(3)); assert.equal(last.nextCursor,null); assert.equal(db.calls.length,0);
});

test('403 na consulta é pendência explícita e mantém estoque e conexão',async t=>{
  const {db,input}=setup(t); t.mock.method(globalThis,'fetch',async()=>Response.json({private:'não repassar'},{status:403}));
  const result=await previewInitialStock(db,company,null); assert.ok(result.rows[0].warning); assert.equal(result.rows[0].sources.length,0);
  await assert.rejects(applyInitialStock(db,company,actor,input),e=>e.code==='provider_403');
  assert.equal(db.tables.marketplace_connections[0].status,'connected'); assert.equal(db.movements.length,0);
});

test('duas contas do mesmo produto carregam só a origem escolhida, não 5 + 9',async t=>{
  const {db,input,item,connection}=setup(t); const listing2='MLB5888888888';
  db.tables.marketplace_connections.push({...connection,id:account2,seller_reference:'230210241',seller_name:'Aline'});
  db.tables.marketplace_product_links.push({id:crypto.randomUUID(),empresa_id:company,product_id:product,connection_id:account2,provider:'mercado_livre',provider_listing_id:listing2});
  t.mock.method(globalThis,'fetch',async url=>Response.json(new URL(url).pathname.endsWith(listing2)?{...item,id:listing2,seller_id:230210241,available_quantity:9}:item));
  const result=await previewInitialStock(db,company,null);
  assert.equal(result.rows[0].sources.length,2); assert.equal(defaultInitialStockSelections(result.rows)[product],'');
  await applyInitialStock(db,company,actor,input);
  assert.equal(db.tables.marketplace_products[0].stock_quantity,5); assert.equal(db.movements.length,1);
});
