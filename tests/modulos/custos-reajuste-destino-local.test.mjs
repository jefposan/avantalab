import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
test('SQL reajusta apenas catálogo local ativo e mantém preço externo e idempotência', async () => {
  const db=new PGlite();
  const empresa='10000000-0000-4000-8000-000000000001';
  const local='10000000-0000-4000-8000-000000000002';
  const externo='10000000-0000-4000-8000-000000000003';
  const tabela='10000000-0000-4000-8000-000000000004';
  const lote='10000000-0000-4000-8000-000000000005';
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as 'select null::uuid';
      create function custos_pode_acessar_empresa(uuid,boolean) returns boolean language sql as 'select true';
      create table empresas(id uuid primary key);insert into empresas values('${empresa}');
      create table vendas_mobile_catalogos(id uuid primary key,empresa_id uuid,ativo boolean,excluido_em timestamptz);
      create table vendas_mobile_catalogo_produtos(id uuid primary key,catalogo_id uuid,ativo boolean,excluido_em timestamptz,preco_venda numeric,atualizado_em timestamptz);
      create table custos_tabelas_preco(id uuid primary key,empresa_id uuid,ativo boolean,padrao boolean,nome text,codigo text);
      create table custos_tabela_preco_itens(tabela_preco_id uuid,produto_id uuid,preco numeric,unique(tabela_preco_id,produto_id));
      create table custos_tabela_preco_historico(empresa_id uuid,tabela_preco_id uuid,produto_id uuid,preco_anterior numeric,preco_novo numeric,origem text);
      insert into vendas_mobile_catalogos values('${local}','${empresa}',true,null),('${externo}','${empresa}',false,null);
      insert into vendas_mobile_catalogo_produtos values('${local}','${local}',true,null,100,now()),('${externo}','${externo}',true,null,410,now());
      insert into custos_tabelas_preco values('${tabela}','${empresa}',true,true,'Padrão','PADRAO');`);
    await db.exec(readFileSync('supabase/migrations/20261104190000_reajuste_tabelas_precos.sql','utf8'));
    await db.exec(readFileSync('supabase/migrations/20261118180000_reajuste_somente_catalogos_locais_ativos.sql','utf8'));
    const aplicar=()=>db.query('select custos_aplicar_reajuste_tabelas_rpc($1,$2,$3,$4,$5) resultado',[empresa,lote,[tabela],'percentual',10]);
    assert.equal((await aplicar()).rows[0].resultado.precos_atualizados,1);
    await aplicar();
    const rows=(await db.query('select id,preco_venda from vendas_mobile_catalogo_produtos order by id')).rows;
    assert.equal(Number(rows[0].preco_venda),110);
    assert.equal(Number(rows[1].preco_venda),410);
    assert.equal((await db.query('select count(*)::int n from custos_tabela_preco_historico')).rows[0].n,1);
  } finally { await db.close(); }
});
