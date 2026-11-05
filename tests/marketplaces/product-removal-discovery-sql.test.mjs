import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('descoberta SQL: EAN/UPC e variações, todas as contas, tenant, conflitos e prova final sob trava',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table marketplace_products(id uuid primary key,empresa_id uuid,ean text,archived_at timestamptz);
 create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text,seller_name text,seller_reference text);
 create table marketplace_listings(empresa_id uuid,connection_id uuid,provider text,provider_listing_id text,title text,status text,snapshot jsonb,synced_at timestamptz default now());
 create table marketplace_product_links(id uuid,empresa_id uuid,product_id uuid,connection_id uuid,provider text,provider_listing_id text);
 create table marketplace_product_removals(empresa_id uuid,request_key uuid,snapshot jsonb);
 create table allowed(empresa_id uuid,actor_id uuid);
 create function marketplace_product_removal_authorized(p_company uuid,p_actor uuid)returns boolean language sql as $$select exists(select 1 from allowed where empresa_id=p_company and actor_id=p_actor)$$;
 create function marketplace_product_remove(p_company uuid,p_actor uuid,p_product uuid,p_revision bigint,p_mode text,p_confirmation text,p_key uuid,p_proofs jsonb)returns jsonb language plpgsql as $$begin insert into marketplace_product_removals values(p_company,p_key,'{"product":{"name":"Produto","links":[]}}');delete from marketplace_products where id=p_product and empresa_id=p_company;return '{"mode":"deleted"}'::jsonb;end$$;`);
 await db.exec(readFileSync('supabase/migrations/20261024050000_marketplace_removal_discovery.sql','utf8'));
 const company=crypto.randomUUID(),other=crypto.randomUUID(),actor=crypto.randomUUID(),product=crypto.randomUUID(),a=crypto.randomUUID(),b=crypto.randomUUID(),c=crypto.randomUUID();
 await db.query('insert into allowed values($1,$2)',[company,actor]);
 await db.query("insert into marketplace_products values($1,$2,'07898520002245',null)",[product,company]);
 for(const [id,tenant]of [[a,company],[b,company],[c,other]])await db.query("insert into marketplace_connections values($1,$2,'mercado_livre','Conta','123')",[id,tenant]);
 for(const [account,tenant,item,snapshot]of [[a,company,'MLB123456',{ean:'7898520002245'}],[b,company,'MLB234567',{ean:null,variations:[{ean:'7898520002245'}]}],[c,other,'MLB345678',{ean:'7898520002245'}],[a,company,'MLB456789',{ean:'7898520009999'}]])await db.query("insert into marketplace_listings(empresa_id,connection_id,provider,provider_listing_id,title,status,snapshot)values($1,$2,'mercado_livre',$3,'Produto','active',$4)",[tenant,account,item,JSON.stringify(snapshot)]);
 const discover=async(tenant=company,user=actor)=>(await db.query('select marketplace_product_removal_candidates($1,$2,$3)r',[tenant,user,product])).rows[0].r;
 let rows=await discover();assert.equal(rows.length,2);assert.ok(rows.every(r=>r.unlinked));
 await assert.rejects(discover(other),/permissão/);await assert.rejects(discover(company,crypto.randomUUID()),/permissão/);
 const proofs=()=>rows.map(r=>({linkId:r.id,connectionId:r.connection_id,listingId:r.provider_listing_id,status:'deleted',checkedAt:new Date().toISOString()}));
 const remove=async(proof)=>(await db.query("select marketplace_product_remove_checked($1,$2,$3,1,'deleted','Produto',$4,'[]',$5)r",[company,actor,product,crypto.randomUUID(),JSON.stringify(proof)])).rows[0].r;
 await assert.rejects(remove([]),/mudaram/);await assert.rejects(remove(proofs()),/Confirme a exclusão/,'não aceita prova do cliente contra situação salva');
 await db.exec("update marketplace_listings set status='deleted' where status='active'");
 const stale=proofs();stale[0].checkedAt=new Date(Date.now()-120000).toISOString();await assert.rejects(remove(stale),/Confirme a exclusão/);
 const duplicate=proofs();duplicate[1]=duplicate[0];await assert.rejects(remove(duplicate),/mudaram/);
 const conflict=crypto.randomUUID();await db.query("insert into marketplace_product_links values($1,$2,$3,$4,'mercado_livre','MLB123456')",[crypto.randomUUID(),company,conflict,a]);
 await assert.rejects(remove(proofs()),/outro cadastro/);await db.exec('delete from marketplace_product_links');
 assert.equal((await remove(proofs())).mode,'deleted');
 const audit=(await db.query('select snapshot from marketplace_product_removals')).rows[0].snapshot;
 assert.equal(audit.product.links.length,2,'importação posterior reconhece também os anúncios que não tinham vínculo');assert.equal(audit.discoveryProofs.length,2);
 assert.equal((await db.query('select count(*)::int n from marketplace_listings')).rows[0].n,4,'histórico dos anúncios não é apagado');
 assert.equal((await db.query("select has_function_privilege('authenticated','marketplace_product_remove_checked(uuid,uuid,uuid,bigint,text,text,uuid,jsonb,jsonb)','execute')p")).rows[0].p,false);
 }finally{await db.close();}
});
