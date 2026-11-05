import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {listingGroupSummary,unlinkedListingGroups} from '../../app/modules/marketplaces/listing-groups.ts';
test('resumo distingue anúncios/contas, situações e preços sem somar o estoque',()=>{
 const listings=[['one','a',580,'active'],['two','b',580,'active'],['two','c',652.08,'paused']].map(([connectionId,id,price,status])=>({connectionId,status,snapshot:{id,price,currency:'BRL',stock:2,substatus:[]}}));
 const result=listingGroupSummary({listings,stockQuantity:2});assert.equal(result.accounts,2);assert.deepEqual(result.statuses,[['active',2],['paused',1]]);assert.deepEqual(result.prices,[{currency:'BRL',min:580,max:652.08}]);
 const groups=unlinkedListingGroups(listings.map(row=>({...row,snapshot:{...row.snapshot,title:'Mesmo nome',ean:'Mesmo EAN'}})));assert.equal(groups.length,3);assert.ok(groups.every(g=>g.stockPending&&g.stockQuantity===null));
});
test('consulta agrupa antes de paginar, respeita empresa/filtros e preserva o saldo central',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table marketplace_listing_operations(empresa_id uuid,connection_id uuid,provider_listing_id text,search_text text,status text,snapshot jsonb,operational_status text,operations jsonb);
 create table marketplace_products(id uuid,empresa_id uuid,name text,ean text,pictures jsonb,stock_quantity int,listing_stock_review_at timestamptz,archived_at timestamptz);
 create table marketplace_product_links(empresa_id uuid,connection_id uuid,provider_listing_id text,product_id uuid);`);
 await db.exec(readFileSync('supabase/historico-sem-registro/20261023060000_marketplace_grouped_listings.sql','utf8'));
 const company=crypto.randomUUID(),otherCompany=crypto.randomUUID(),a=crypto.randomUUID(),b=crypto.randomUUID(),product=crypto.randomUUID();
 await db.query('insert into marketplace_products values($1,$2,$3,$4,$5,2,null,null)',[product,company,'Calculadora','7897013526107','[]']);
 const insert=async(companyId,connection,id,productId,status='active',title='Calculadora')=>{
  await db.query('insert into marketplace_listing_operations values($1,$2,$3,$4,$5,$6,$5,$7)',[companyId,connection,id,title.toLowerCase(),status,JSON.stringify({id,title,stock:2,price:580,currency:'BRL',pictures:['https://example.test/product.jpg'],createdAt:'2026-10-23T00:00:00Z',substatus:[]}),JSON.stringify({count:0,labels:[]})]);
  if(productId)await db.query('insert into marketplace_product_links values($1,$2,$3,$4)',[companyId,connection,id,productId]);
 };
 await insert(company,a,'ad-a',product);await insert(company,b,'ad-b',product,'paused');await insert(company,a,'unlinked',null);await insert(otherCompany,a,'foreign',null);
 for(let n=0;n<25;n++)await insert(company,a,'solo-'+n,null,'active','Outro produto');
 const read=async(ids=[a,b],search='',status='',page=1,count=false,listing='')=>(await db.query('select marketplace_grouped_listings($1,$2,$3,$4,$5,$6,$7,$8) as result',[company,ids,search,status,'asc',page,count,listing])).rows[0].result;
 const first=await read();assert.equal(first.total,27);assert.equal(first.listingTotal,28);assert.equal(first.groups.length,25);
 const second=await read([a,b],'','',2);const grouped=[...first.groups,...second.groups].find(group=>group.productId===product);
 assert.equal(grouped.listings.length,2);assert.equal(grouped.stockQuantity,2);assert.equal(grouped.stockPending,false);assert.deepEqual(grouped.pictures,['https://example.test/product.jpg']);
 assert.equal((await read([a,b],'calculadora')).total,2,'mesmo nome/EAN sem vínculo não é mesclado');
 assert.equal((await read([a],'calculadora')).listingTotal,2);assert.equal((await read([a,b],'','paused')).listingTotal,1);
 assert.equal((await read([a,b],'','',1,true)).groups.length,0);assert.equal((await read([a,b],'','',1,false,'ad-b')).listingTotal,1);
 assert.equal([...first.groups,...second.groups].flatMap(g=>g.listings).some(row=>row.snapshot.id==='foreign'),false);
 const rights=(await db.query("select has_function_privilege('authenticated','public.marketplace_grouped_listings(uuid,uuid[],text,text,text,integer,boolean,text)','execute') as client,has_function_privilege('service_role','public.marketplace_grouped_listings(uuid,uuid[],text,text,text,integer,boolean,text)','execute') as server")).rows[0];assert.deepEqual(rights,{client:false,server:true});
 await db.exec('create table marketplace_listing_quality(empresa_id uuid,connection_id uuid,listing_id text,score numeric);');
 await db.exec(readFileSync('supabase/migrations/20261024061000_marketplace_quality_filters.sql','utf8'));
 await db.query('insert into marketplace_listing_quality values($1,$2,$3,65),($1,$4,$5,90),($6,$2,$7,10)',[company,a,'ad-a',b,'ad-b',otherCompany,'foreign']);
 const quality=async(mode,page=1)=>(await db.query("select marketplace_quality_grouped_listings($1,$2,'','','desc',$3,false,'',$4)r",[company,[a,b],page,mode])).rows[0].r;
 const low=await quality('low');assert.equal(low.total,1);assert.equal(low.groups[0].listings.length,2);assert.equal(low.listingTotal,2);
 assert.equal((await quality('unknown')).total,26);assert.equal((await quality('lowest')).groups[0].productId,product);assert.equal((await quality('lowest',2)).groups.length,2);
 assert.equal((await db.query("select has_function_privilege('authenticated','marketplace_quality_grouped_listings(uuid,uuid[],text,text,text,integer,boolean,text,text)','execute')r")).rows[0].r,false);
 }finally{await db.close();}
});
