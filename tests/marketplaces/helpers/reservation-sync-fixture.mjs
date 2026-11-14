import {readFile} from 'node:fs/promises';
import {createReservationsFixture} from '../../../app/modules/marketplaces/dev/reservations-fixture.ts';
import {normalizeListing} from '../../../app/modules/marketplaces/services/listing-model.ts';
const ident=value=>{if(!/^[a-z_]+$/.test(value))throw Error('Identificador inválido no adaptador local');return '"'+value+'"';};
const jsonValue=v=>v&&typeof v==='object'?JSON.stringify(v):v;
const plain=v=>v instanceof Date?v.toISOString():Array.isArray(v)?v.map(plain):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,plain(x)])):v;
class Query{
 constructor(f,table){this.f=f;this.table=table;this.filters=[];this.orders=[];this.offset=0;}
 select(_,options){this.countOnly=options?.head;return this;}eq(k,v){this.filters.push([k,'=',v]);return this;}is(k,v){this.filters.push([k,'is',v]);return this;}in(k,v){this.filters.push([k,'in',v]);return this;}
 order(k,o){this.orders.push(ident(k)+(o?.ascending===false?' desc':' asc'));return this;}range(a,b){this.offset=a;this.maximum=b-a+1;return this;}limit(n){this.maximum=n;return this;}abortSignal(){return this;}
 maybeSingle(){this.singleResult=true;return this;}single(){this.singleResult=true;return this;}update(v){this.updateValue=v;return this;}insert(v){this.insertValue=v;return this;}upsert(v){this.insertValue=v;this.conflict='link_id';return this;}
 then(ok,bad){return this.run().then(ok,bad);}
 async run(){try{
  let args=[],sql='';const param=v=>{args.push(jsonValue(v));return '$'+args.length;};
  const where=()=>this.filters.length?' where '+this.filters.map(([k,op,v])=>op==='is'?ident(k)+' is null':op==='in'?ident(k)+' in ('+v.map(param).join(',')+')':ident(k)+'='+param(v)).join(' and '):'';
  if(this.insertValue){const entries=Object.entries(this.insertValue);sql='insert into '+ident(this.table)+'('+entries.map(([k])=>ident(k)).join(',')+') values('+entries.map(([,v])=>param(v)).join(',')+')';if(this.conflict)sql+=' on conflict('+ident(this.conflict)+') do update set '+entries.filter(([k])=>k!==this.conflict).map(([k])=>ident(k)+'=excluded.'+ident(k)).join(',');sql+=' returning *';}
  else if(this.updateValue){sql='update '+ident(this.table)+' set '+Object.entries(this.updateValue).map(([k,v])=>ident(k)+'='+param(v)).join(',')+where()+' returning *';}
  else{sql='select * from '+ident(this.table)+where();if(this.orders.length)sql+=' order by '+this.orders.join(',');if(this.maximum!==undefined)sql+=' limit '+param(this.maximum);if(this.offset)sql+=' offset '+param(this.offset);}
  const {rows}=await this.f.db.query(sql,args);const data=plain(rows);return {data:this.countOnly?null:this.singleResult?data[0]||null:data,count:data.length,error:null};
 }catch(e){return {data:null,error:{code:e.code,message:e.message}};}}
}
export async function createReservationSyncFixture(){
 const f=await createReservationsFixture();try{
  await f.db.exec(`alter table marketplace_connections add column seller_reference text;alter table marketplace_connections add column status text default 'connected';
   alter table marketplace_products add column listing_stock_review_at timestamptz;
   alter table marketplace_inventory_events add column id uuid default gen_random_uuid();alter table marketplace_inventory_events add column product_id uuid;alter table marketplace_inventory_events add column connection_id uuid;alter table marketplace_inventory_events add column listing_id text;
   create table marketplace_inventory_settings(empresa_id uuid primary key,enabled boolean default true);
   create table marketplace_inventory_outbox(link_id uuid primary key,empresa_id uuid,product_id uuid,desired_quantity integer,revision bigint,allow_increase boolean,generation uuid default gen_random_uuid(),state text default 'pending',issue text,attempts integer default 0,next_attempt_at timestamptz default now(),updated_at timestamptz default now(),synced_at timestamptz,protected_at timestamptz);
   create table marketplace_listing_stock_control(link_id uuid primary key,empresa_id uuid,product_id uuid,pause_requested_at timestamptz,pause_confirmed_at timestamptz,paused_by_system boolean default false,pause_reason text,updated_at timestamptz default now());
   create table marketplace_sale_notifications(id uuid default gen_random_uuid(),empresa_id uuid,connection_id uuid,processed_at timestamptz,topic text,resource text);
   create table marketplace_listing_actions(id uuid primary key default gen_random_uuid(),empresa_id uuid,connection_id uuid,provider_listing_id text,action text,request_key uuid unique,actor_id uuid,request_payload jsonb,status text default 'requested',error_code text,created_at timestamptz default now());
   drop function marketplace_enqueue_stock(uuid,uuid,boolean);`);
  // Fragmentos oficiais, com a mesma ampliação de providers da migração de paridade.
  const reconciliation=await readFile('supabase/migrations/20261021010000_marketplace_stock_reconciliation.sql','utf8');
  const enqueue=reconciliation.slice(reconciliation.indexOf('create or replace function public.marketplace_enqueue_stock'),reconciliation.indexOf('create or replace function public.marketplace_observe_listing'));
  if(!enqueue.includes("l.provider='mercado_livre'"))throw Error('Contrato oficial mudou');
  await f.db.exec(enqueue.replace("l.provider='mercado_livre'","l.provider in ('mercado_livre','magalu')"));
  await f.db.exec(await readFile('supabase/migrations/20261029160000_preservar_autorizacao_estoque_pendente.sql','utf8'));
  const inventory=await readFile('supabase/historico-sem-registro/20261012010000_marketplace_inventory_sync.sql','utf8');
  await f.db.exec(inventory.slice(inventory.indexOf('create function public.marketplace_stock_changed()'),inventory.indexOf('create function public.marketplace_link_changed()')));
  await f.db.query('insert into marketplace_inventory_settings values($1,true)',[f.company]);
  const balance=async w=>(await f.balances()).find(b=>b.id===w);
  const warehouse=async(action,data,key=crypto.randomUUID())=>(await f.db.query('select marketplace_warehouse_command($1,$2,$3,$4,$5) r',[f.company,f.actor,action,JSON.stringify(data),key])).rows[0].r;
  await warehouse('set',{productId:f.product,warehouseId:f.online,revision:(await balance(f.online)).revision,quantity:3});
  await warehouse('set',{productId:f.product,warehouseId:f.offline,revision:(await balance(f.offline)).revision,quantity:1});
  const remotes=new Map(),connections=new Map(),calls=[],ignored=new Set(),failures=new Set(),automation=new Set();
  for(let i=0;i<4;i++){
   const id=crypto.randomUUID(),link=crypto.randomUUID(),seller=String(900000+i),listing='MLB'+String(900001+i),name=['JEFF','ALINE','CIDY','ADRIANO'][i];
   const connection={id,empresa_id:f.company,seller_reference:seller,provider:'mercado_livre'};connections.set(id,{...connection,name,link,listing});
   await f.db.query("insert into marketplace_connections(id,empresa_id,provider,seller_reference) values($1,$2,'mercado_livre',$3)",[id,f.company,seller]);
   await f.db.query("insert into marketplace_product_links(id,empresa_id,product_id,connection_id,provider,provider_listing_id,title,reported_stock,status) values($1,$2,$3,$4,'mercado_livre',$5,'Produto de teste',3,'active')",[link,f.company,f.product,id,listing]);
   remotes.set(id,{id:listing,seller_id:Number(seller),category_id:'MLB123',title:'Produto de teste',catalog_listing:false,status:'active',sub_status:[],available_quantity:3,price:198,currency_id:'BRL',condition:'new',listing_type_id:'gold_special',buying_mode:'buy_it_now',sold_quantity:0,variations:[],pictures:[],tags:[],shipping:{logistic_type:'xd_drop_off'},...(i===0?{user_product_id:'MLBU900001',family_name:'Produto de teste'}:{})});
  }
  await f.db.query('select marketplace_enqueue_stock($1,$2,false)',[f.company,f.product]);
  const api={from:table=>new Query(f,table),async connection(company,id){if(company!==f.company||!connections.has(id))throw Error('Conta de outro perfil');return connections.get(id);},
   async saveRemoteListing(connection,item){await f.db.query('update marketplace_product_links set reported_stock=$1,status=$2 where empresa_id=$3 and connection_id=$4 and provider_listing_id=$5',[item.available_quantity,item.status,connection.empresa_id,connection.id,item.id]);return normalizeListing(item,connection.seller_reference);},
   async network(connection,path,method='GET',body){
    if(connection.empresa_id!==f.company||!connections.has(connection.id))throw Error('Conta incorreta');const item=remotes.get(connection.id);calls.push({connectionId:connection.id,path,method,body:structuredClone(body)});
    if(method!=='GET'&&failures.has(connection.id))throw Error('Envio simulado falhou');
    if(path===`/items/${item.id}`){if(method==='PUT'&&!ignored.has(connection.id)){if(body.price!==undefined)item.price=body.price;if(body.available_quantity!==undefined){item.available_quantity=body.available_quantity;if(body.available_quantity===0){item.status='paused';item.sub_status=['out_of_stock'];}else if(item.sub_status.includes('out_of_stock')){item.status='active';item.sub_status=[];}}if(body.status){item.status=body.status;item.sub_status=body.status==='paused'?['paused_by_seller']:[];}}return structuredClone(item);}
    if(path===`/users/${connection.seller_reference}`)return {id:Number(connection.seller_reference),tags:[]};
    if(path==='/categories/MLB123')return {settings:{max_title_length:60,minimum_price:1,maximum_price:100000,maximum_quantity:99999}};
    if(path===`/items/${item.id}/description`)return {plain_text:'Produto de teste'};
    if(path.startsWith('/pricing-automation/'))return {items:automation.has(connection.id)?[item.id]:[],paging:{total:automation.has(connection.id)?1:0}};
    if(path.startsWith(`/users/${connection.seller_reference}/available_listing_types?`))return {available:[{id:'gold_special',remaining_listings:1}]};
    if(path.startsWith('/user-products/'))return {user_id:Number(connection.seller_reference),locations:[{type:'selling_address',quantity:item.available_quantity}]};
    if(path.startsWith(`/users/${connection.seller_reference}/items/search?`))return {results:[item.id],paging:{total:1}};
    throw Error('Endpoint não simulado: '+path);
   }};
  return {...f,api,remotes,connections,calls,ignored,failures,automation,balance,warehouse,jobs:async()=>(await f.db.query('select * from marketplace_inventory_outbox order by link_id')).rows.map(plain)};
 }catch(e){await f.db.close();throw e;}
}
