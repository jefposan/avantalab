import { sqlDeTesteURL } from '../helpers/sql-historico.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const read=name=>readFileSync(sqlDeTesteURL(name),'utf8');
test('reposição em quatro contas conserva autorização pendente durante releituras, sem herdar autorização após venda ou conclusão',async()=>{
 const db=new PGlite();try{
  await db.exec(`create table marketplace_products(id uuid primary key,empresa_id uuid,stock_quantity int,revision bigint,archived_at timestamptz);
   create table marketplace_product_links(id uuid primary key,empresa_id uuid,product_id uuid,provider text);
   create table marketplace_inventory_settings(empresa_id uuid,enabled boolean);
   create table marketplace_inventory_outbox(link_id uuid primary key,empresa_id uuid,product_id uuid,desired_quantity int,revision bigint,allow_increase boolean,generation uuid default gen_random_uuid(),state text default 'pending',issue text,attempts int default 0,next_attempt_at timestamptz default now(),updated_at timestamptz default now());`);
  const source=read('20261021010000_marketplace_stock_reconciliation.sql');
  await db.exec(source.slice(source.indexOf('create or replace function public.marketplace_enqueue_stock'),source.indexOf('create or replace function public.marketplace_observe_listing')));
  await db.exec(read('20261029160000_preservar_autorizacao_estoque_pendente.sql'));
  const company=crypto.randomUUID(),product=crypto.randomUUID();
  await db.query('insert into marketplace_products values($1,$2,3,6,null)',[product,company]);
  await db.query('insert into marketplace_inventory_settings values($1,true)',[company]);
  for(let i=0;i<4;i++)await db.query("insert into marketplace_product_links values($1,$2,$3,'mercado_livre')",[crypto.randomUUID(),company,product]);
  const enqueue=increase=>db.query('select marketplace_enqueue_stock($1,$2,$3)',[company,product,increase]);
  const rows=async()=>(await db.query('select * from marketplace_inventory_outbox order by link_id')).rows;
  await enqueue(true);const before=await rows();assert.equal(before.length,4);
  await enqueue(false);let current=await rows();assert.ok(current.every(r=>r.allow_increase&&r.desired_quantity===3));assert.notEqual(current[0].generation,before[0].generation);
  // A primeira conta terminou; releitura não deve reautorizar seu saldo nem revogar as outras.
  await db.query("update marketplace_inventory_outbox set state='synced' where link_id=$1",[current[0].link_id]);
  await enqueue(false);current=await rows();assert.equal(current[0].allow_increase,false);assert.ok(current.slice(1).every(r=>r.allow_increase));
  // Venda/nova revisão invalida a autorização anterior, mesmo com saldo ainda positivo.
  await db.exec('update marketplace_products set stock_quantity=2,revision=7');await enqueue(false);
  assert.ok((await rows()).every(r=>!r.allow_increase&&r.desired_quantity===2));
  await enqueue(true);await db.exec('update marketplace_products set revision=8');await enqueue(false);
  assert.ok((await rows()).every(r=>!r.allow_increase),'mesmo saldo com nova revisão não herda reposição');
  await enqueue(true);await db.exec('update marketplace_products set stock_quantity=1');await enqueue(false);
  assert.ok((await rows()).every(r=>!r.allow_increase),'saldo diferente não herda reposição');
  await db.query('select marketplace_enqueue_stock($1,$2,true)',[crypto.randomUUID(),product]);assert.ok((await rows()).every(r=>!r.allow_increase),'outra empresa não autoriza');
 }finally{await db.close();}
});
