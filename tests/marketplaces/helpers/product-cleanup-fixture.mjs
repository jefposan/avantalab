import { readFileSync } from 'node:fs';
import { accountCleanupFixture } from './account-cleanup-fixture.mjs';
export async function productCleanupFixture() {
 const f = await accountCleanupFixture();
 await f.db.query("update marketplace_connections set status='connected' where id=$1",[f.scope.sharedAccount]);
 await f.db.exec(readFileSync('supabase/migrations/20261024050000_marketplace_removal_discovery.sql','utf8'));
 await f.db.exec('alter table marketplace_inventory_outbox add foreign key(link_id) references marketplace_product_links(id);alter table marketplace_listing_stock_control add foreign key(link_id) references marketplace_product_links(id)');
 await f.db.exec(readFileSync('supabase/migrations/20261113210000_marketplace_product_cleanup.sql','utf8'));
 const add = async (name, origin=false) => {
  const id=crypto.randomUUID();
  await f.db.query('insert into marketplace_products(id,empresa_id,name,ean) values($1,$2,$3,$4)',[id,f.scope.company,name,'789'+String(Math.floor(Math.random()*1e10)).padStart(10,'0')]);
  if(origin){await f.db.query('insert into marketplace_price_product_sources(empresa_id,product_id) values($1,$2)',[f.scope.company,id]);await f.db.query('insert into marketplace_price_consultations(empresa_id,local_product_id) values($1,$2)',[f.scope.company,id]);}
  return id;
 };
 const price=await add('Chuveiro elétrico de parede Lorenzetti',true), local=await add('Reparador Sérum Easy Repair Tridium'), historic=await add('Calculadora com histórico preservado',true);
 await f.db.query('insert into marketplace_direct_sales(empresa_id,product_id,product_name,total_cents)values($1,$2,$3,58000)',[f.scope.company,historic,'Calculadora com histórico preservado']);
 await f.db.exec('create table future_product_history(product_id uuid references marketplace_products(id),payload jsonb)');
 await f.db.query('insert into future_product_history values($1,$2)',[historic,JSON.stringify({document:'histórico fiscal preservado'})]);
 f.products={...f.products,price,local,historic};
 f.addLocal=add;
 return f;
}
