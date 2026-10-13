import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { inventoryLines, listingStockPolicy, safeMarketplaceLink } from '../../app/modules/marketplaces/services/inventory-model.ts';
import { inventoryIssueMessage, providerName } from '../../app/modules/marketplaces/live-feed.ts';
const read = path => readFileSync(new URL(`../../${path}`,import.meta.url),'utf8');

test('agendador é configurado desativado até a publicação, sem credenciais ML no comando',()=>{
  const sql=read('supabase/operations/marketplace_inventory_scheduler.sql');
  const executable=sql.replace(/^--.*$/gm,'');
  assert.match(executable,/cron\.schedule\('avantalab-marketplace-inventory-v1','30 seconds'/);
  assert.match(executable,/select cron\.alter_job\(jobid,active:=false\) from cron\.job where jobname='avantalab-marketplace-inventory-v1';\s*commit;/);
  assert.doesNotMatch(executable,/active[:]?=true|service_role.*Bearer|access_token/i);
  assert.match(executable,/revoke all on function public\.marketplace_inventory_tick\(\) from public,anon,authenticated/);
  assert.match(sql,/schema net FORA dos schemas expostos pela Data API/);
});

test('itens de estoque usam IDs e quantidades reais, agregam linhas iguais, sem fabricar unidades',()=>{
  const row=(quantity,id='MLB123456',variation_id=null)=>({quantity,item:{id,variation_id,title:'Produto'}});
  assert.deepEqual(inventoryLines([row(2),row(3),row(1,'MLB654321',42)]),[
    {listingId:'MLB123456',variationId:'',quantity:5,title:'Produto'}, {listingId:'MLB654321',variationId:'42',quantity:1,title:'Produto'}]);
  for(const quantity of [null,undefined,'1',0,-1,1.2,100000]) assert.throws(()=>inventoryLines([row(quantity)]),/invalid_inventory_line/);
  assert.throws(()=>inventoryLines([row(1,'../orders/1')]),/invalid_inventory_line/);
  assert.throws(()=>inventoryLines([row(99999),row(1)]),/invalid_inventory_quantity/);
});
test('não escreve por tentativa em Full, multiorigem, variações, pausados manuais ou saldo remoto menor',()=>{
  const item={status:'active',sub_status:[],variations:[],available_quantity:5,shipping:{logistic_type:'cross_docking'}};
  assert.equal(listingStockPolicy(item,[],3,false),'write');
  assert.equal(listingStockPolicy(item,[],5,false),'equal');
  assert.equal(listingStockPolicy(item,[],6,false),'lower_remote_stock');
  assert.equal(listingStockPolicy(item,[],6,true),'write');
  assert.equal(listingStockPolicy(item,['warehouse_management'],3,false),'warehouse');
  assert.equal(listingStockPolicy({...item,shipping:{logistic_type:'fulfillment'}},[],3,false),'fulfillment');
  assert.equal(listingStockPolicy({...item,variations:[{id:1}]},[],3,false),'variations');
  assert.equal(listingStockPolicy({...item,status:'paused'},[],3,false),'inactive');
  assert.equal(listingStockPolicy({...item,status:'paused',sub_status:['out_of_stock']},[],0,false),'write');
  assert.equal(listingStockPolicy({...item,variations:undefined},[],3,false),'variations');
});
test('links de avisos não permitem scripts, credenciais ou domínios externos; avisos são em português',()=>{
  assert.equal(safeMarketplaceLink('mercado_livre','https://produto.mercadolivre.com.br/MLB-123456'), 'https://produto.mercadolivre.com.br/MLB-123456');
  for(const link of ['javascript:alert(1)','https://evil.test','https://mercadolivre.com.br.evil.test','http://produto.mercadolivre.com.br/x','https://user:pass@produto.mercadolivre.com.br/x']) assert.equal(safeMarketplaceLink('mercado_livre',link),null);
  assert.equal(safeMarketplaceLink('future','https://produto.mercadolivre.com.br/x'),null);
  assert.equal(providerName('mercado_livre'),'Mercado Livre');
  assert.match(inventoryIssueMessage('product_not_linked'),/Vincule/); assert.match(inventoryIssueMessage('fulfillment'),/Full/);
});

async function fixture() {
  const db=new PGlite();
  await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role;
    create table auth.users(id uuid primary key); create table empresas(id uuid primary key);
    create table usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text);
    create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);
    create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text,status text,seller_name text);
    create table marketplace_listings(id uuid primary key default gen_random_uuid(),empresa_id uuid,connection_id uuid,provider_listing_id text,search_text text,status text,snapshot jsonb,synced_at timestamptz default now());`);
  await db.exec(read('supabase/migrations/20261007230000_marketplace_sales_notifications.sql'));
  await db.exec(read('supabase/migrations/20261011200000_marketplace_local_products.sql'));
  const company=crypto.randomUUID(),other=crypto.randomUUID(),actor=crypto.randomUUID(),second=crypto.randomUUID(),conn=crypto.randomUUID(),conn2=crypto.randomUUID(),wrong=crypto.randomUUID();
  await db.query('insert into empresas values($1),($2)',[company,other]); await db.query('insert into auth.users values($1),($2)',[actor,second]);
  await db.query("insert into usuarios_empresa values($1,$2,'ativo','administrador'),($3,$2,'ativo','operador_simples')",[actor,company,second]);
  await db.query("insert into empresa_modulos values($1,'marketplaces',true,null)",[company]);
  await db.query("insert into marketplace_connections values($1,$2,'mercado_livre','connected','Conta A'),($3,$2,'mercado_livre','connected','Conta B'),($4,$5,'mercado_livre','connected','Outra empresa')",[conn,company,conn2,wrong,other]);
  await db.exec(read('supabase/migrations/20261012010000_marketplace_inventory_sync.sql'));
  await db.exec(read('supabase/migrations/20261012230000_marketplace_sales_history.sql'));
  await db.query("update marketplace_inventory_settings set activated_at=now()-interval '2 days'");
  const command=async(action,data)=>(await db.query('select marketplace_product_command($1,$2,$3,$4,$5) as r',[company,actor,action,JSON.stringify(data),crypto.randomUUID()])).rows[0].r;
  const product=async(name='Produto',stock=8)=>{
    const result=await command('create',{name,...(stock===null?{}:{stock_quantity:stock,physical_confirmation:true})});
    if(stock!==null) await db.query("update marketplace_products set stock_baseline_at=now()-interval '1 day' where id=$1",[result.product_id]);
    return result.product_id;
  };
  const link=async(product_id,connection_id=conn,provider_listing_id='MLB123456')=>command('link',{product_id,connection_id,provider:'mercado_livre',provider_listing_id,title:'Produto',reported_stock:8,status:'active'});
  const save=async(orderId='100',connection=conn,lines=[{listingId:'MLB123456',variationId:'',quantity:2,title:'Produto'}],patch={})=>{
    const snapshot={confirmedAt:new Date(Date.now()-3_600_000).toISOString(),providerUpdatedAt:new Date().toISOString(),inventoryLines:lines,...patch};
    return db.query(`insert into marketplace_sales(empresa_id,connection_id,provider_order_id,status,snapshot)
      values($1,$2,$3,$4,$5) on conflict(connection_id,provider_order_id) do update set status=excluded.status,snapshot=excluded.snapshot,updated_at=now() returning id`,[company,connection,orderId,patch.status||'paid',JSON.stringify(snapshot)]);
  };
  return {db,company,other,actor,second,conn,conn2,wrong,product,link,save,command,
    stock:async(id)=>(await db.query('select stock_quantity from marketplace_products where id=$1',[id])).rows[0].stock_quantity,
    feed:async(user=actor)=>(await db.query('select marketplace_live_feed($1,$2) as r',[company,user])).rows[0].r};
}

test('SQL real: uma baixa por item/pedido, saldo central para duas contas, auditoria e fila atômicos',async()=>{
  const f=await fixture(); try{
    const p=await f.product(); await f.link(p); await f.link(p,f.conn2,'MLB654321');
    await f.save(); await f.save(); await f.save(); assert.equal(await f.stock(p),6);
    await f.save('200',f.conn2,[{listingId:'MLB654321',variationId:'',quantity:3,title:'Produto'}]); assert.equal(await f.stock(p),3);
    const jobs=await f.db.query('select desired_quantity,allow_increase from marketplace_inventory_outbox'); assert.equal(jobs.rows.length,2); assert.ok(jobs.rows.every(row=>row.desired_quantity===3&&!row.allow_increase));
    const moves=await f.db.query("select kind,actor_id,stock_before,stock_after from marketplace_stock_movements where kind='sale'");
    assert.deepEqual(moves.rows.map(m=>[m.kind,m.actor_id,m.stock_before,m.stock_after]),[['sale',null,8,6],['sale',null,6,3]]);
    assert.equal((await f.feed()).alerts.length,2);
  }finally{await f.db.close();}
});
test('SQL real: histórico, saldo desconhecido, falta de vínculo e variações nunca dão baixa inventada',async()=>{
  const f=await fixture();try{
    const p=await f.product('Saldo inicial',8);await f.link(p);
    await f.save('1',f.conn,undefined,{confirmedAt:new Date(Date.now()-3*86_400_000).toISOString()});assert.equal(await f.stock(p),8);
    assert.equal((await f.feed()).alerts.length,0);
    const pending=await f.product('Pendente',null);await f.link(pending,f.conn,'MLB234567');
    await f.save('2',f.conn,[{listingId:'MLB234567',variationId:'',quantity:2,title:'Pendente'}]);assert.equal(await f.stock(pending),null);
    await f.save('3',f.conn,[{listingId:'MLB345678',variationId:'',quantity:1,title:'Sem vínculo'}]);
    await f.save('4',f.conn,[{listingId:'MLB123456',variationId:'42',quantity:1,title:'Variação'}]);assert.equal(await f.stock(p),8);
    const issues=(await f.db.query("select issue from marketplace_inventory_events where state='pending' order by order_id")).rows.map(row=>row.issue);
    assert.deepEqual(issues,['stock_not_confirmed','product_not_linked','variation_not_linked']);
  }finally{await f.db.close();}
});
test('SQL real: anúncio sem saldo fica ativo operacionalmente enquanto a venda antiga aguarda envio, sem nova baixa ou popup',async()=>{
  const f=await fixture();try{
    const p=await f.product('Purificador',8);await f.link(p);
    await f.db.query("insert into marketplace_listings(empresa_id,connection_id,provider_listing_id,status,snapshot) values($1,$2,'MLB123456','paused','{\"stock\":0}')",[f.company,f.conn]);
    await f.save('2000000000000101',f.conn,undefined,{confirmedAt:new Date(Date.now()-3*86400000).toISOString()});
    await f.db.query("update marketplace_sales set shipment_status='ready_to_ship' where provider_order_id='2000000000000101'");
    const row=(await f.db.query('select status,operational_status,operations from marketplace_listing_operations where empresa_id=$1',[f.company])).rows[0];
    assert.equal(row.status,'paused');assert.equal(row.operational_status,'active');assert.deepEqual(row.operations,{count:1,labels:['Aguardando envio']});
    assert.equal(await f.stock(p),8);assert.equal((await f.feed()).alerts.length,0);
    await f.save('2000000000000101',f.conn,undefined,{confirmedAt:new Date(Date.now()-3*86400000).toISOString()});
    assert.equal(await f.stock(p),8);
    await f.db.query("update marketplace_sales set shipment_status='delivered' where provider_order_id='2000000000000101'");
    assert.equal((await f.db.query('select operational_status from marketplace_listing_operations')).rows[0].operational_status,'paused');
    const rights=(await f.db.query("select has_table_privilege('authenticated','marketplace_listing_operations','SELECT') as listing,has_table_privilege('authenticated','marketplace_pending_sales','SELECT') as sale")).rows[0];
    assert.deepEqual(rights,{listing:false,sale:false});
  }finally{await f.db.close();}
});
test('SQL real: cancelamento/devolução não encerrados permanecem ativos; conclusão confirmada sai dos ativos',async()=>{
  const f=await fixture();try{
    await f.db.query("insert into marketplace_listings(empresa_id,connection_id,provider_listing_id,status,snapshot) values($1,$2,'MLB123456','paused','{\"stock\":0}')",[f.company,f.conn]);
    await f.save('100',f.conn,undefined,{status:'pending_cancel'});
    const state=async()=>(await f.db.query('select operational_status,operations from marketplace_listing_operations')).rows[0];
    assert.deepEqual((await state()).operations.labels,['Cancelamento em processamento']);
    for(const progress of ['open','unknown','closed']) {
      await f.save('100',f.conn,undefined,{status:'cancelled',postSaleProgress:{state:progress,checkedAt:new Date().toISOString()}});
      assert.equal((await state()).operational_status,progress==='closed'?'paused':'active');
    }
    await f.db.query("update marketplace_listings set status='active'");
    assert.equal((await state()).operational_status,'inactive');
  }finally{await f.db.close();}
});
test('SQL real: cancelamento não repõe estoque, quantidade alterada gera pendência e saldo insuficiente não fica negativo',async()=>{
  const f=await fixture();try{
    const p=await f.product('Produto',1);await f.link(p);await f.save();assert.equal(await f.stock(p),0);
    await f.save('100',f.conn,undefined,{status:'cancelled'});assert.equal(await f.stock(p),0);assert.equal((await f.feed()).alerts.length,0);
    await f.save('100',f.conn,[{listingId:'MLB123456',variationId:'',quantity:3,title:'Alterado'}]);assert.equal(await f.stock(p),0);
    const event=(await f.db.query('select issue,shortfall,quantity from marketplace_inventory_events')).rows[0];
    assert.deepEqual(event,{issue:'order_quantity_changed',shortfall:1,quantity:2});
  }finally{await f.db.close();}
});
test('SQL real: confirmação física estabelece novo ponto inicial e não reaplica vendas já absorvidas',async()=>{
  const f=await fixture();try{
    const p=await f.product('Pendente',null);await f.link(p);await f.save();
    await f.command('confirm_stock',{product_id:p,revision:1,quantity:4,physical_confirmation:true});
    const event=(await f.db.query('select id from marketplace_inventory_events')).rows[0];
    await f.db.query('select marketplace_apply_inventory_event($1)',[event.id]);assert.equal(await f.stock(p),4);
    assert.equal((await f.db.query('select state from marketplace_inventory_events')).rows[0].state,'baseline');
    assert.equal((await f.db.query('select allow_increase from marketplace_inventory_outbox')).rows[0].allow_increase,true);
  }finally{await f.db.close();}
});
test('SQL real: avisos lidos por usuário não apagam os de outro e empresa/permissão são revalidadas',async()=>{
  const f=await fixture();try{
    const p=await f.product();await f.link(p);await f.save();const feed=await f.feed();assert.equal(feed.alerts[0].account_name,'Conta A');
    await f.db.query('insert into marketplace_sale_alert_reads(empresa_id,alert_id,user_id) values($1,$2,$3)',[f.company,feed.alerts[0].id,f.actor]);
    assert.equal((await f.feed()).alerts.length,0);assert.equal((await f.feed(f.second)).alerts.length,1);
    await assert.rejects(f.db.query('select marketplace_live_feed($1,$2)',[f.other,f.actor]),/Sem acesso/);
    await f.db.query("update usuarios_empresa set status='inativo' where user_id=$1",[f.second]);await assert.rejects(f.feed(f.second),/Sem acesso/);
    const rights=(await f.db.query("select has_table_privilege('authenticated','marketplace_sale_alerts','SELECT') as read,has_function_privilege('authenticated','marketplace_apply_inventory_event(uuid)','EXECUTE') as exec")).rows[0];
    assert.deepEqual(rights,{read:false,exec:false});
  }finally{await f.db.close();}
});
test('SQL real: leases do worker são exclusivas e uma resposta de pedido antiga não sobrescreve a nova',async()=>{
  const f=await fixture();try{
    const p=await f.product();await f.link(p);await f.save('100',f.conn,undefined,{providerUpdatedAt:'2026-10-11T15:00:00Z'});
    await f.save('100',f.conn,undefined,{providerUpdatedAt:'2026-10-11T14:00:00Z',status:'cancelled'});
    assert.equal((await f.db.query('select status from marketplace_sales')).rows[0].status,'paid');
    const claim=async()=>(await f.db.query('select marketplace_worker_claim($1) as r',[crypto.randomUUID()])).rows[0].r;
    assert.equal(await claim(),true);assert.equal(await claim(),false);
    assert.equal((await f.db.query("select marketplace_worker_authorized('wrong') as r")).rows[0].r,false);
  }finally{await f.db.close();}
});
test('SQL real: mudança de quantidade do anúncio não duplica baixa e renova geração do envio',async()=>{
  const f=await fixture();try{
    const p=await f.product();await f.link(p);await f.save();assert.equal(await f.stock(p),6);
    const before=(await f.db.query('select generation from marketplace_inventory_outbox')).rows[0].generation;
    await f.db.query('select marketplace_observe_listing($1,$2,$3,$4,$5)',[f.company,f.conn,'MLB123456',6,'active']);
    assert.equal(await f.stock(p),6);
    const after=(await f.db.query('select generation,allow_increase from marketplace_inventory_outbox')).rows[0];assert.notEqual(after.generation,before);assert.equal(after.allow_increase,false);
    await f.db.query('select marketplace_observe_listing($1,$2,$3,$4,$5)',[f.company,f.conn,'MLB123456',6,'active']);
    assert.equal((await f.db.query('select generation from marketplace_inventory_outbox')).rows[0].generation,after.generation);
  }finally{await f.db.close();}
});
test('webhook confirma recebimento após gravar a fila, usa after e popup reutiliza modal com leitura persistida',()=>{
  const webhook=read('app/api/webhooks/mercado-livre/route.ts'),monitor=read('app/components/MarketplaceLiveMonitor.tsx'),route=read('app/api/modulos/marketplaces/avisos/route.ts');
  assert.match(webhook,/await queueSaleNotification/);assert.match(webhook,/after\(async/);
  assert.match(monitor,/ModalConfirmacao aberto titulo=\{alert.kind === 'pending_dispatch' \? 'Venda pendente' : 'Nova venda'\}/);assert.match(monitor,/setInterval[\s\S]*10_000/);assert.match(monitor,/private: true/);
  assert.match(monitor,/action: 'acknowledge'/);assert.match(monitor,/Ver anúncio no/);assert.match(monitor,/safeMarketplaceLink/);
  assert.match(route,/user_id: usuario.id/);assert.match(route,/eq\('empresa_id', empresaId\)/);
  assert.match(read('app/gestao/page.tsx'),/modulosAtivos.includes\('marketplaces'\) && <MarketplaceLiveMonitor/);
});
