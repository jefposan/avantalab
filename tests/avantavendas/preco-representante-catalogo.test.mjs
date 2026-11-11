import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migration = readFileSync('supabase/migrations/20261111160000_preco_representante_catalogo.sql', 'utf8');
const company = '10000000-0000-4000-8000-000000000001';
const catalog = '10000000-0000-4000-8000-000000000002';
const product = '10000000-0000-4000-8000-000000000003';
const account = '10000000-0000-4000-8000-000000000004';

test('custo da empresa, edição do representante e nova alteração da empresa preservam escopo e histórico', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql as 'select ''${company}''::uuid';
      create function vendas_mobile_pode_publicar_conteudo(uuid) returns boolean language sql as 'select $1 = ''${company}''::uuid';
      create function custos_pode_acessar_empresa(uuid,boolean) returns boolean language sql as 'select $1 = ''${company}''::uuid';
      create function vendas_mobile_pode_operar_conta(uuid) returns boolean language sql as 'select $1 = ''${account}''::uuid';
      create function vendas_mobile_vinculo_conta_valido(uuid,uuid) returns boolean language sql as 'select true';
      create table vendas_mobile_catalogos(id uuid primary key default gen_random_uuid(),empresa_id uuid,nome text,codigo text,origem text,ativo boolean,padrao boolean,publicado_avantavendas boolean,criado_em timestamptz default now());
      create table vendas_mobile_catalogo_produtos(id uuid primary key default gen_random_uuid(),catalogo_id uuid,sku text,tipo_item text,disponivel_catalogo boolean,codigo_barras text,marca text,categoria text,nome text,descricao text,preco_divulgacao numeric,preco_custo numeric,preco_venda numeric,unidade text,imagem_url text,ncm text,ativo boolean,atualizado_em timestamptz);
      create table vendas_mobile_produtos(id uuid primary key default gen_random_uuid(),user_id uuid,conta_id uuid,marca text,categoria text,sku text,nome text,descricao text,preco numeric,preco_custo numeric,estoque numeric,unidade text,imagem_url text,metadados jsonb,ativo boolean,catalogo_empresa_id uuid,catalogo_produto_origem_id uuid,estoque_controlado boolean,criado_em timestamptz default now(),atualizado_em timestamptz);
      create table vendas_mobile_contas(id uuid primary key,criado_por uuid,arquivada_em timestamptz);
      create table vendas_mobile_contas_vinculos_comerciais(conta_id uuid,empresa_id uuid,ativo boolean);
      create table vendas_mobile_contas_recursos(conta_id uuid,catalogo_ativo boolean);
      create table vendas_mobile_contas_catalogo_recebimentos(conta_id uuid,catalogo_produto_id uuid,produto_id uuid,status text,recebido_por uuid,atualizado_em timestamptz,unique(conta_id,catalogo_produto_id));
      create table vendas_mobile_pedido_itens(produto_id uuid,preco_custo numeric,preco_unitario numeric);
      create function publicar_alteracao_catalogo_avantavendas() returns trigger language plpgsql as 'begin perform publicar_produto_catalogo_avantavendas(new.id); return new; end';
      insert into vendas_mobile_catalogos values('${catalog}','${company}','Catálogo','PRINCIPAL','manual',true,true,true,now());
      insert into vendas_mobile_catalogo_produtos(id,catalogo_id,sku,nome,preco_divulgacao,preco_custo,preco_venda,unidade,ativo,disponivel_catalogo) values('${product}','${catalog}','T013','Ativador',31,8,12,'un',true,true);
      insert into vendas_mobile_contas values('${account}','${company}',null);
      insert into vendas_mobile_contas_vinculos_comerciais values('${account}','${company}',true);
      insert into vendas_mobile_contas_recursos values('${account}',true);
      insert into vendas_mobile_produtos(conta_id,preco,preco_custo,catalogo_produto_origem_id,ativo,metadados) values('${account}',35,17,'${product}',true,'{}');
      insert into vendas_mobile_pedido_itens values('${product}',17,35);
    `);
    await db.exec(migration);
    const seller = async () => (await db.query('select * from vendas_mobile_produtos where catalogo_produto_origem_id=$1',[product])).rows[0];
    assert.equal(Number((await seller()).preco),35);
    await db.query('select salvar_produto_conteudo_vendas_mobile_rpc($1,$2,$3)',[company,product,{sku:'T013',nome:'Ativador',preco_divulgacao:31,preco_representante:20}]);
    assert.equal(Number((await seller()).preco_custo),20);
    assert.equal(Number((await seller()).preco),35);
    await db.exec("update vendas_mobile_produtos set preco=38,preco_custo=21");
    await db.query('select publicar_produto_catalogo_avantavendas($1,$2)',[product,account]);
    assert.equal(Number((await seller()).preco),38);
    assert.equal(Number((await seller()).preco_custo),21);
    await db.query('update vendas_mobile_catalogo_produtos set preco_divulgacao=33,preco_representante=22 where id=$1',[product]);
    assert.equal(Number((await seller()).preco),33);
    assert.equal(Number((await seller()).preco_custo),22);
    assert.equal((await seller()).metadados.preco_custo,22);
    const source = (await db.query('select preco_custo,preco_venda from vendas_mobile_catalogo_produtos')).rows[0];
    assert.deepEqual(source,{preco_custo:'8',preco_venda:'12'});
    assert.deepEqual((await db.query('select preco_custo,preco_unitario from vendas_mobile_pedido_itens')).rows[0],{preco_custo:'17',preco_unitario:'35'});
    await assert.rejects(db.query('select salvar_produto_conteudo_vendas_mobile_rpc($1,$2,$3)',[company,product,{sku:'T013',nome:'Ativador',preco_divulgacao:33,preco_representante:-1}]),/custo inválido/);
    await assert.rejects(db.query('select salvar_produto_conteudo_vendas_mobile_rpc($1,$2,$3)',[account,product,{sku:'T013',nome:'Ativador',preco_divulgacao:33,preco_representante:1}]),/permissão/);
    await db.query('delete from vendas_mobile_produtos');
    await db.query('select publicar_produto_catalogo_avantavendas($1,$2)',[product,account]);
    assert.equal(Number((await seller()).preco_custo),22);
    assert.equal(Number((await seller()).preco),33);
  } finally { await db.close(); }
});
