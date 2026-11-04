// Banco isolado para teste local; nunca conecta ao Supabase ou ao financeiro.
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
export const DIRECT_DEMO={company:'10000000-0000-4000-8000-000000000001',other:'10000000-0000-4000-8000-000000000002',actor:'20000000-0000-4000-8000-000000000001',editor:'20000000-0000-4000-8000-000000000002'};
export async function createDirectSalesFixture(){
 const db=new PGlite(),{company,other,actor,editor}=DIRECT_DEMO;
 const migration=async(name:string)=>db.exec(await readFile(`${process.cwd()}/supabase/migrations/${name}`,'utf8'));
 try{
  await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key);create table empresas(id uuid primary key);create table usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text);create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text);`);
  await migration('20261006090000_avantaprecos_users.sql');
  await migration('20261011200000_marketplace_local_products.sql');
  await db.exec(`create table marketplace_price_consultations(id uuid primary key default gen_random_uuid(),empresa_id uuid references empresas(id),created_by uuid references auth.users(id),provider_product_id text,product_name text,ean text,product_description text,image_url text,market_price_cents bigint,created_at timestamptz default now());`);
  await migration('20261019020000_marketplace_price_products_stock.sql');
  await migration('20261019210000_marketplace_price_stock_permission.sql');
  await db.query('insert into empresas values($1),($2)',[company,other]);await db.query('insert into auth.users values($1),($2)',[actor,editor]);
  await db.query("insert into usuarios_empresa values($1,$2,'ativo','administrador')",[actor,company]);
  await db.query("insert into empresa_modulos values($1,'marketplaces',true,null),($2,'marketplaces',true,null)",[company,other]);
  await db.query("insert into marketplace_price_users(empresa_id,user_id,nome,login,email,can_edit_stock) values($1,$2,'Consulta de teste','teste','teste@example.invalid',true)",[company,editor]);
  const made=await db.query<{r:{product_id:string}}>('select marketplace_product_command($1,$2,$3,$4,$5) r',[company,actor,'create',JSON.stringify({name:'Air Fryer · Produto de teste local',ean:'7897180598754',price_cents:20000,stock_quantity:10,physical_confirmation:true}),crypto.randomUUID()]);
  const product=made.rows[0].r.product_id;
  await db.exec(`create table marketplace_inventory_events(empresa_id uuid,state text);create table queued(empresa_id uuid,product_id uuid,increase boolean);create function marketplace_enqueue_stock(e uuid,p uuid,i boolean) returns void language sql as $$insert into queued values(e,p,i)$$;`);
  await migration('20261019230000_marketplace_warehouses.sql');
  const online=(await db.query<{id:string}>('select id from marketplace_warehouses where empresa_id=$1 and is_online',[company])).rows[0].id;
  const madeWarehouse=await db.query<{r:{warehouseId:string}}>('select marketplace_warehouse_command($1,$2,$3,$4,$5) r',[company,actor,'create',JSON.stringify({name:'Saldão'}),crypto.randomUUID()]);
  const offline=madeWarehouse.rows[0].r.warehouseId;
  await db.query('select marketplace_warehouse_command($1,$2,$3,$4,$5)',[company,actor,'add',JSON.stringify({warehouseId:offline,productId:product,revision:1,quantity:8}),crypto.randomUUID()]);
  await migration('20261020010000_marketplace_direct_sales.sql');
  const command=async(action:string,data:Record<string,unknown>,key=crypto.randomUUID(),actorId=actor,tenant=company)=>(await db.query<{r:{saleId:string|null;productId:string;stockAfter:number|null}}>('select marketplace_direct_sale_command($1,$2,$3,$4,$5) r',[tenant,actorId,action,JSON.stringify(data),key])).rows[0].r;
  const balances=async()=>(await db.query<{id:string;name:string;is_online:boolean;quantity:number|null;revision:number;confirmed_at:string|null}>('select w.id,w.name,w.is_online,b.quantity,b.revision,b.confirmed_at from marketplace_warehouses w join marketplace_warehouse_balances b on b.empresa_id=w.empresa_id and b.warehouse_id=w.id and b.product_id=$2 where w.empresa_id=$1 and w.archived_at is null order by w.is_online desc,w.created_at',[company,product])).rows;
  return {db,company,other,actor,editor,product,online,offline,command,balances};
 }catch(e){await db.close();throw e;}
}
