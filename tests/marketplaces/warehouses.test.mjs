import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..');
const hooks=registerHooks({resolve(s,c,next){
  if(s==='server-only')return{url:'data:text/javascript,export{}',shortCircuit:true};
  if(s==='./management-access')return{url:'data:text/javascript,export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}',shortCircuit:true};
  if(s.startsWith('.')&&c.parentURL?.startsWith('file:')&&!s.endsWith('.ts'))return next(pathToFileURL(resolve(dirname(new URL(c.parentURL).pathname),s+'.ts')).href,c);
  return next(s,c);
}});
const {listWarehouses,warehouseContext,productAllocations,warehouseCommand}=await import('../../app/modules/marketplaces/services/warehouses.ts');hooks.deregister();
const company=crypto.randomUUID(),actor=crypto.randomUUID(),product=crypto.randomUUID(),online=crypto.randomUUID(),offline=crypto.randomUUID();
function database({many=false,failed=false}={}) {
  const reads=[],calls=[];
  const warehouses=many?Array.from({length:520},(_,i)=>({id:`w${i}`,name:`Estoque ${i}`,is_online:i===0})):[{id:online,name:'Online',is_online:true},{id:offline,name:'Saldão',is_online:false}];
  const balances=many?warehouses.map(w=>({warehouse_id:w.id,product_id:product,quantity:1,revision:1,confirmed_at:'2026-10-19'})):[{warehouse_id:online,product_id:product,quantity:1,revision:3,confirmed_at:'2026-10-19'},{warehouse_id:offline,product_id:product,quantity:2,revision:4,confirmed_at:'2026-10-19'}];
  return {reads,calls,from(table){let start=0,end=499;return{select(){return this;},eq(k,v){reads.push([table,k,v]);return this;},in(k,v){reads.push([table,k,v]);return this;},is(){return this;},order(){return this;},range(a,b){start=a;end=b;return this;},abortSignal(){return this;},then(done){return Promise.resolve(failed?{data:null,error:{code:'503'}}:{data:(table==='marketplace_warehouses'?warehouses:balances).slice(start,end+1),error:null}).then(done);}};},async rpc(name,args){calls.push({name,args});return{data:{warehouseId:args.p_data.warehouseId},error:null};}};
}
test('leitura por empresa distingue online/offline e pagina sem truncar quantidade de estoques',async()=>{
  const db=database(),ctx=await warehouseContext(db,company,product);
  assert.equal(ctx.warehousesReady,true);assert.deepEqual(ctx.warehouses.map(w=>[w.name,w.quantity,w.revision]),[['Online',1,3],['Saldão',2,4]]);
  const distribution=(await productAllocations(db,company,[product])).get(product);assert.equal(distribution.reduce((n,w)=>n+w.quantity,0),3);
  assert.ok(db.reads.filter(r=>r[1]==='empresa_id').every(r=>r[2]===company));
  const many=database({many:true});assert.equal((await listWarehouses(many,company)).length,520);assert.equal((await warehouseContext(many,company,product)).warehouses.length,520);
  const failed=await warehouseContext(database({failed:true}),company,product);assert.equal(failed.warehousesReady,false);assert.match(failed.warehouseError,/Não foi possível/);assert.deepEqual(failed.warehouses,[]);
});
test('comando valida entrada/transferência, envia apenas perfil e ator autorizados e rejeita dados incompletos',async()=>{
  const db=database(),input={action:'transfer',warehouseId:online,destinationId:offline,productId:product,quantity:1,revision:3,destinationRevision:4,requestKey:crypto.randomUUID(),empresaId:crypto.randomUUID(),is_online:true};
  await warehouseCommand(db,company,actor,input);
  const call=db.calls[0];assert.equal(call.name,'marketplace_warehouse_command');assert.equal(call.args.p_empresa_id,company);assert.equal(call.args.p_actor_id,actor);assert.equal(call.args.p_data.is_online,undefined);assert.equal(call.args.p_data.destinationId,offline);
  for(const patch of [{quantity:-1},{quantity:1.5},{destinationId:online},{destinationRevision:0},{requestKey:'invalid'},{warehouseId:'invalid'}])await assert.rejects(warehouseCommand(db,company,actor,{...input,...patch}));
  await warehouseCommand(db,company,actor,{...input,internalNotes:'  Sem caixa  ',internalNotesRevision:2});
  assert.equal(db.calls.at(-1).name,'marketplace_warehouse_command_with_notes');
  assert.equal(db.calls.at(-1).args.p_data.internalNotes,'Sem caixa');
  for(const patch of [{internalNotes:'x'.repeat(161),internalNotesRevision:0},{internalNotes:'Nota',internalNotesRevision:-1},{internalNotes:'Nota',internalNotesRevision:1.5},{internalNotes:123,internalNotesRevision:0}])await assert.rejects(warehouseCommand(db,company,actor,{...input,...patch}));
  await assert.rejects(warehouseCommand(db,company,actor,{action:'create',name:' ',requestKey:crypto.randomUUID()}));
});
test('estrutura separa cards, total/distribuição e estoque legado fica reservado ao online',()=>{
  const read=file=>readFileSync(resolve(root,file),'utf8');
  assert.match(read('app/marketplaces/ProductsStock.tsx'),/id="products-title"[^>]*>Produtos cadastrados<\/h2>/);
  assert.match(read('app/marketplaces/MarketplacesClient.tsx'),/<WarehousesPanel[^\n]* key=/);
  assert.match(read('app/marketplaces/WarehousesPanel.tsx'),/useState\(false\)/);
  const control=read('app/marketplaces/PriceProductStock.tsx');for(const text of ['Entrada','Saldo final','Transferir','Estoque de destino'])assert.ok(control.includes(text));
  assert.match(control,/warehouseId:selected.id/);assert.match(control,/destinationRevision:destination.revision/);
  assert.match(read('app/modules/marketplaces/services/inventory-worker.ts'),/select\('stock_quantity,revision,listing_stock_review_at'\)/);
  const sql=read('supabase/migrations/20261019230000_marketplace_warehouses.sql');assert.match(sql,/select p.empresa_id,w.id,p.id,p.stock_quantity,p.stock_confirmed_at/);assert.doesNotMatch(sql,/cancelled|canceled|refund/);
});
