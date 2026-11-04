import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('RPC real grava lote atômico, devolve recibo e impede duplicação e acesso a outro perfil',async()=>{
 const db=new PGlite();try{
 await db.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.actor',true),'')::uuid$$;
 create table public.usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text);
 create table public.despesas_cadastradas(empresa_id uuid,nome text);
 create table public.lancamentos(id uuid default gen_random_uuid(),empresa_id uuid,ano integer,mes text,dia integer,despesa_nome text,descricao text,valor numeric,status text,tipo_obs text);`);
 await db.exec(readFileSync('supabase/migrations/20260721223000_importador_despesas_lancamentos.sql','utf8'));
 const actor=crypto.randomUUID(),company=crypto.randomUUID(),other=crypto.randomUUID();
 await db.query('insert into auth.users values($1)',[actor]);await db.query("select set_config('app.actor',$1,false)",[actor]);await db.query("insert into usuarios_empresa values($1,$2,'ativo','operador_completo')",[actor,company]);await db.query("insert into despesas_cadastradas values($1,'Alimentação')",[company]);
 const items=[{data:'2026-10-10',tipo_despesa:'Alimentação',descricao:'Mercado',valor:35.5,item_chave:'arquivo-linha-1'},{data:'2026-10-11',tipo_despesa:'Alimentação',descricao:'Padaria',valor:12.9,item_chave:'arquivo-linha-2'}];
 const run=async(profile=company,list=items)=>(await db.query('select importar_lancamentos_despesas_rpc($1,$2,$3) r',[profile,'arquivo-hash',JSON.stringify(list)])).rows[0].r;
 assert.deepEqual(await run(),{total:2,inseridos:2,ignorados:0,lote_chave:'arquivo-hash'});
 assert.deepEqual(await run(),{total:2,inseridos:0,ignorados:2,lote_chave:'arquivo-hash'});
 const rows=(await db.query('select ano,mes,dia,valor,despesa_nome from lancamentos order by dia')).rows;assert.equal(rows.length,2);assert.equal(rows[0].mes,'OUTUBRO');assert.equal(Number(rows[0].valor),35.5);
 await assert.rejects(run(other),/permissão/);
 await assert.rejects(run(company,[{...items[0],item_chave:'nova'}, {...items[1],tipo_despesa:'Tipo inexistente',item_chave:'outra'}]),/não pertence/);
 assert.equal((await db.query('select count(*)::int n from lancamentos')).rows[0].n,2,'falha de uma linha não grava parte do lote');
 await db.query("select set_config('app.actor','',false)");await assert.rejects(run(),/Sessão expirada/);
 }finally{await db.close();}
});
