/** Banco descartável para testes locais. Nunca usa credenciais ou contas reais. */
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {analyzeMercadoLivreOffers,emptyMarketResearch,type MarketPriceResearch} from '../market-price-research.ts';
export async function createMarketPricesFixture(){
 const db=new PGlite(),company=crypto.randomUUID(),other=crypto.randomUUID(),actor=crypto.randomUUID(),product=crypto.randomUUID();
 try{
  await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;
   create table auth.users(id uuid primary key);create table empresas(id uuid primary key);
   create table usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text);
   create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);
   create table marketplace_price_users(empresa_id uuid,user_id uuid,ativo boolean);
   create table marketplace_products(id uuid primary key,empresa_id uuid,name text,ean text,pictures jsonb,stock_quantity integer,price_cents bigint,publication_form jsonb,revision bigint,archived_at timestamptz,updated_at timestamptz,unique(empresa_id,id));
   create table marketplace_product_operations(empresa_id uuid,request_key uuid,actor_id uuid,action text,request_hash text,result jsonb);
   create table marketplace_connections(empresa_id uuid,provider text,seller_reference text);
   create table marketplace_price_consultations(id uuid primary key, sample_source text constraint marketplace_price_consultations_sample_source_check check(sample_source in ('local_reference','openai_web_search')));`);
  for(const file of ['20261019010000_marketplace_product_price_research.sql','20261021050000_marketplace_price_reference_access.sql','20261024030000_marketplace_price_eight_offers.sql','20261114190000_marketplace_ml_price_research.sql'])await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
  await db.query('insert into empresas values($1),($2)',[company,other]);await db.query('insert into auth.users values($1)',[actor]);
  await db.query("insert into usuarios_empresa values($1,$2,'ativo','administrador')",[actor,company]);
  await db.query("insert into empresa_modulos values($1,'marketplaces',true,null),($2,'marketplaces',true,null)",[company,other]);
  await db.query("insert into marketplace_products values($1,$2,'Liquidificador Electrolux EBL1500 127V Cinza','7909569454787','[]',3,22000,'{\"price\":220,\"custom\":\"preservado\"}',1,null,now())",[product,company]);
  await db.query("insert into marketplace_connections values($1,'mercado_livre','999')",[company]);
  const current=async()=>(await db.query<{price_cents:number;stock_quantity:number;revision:number}>('select * from marketplace_products where id=$1',[product])).rows[0];
  const command=async(action:string,key:string,revision:number,offers:unknown[]=[],evidence:MarketPriceResearch|Record<string,unknown>={},tenant=company,who=actor)=>(await db.query<{result:{status:string;claimed?:boolean;price_cents?:number;offers_count?:number}}>('select marketplace_ml_price_research($1,$2,$3,$4,$5,$6,$7,$8,$9) result',[tenant,who,product,revision,key,action,JSON.stringify(offers),JSON.stringify(evidence),action==='fail'?'research_failed':null])).rows[0].result;
  const snapshot=async()=>({product:await current(),research:(await db.query<{evidence:MarketPriceResearch}>('select evidence from marketplace_product_price_researches where empresa_id=$1 and product_id=$2 order by created_at desc limit 1',[company,product])).rows[0]?.evidence||null});
  function scenario(kind:string){
   if(kind==='unavailable')return emptyMarketResearch('Liquidificador Electrolux EBL1500','unavailable','O Mercado Livre não autorizou esta consulta. A referência anterior foi mantida.');
   const n=kind==='insufficient'?1:kind==='empty'?0:49;
   const rows=Array.from({length:n},(_,i)=>({item_id:'MLB'+(1000000+i),seller_id:i===3?999:20000+Math.floor(i/2),price:i===48?4999:190+(i%20)*3,currency_id:'BRL',condition:'new'}));
   return analyzeMercadoLivreOffers({catalogId:'MLB56235019',productName:'Liquidificador Electrolux EBL1500 127V Cinza',rows:kind==='partial'?rows.slice(0,20):rows,total:n,complete:kind!=='partial',ownSellers:['999']});
  }
  return {db,company,other,actor,product,current,command,snapshot,scenario};
 }catch(error){await db.close();throw error;}
}
