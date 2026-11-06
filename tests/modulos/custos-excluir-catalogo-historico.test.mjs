import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
test('excluir catálogo oculta os itens sem transferir ou apagar vendas e bloqueia reativação', async () => {
  const db = new PGlite();
  const empresa='10000000-0000-4000-8000-000000000001';
  const catalogo='10000000-0000-4000-8000-000000000002';
  const produto='10000000-0000-4000-8000-000000000003';
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql as 'select ''${empresa}''::uuid';
      create function custos_pode_acessar_empresa(uuid,boolean) returns boolean language sql as 'select true';
      create table empresas(id uuid primary key); insert into empresas values('${empresa}');
      create table vendas_mobile_catalogos(id uuid primary key,empresa_id uuid,origem text,codigo text,ativo boolean,publicado_avantavendas boolean,padrao boolean,atualizado_em timestamptz);
      create table vendas_mobile_catalogo_produtos(id uuid primary key,catalogo_id uuid references vendas_mobile_catalogos,ativo boolean,disponivel_catalogo boolean,excluido_em timestamptz,preco numeric);
      create table vendas(produto_id uuid references vendas_mobile_catalogo_produtos,valor numeric);
      create function custos_excluir_produto_rpc(uuid,uuid) returns void language sql as 'update vendas_mobile_catalogo_produtos set ativo=false,disponivel_catalogo=false,excluido_em=now() where id=$2';
      insert into vendas_mobile_catalogos values('${catalogo}','${empresa}','manual','TESTE',true,true,false,now());
      insert into vendas_mobile_catalogo_produtos values('${produto}','${catalogo}',true,true,null,50);
      insert into vendas values('${produto}',50);`);
    await db.exec(readFileSync('supabase/migrations/20261105130000_excluir_catalogo_ocultando_itens.sql','utf8'));
    await assert.rejects(db.query('select custos_excluir_catalogo_rpc($1,$2)',[produto,catalogo]),/não localizado/);
    await db.query('select custos_excluir_catalogo_rpc($1,$2)',[empresa,catalogo]);
    const item=(await db.query('select * from vendas_mobile_catalogo_produtos')).rows[0];
    assert.equal(item.catalogo_id,catalogo); assert.equal(item.ativo,false); assert.equal(item.disponivel_catalogo,false); assert.ok(item.excluido_em); assert.equal(item.preco,'50');
    assert.equal((await db.query('select * from vendas')).rows[0].valor,'50');
    const cat=(await db.query('select * from vendas_mobile_catalogos')).rows[0];
    assert.equal(cat.ativo,false); assert.equal(cat.publicado_avantavendas,false); assert.ok(cat.excluido_em);
    await assert.rejects(db.exec('update vendas_mobile_catalogos set ativo=true'),/somente nos históricos/);
    await assert.rejects(db.exec(`insert into vendas_mobile_catalogo_produtos(id,catalogo_id) values('${empresa}','${catalogo}')`),/catálogo excluído/);
    assert.ok((await db.query('select custos_excluir_catalogo_rpc($1,$2)',[empresa,catalogo])).rows[0]);
  } finally { await db.close(); }
});
