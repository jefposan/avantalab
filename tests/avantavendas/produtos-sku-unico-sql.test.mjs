import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const sql=readFileSync(new URL('../../supabase/migrations/20261116220000_avantavendas_sku_unico_conta.sql',import.meta.url),'utf8');
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
test('índice real bloqueia SKU por conta em insert/update/lote, preservando zeros, inativos e histórico',async()=>{
 const db=new PGlite();try{
 await db.exec('create table vendas_mobile_produtos(id serial primary key,conta_id uuid,sku text,nome text,ativo boolean default true); create table historico(itens jsonb); insert into historico values(\'[{"produto_nome":"Paladium","total":10}]\')');
 await db.query('insert into vendas_mobile_produtos(conta_id,sku,nome) values($1,$2,$3)',[a,'ABC','Original']);
 const antes=await db.query('select * from historico');await db.exec(sql);await db.exec(sql);
 await assert.rejects(db.query('insert into vendas_mobile_produtos(conta_id,sku,ativo) values($1,$2,false)',[a,' abc ']),e=>e.code==='23505');
 await db.query('insert into vendas_mobile_produtos(conta_id,sku) values($1,$2)',[b,'abc']);
 await db.query("insert into vendas_mobile_produtos(conta_id,sku,nome) values($1,'001','Original'),($1,'1','Original'),($1,'','Mesmo'),($1,null,'Mesmo')",[a]);
 await assert.rejects(db.query("update vendas_mobile_produtos set sku='ABC' where conta_id=$1 and sku='001'",[a]),e=>e.code==='23505');
 const n=(await db.query('select count(*)::int n from vendas_mobile_produtos')).rows[0].n;
 await assert.rejects(db.query("insert into vendas_mobile_produtos(conta_id,sku) values($1,'LOTE'),($1,'lote')",[a]),e=>e.code==='23505');
 assert.equal((await db.query('select count(*)::int n from vendas_mobile_produtos')).rows[0].n,n);
 assert.deepEqual(await db.query('select * from historico'),antes);
 }finally{await db.close();}
});
test('conflito legado interrompe migração sem apagar ou remapear registros',async()=>{
 const db=new PGlite();try{
 await db.exec('create table vendas_mobile_produtos(id serial primary key,conta_id uuid,sku text)');
 await db.query("insert into vendas_mobile_produtos(conta_id,sku) values($1,'X'),($1,'x')",[a]);
 await assert.rejects(db.exec(sql),/SKUs repetidos/);await db.exec('rollback');
 assert.equal((await db.query('select count(*)::int n from vendas_mobile_produtos')).rows[0].n,2);
 }finally{await db.close();}
});
