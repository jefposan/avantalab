import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('exclusão de catálogo transfere sem apagar produtos e bloqueia destinos, conflitos e históricos excluídos', async () => {
  const db = new PGlite();
  const empresa = '10000000-0000-4000-8000-000000000001';
  const local = '10000000-0000-4000-8000-000000000002';
  const manual = '10000000-0000-4000-8000-000000000003';
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql as 'select ''${empresa}''::uuid';
      create function custos_pode_acessar_empresa(uuid,boolean) returns boolean language sql as 'select true';
      create table empresas(id uuid primary key);
      insert into empresas values ('${empresa}');
      create table vendas_mobile_catalogos(id uuid primary key, empresa_id uuid, nome text, codigo text, origem text, ativo boolean, publicado_avantavendas boolean, padrao boolean);
      create table vendas_mobile_catalogo_produtos(id int primary key, catalogo_id uuid references vendas_mobile_catalogos on delete cascade, sku text, preco numeric, excluido_em timestamptz);
      create table custos_importacoes_catalogo_backups(catalogo_id uuid references vendas_mobile_catalogos on delete cascade, empresa_id uuid);
      create table vendas_mobile_produtos(catalogo_empresa_id uuid references vendas_mobile_catalogos on delete set null);
      insert into vendas_mobile_catalogos values ('${local}','${empresa}','Local','CUSTOS_LOCAL','custos_local',true,false,false),('${manual}','${empresa}','Manual','TESTE','manual',true,false,true);
      insert into vendas_mobile_catalogo_produtos values (1,'${manual}','T001',42.50,null);
      insert into custos_importacoes_catalogo_backups values ('${manual}','${empresa}');`);
    await db.exec(readFileSync('supabase/migrations/20261105120000_excluir_catalogo_preservando_produtos.sql','utf8'));
    const excluir = () => db.query('select custos_excluir_catalogo_rpc($1,$2)', [empresa, manual]);
    await assert.rejects(excluir(), /Desative/);
    await db.exec(`update vendas_mobile_catalogos set ativo=false where id='${manual}';
      insert into vendas_mobile_catalogo_produtos values (2,'${local}','T001',10,null);`);
    await assert.rejects(excluir(), /códigos repetidos/);
    await db.exec("delete from vendas_mobile_catalogo_produtos where id=2; update vendas_mobile_catalogo_produtos set excluido_em=now() where id=1");
    await assert.rejects(excluir(), /histórico protegido/);
    await db.exec('update vendas_mobile_catalogo_produtos set excluido_em=null where id=1');
    await excluir();
    assert.deepEqual((await db.query('select id,catalogo_id,preco from vendas_mobile_catalogo_produtos')).rows, [{id:1,catalogo_id:local,preco:'42.50'}]);
    assert.equal((await db.query('select catalogo_id from custos_importacoes_catalogo_backups')).rows[0].catalogo_id,local);
    assert.equal((await db.query('select count(*)::int n from vendas_mobile_catalogos')).rows[0].n,1);
    await assert.rejects(db.query('select custos_excluir_catalogo_rpc($1,$2)',[empresa,local]), /protegido/);
    await assert.rejects(db.query('select custos_excluir_catalogo_rpc($1,$2)',[local,local]), /não localizado/);
  } finally { await db.close(); }
});
