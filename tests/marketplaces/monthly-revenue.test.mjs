import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const company = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const migration = (name) => readFileSync(`supabase/migrations/${name}.sql`, 'utf8');

test('receitas de Marketplaces são mensais, isoladas, idempotentes e controladas pela configuração', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create table empresas(id uuid primary key);
      create table configuracoes(empresa_id uuid references empresas);
      create table despesas_cadastradas(empresa_id uuid references empresas);
      create table lancamentos(empresa_id uuid references empresas);
      create table recorrencias(empresa_id uuid references empresas);
      create table agenda_itens(empresa_id uuid references empresas);
      create table empresa_modulos(empresa_id uuid, modulo_id text, ativo boolean, expira_em timestamptz);
      create table marketplace_sales(id text primary key, empresa_id uuid references empresas, provider text, status text, snapshot jsonb);
      create table marketplace_direct_sales(id text primary key, empresa_id uuid references empresas, status text,
        sold_on date, quantity int, unit_price_cents bigint, total_cents bigint generated always as (quantity * unit_price_cents) stored);
      create table faturamentos(empresa_id uuid, ano int, mes text, valor numeric, referencia_total_mensal boolean default false,
        primary key (empresa_id,ano,mes));
      create table faturamentos_entradas(id uuid primary key default gen_random_uuid(), empresa_id uuid references empresas,
        ano int, mes text, dia int, origem text, valor numeric, status text, tipo_obs text, origem_etiqueta text,
        centro_custo_id uuid, updated_at timestamptz);
      insert into empresas values ('${company}'), ('${other}');
      insert into empresa_modulos values ('${company}','marketplaces',true,null), ('${other}','marketplaces',true,null);
    `);
    await db.exec(migration('20260801100000_pontos_restauracao').split('do $$ declare job_id')[0]);
    await db.exec(migration('20261018190000_marketplace_price_settings'));
    const month = (await db.query(`
      select to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM-01') mes
    `)).rows[0].mes;
    const order = (id, provider, status, value, soldAt = month, currency = 'BRL', empresa = company) =>
      db.query('insert into marketplace_sales values ($1,$2,$3,$4,$5)', [id, empresa, provider, status, JSON.stringify({ total: value, soldAt, currency })]);
    await order('online', 'mercado_livre', 'paid', 99.99);
    await order('magalu', 'magalu', 'confirmed', 10.01);
    await order('pending', 'mercado_livre', 'confirmed', 500);
    await order('cancelled', 'mercado_livre', 'cancelled', 500);
    await order('partial', 'mercado_livre', 'partially_refunded', 500);
    await order('currency', 'mercado_livre', 'paid', 500, month, 'USD');
    await order('invalid', 'mercado_livre', 'paid', 500, '2026-02-30T03:00:00Z');
    await order('previous', 'mercado_livre', 'paid', 500, month + 'T02:59:00Z');
    await order('other', 'mercado_livre', 'paid', 15, month, 'BRL', other);
    await db.query("insert into marketplace_direct_sales values ('direct',$1,'confirmed',$2,2,500)", [company, month]);
    await db.exec(migration('20261109163000_marketplace_receitas_gestao'));
    const sync = async () => (await db.query('select marketplace_processar_receitas() as count')).rows[0].count;
    const entries = async () => (await db.query(
      "select id,empresa_id,ano,mes,origem,origem_etiqueta,valor from faturamentos_entradas where tipo_obs='marketplace_sistema' order by empresa_id",
    )).rows;

    assert.equal(await sync(), 2);
    const [first, separate] = await entries();
    assert.equal(Number(first.valor), 120);
    assert.equal(first.origem, 'Vendas Mkt Places');
    assert.equal(first.origem_etiqueta, 'Vendas Mkt Places');
    assert.equal(separate.empresa_id, other);
    assert.equal(Number(separate.valor), 15);
    assert.equal(await sync(), 0);

    await db.query("insert into faturamentos_entradas(empresa_id,ano,mes,origem,valor,tipo_obs) values ($1,$2,$3,'Vendas Mobile',200,'vendas_mobile_sistema')", [company, first.ano, first.mes]);
    await db.query("insert into faturamentos_entradas(empresa_id,ano,mes,origem,valor,status) values ($1,$2,$3,'Prevista',800,'prevista')", [company, first.ano, first.mes]);
    const point = (await db.query("select criar_ponto_restauracao($1,'manual') as id", [company])).rows[0].id;
    await db.query("update marketplace_sales set status='cancelled' where id='online'");
    assert.equal(await sync(), 1);
    assert.equal((await entries())[0].id, first.id);
    assert.equal(Number((await entries())[0].valor), 20.01);
    assert.equal(Number((await db.query('select valor from faturamentos where empresa_id=$1', [company])).rows[0].valor), 220.01);
    await db.query("update faturamentos_entradas set valor=350 where tipo_obs='vendas_mobile_sistema'");
    await db.query('select restaurar_ponto_restauracao($1,null)', [point]);
    assert.equal((await entries())[0].id, first.id, 'ponto financeiro não recria lançamento da origem');
    assert.equal(Number((await entries())[0].valor), 20.01, 'ponto antigo não volta o faturamento de Marketplaces');
    assert.equal(Number((await db.query('select valor from faturamentos where empresa_id=$1', [company])).rows[0].valor), 220.01);

    await db.query('insert into marketplace_price_settings(empresa_id,finance_revenue_enabled) values ($1,false)', [company]);
    await order('while-disabled', 'mercado_livre', 'paid', 70);
    await sync();
    assert.equal(Number((await entries())[0].valor), 20.01);
    await db.query('update marketplace_price_settings set finance_revenue_enabled=true where empresa_id=$1', [company]);
    await sync();
    assert.equal(Number((await entries())[0].valor), 90.01);
    await db.query("update marketplace_sales set status='refunded' where id in ('magalu','while-disabled')");
    await db.query("update marketplace_direct_sales set status='cancelled' where id='direct'");
    await sync();
    assert.equal((await entries()).length, 1);
    assert.equal(Number((await db.query('select valor from faturamentos where empresa_id=$1', [company])).rows[0].valor), 200);
    await assert.rejects(db.query("update faturamentos_entradas set valor=500 where id=$1", [separate.id]), /módulo de origem/);
    await assert.rejects(db.query("delete from faturamentos_entradas where id=$1", [separate.id]), /módulo de origem/);
    await assert.rejects(db.query("update faturamentos_entradas set tipo_obs='marketplace_sistema' where tipo_obs='vendas_mobile_sistema'"), /módulo de origem/);
    await db.exec("alter table faturamentos_entradas add constraint teste_falha check (valor <> 77)");
    await order('retry', 'mercado_livre', 'paid', 77);
    assert.equal(await sync(), 0);
    assert.equal((await entries()).length, 1, 'falha não deixa lançamento parcial');
    assert.equal((await db.query("select next_attempt_at > now() as retry from marketplace_receitas_gestao where empresa_id=$1", [company])).rows[0].retry, true);
    await db.exec("alter table faturamentos_entradas drop constraint teste_falha");
    await db.query("update marketplace_receitas_gestao set next_attempt_at=now() where empresa_id=$1", [company]);
    assert.equal(await sync(), 1);
    assert.equal(Number((await entries())[0].valor), 77);
    assert.equal((await db.query("select marketplace_receita_periodo('2026-02-30T03:00:00Z') as mes")).rows[0].mes, null);
    await db.exec('set role authenticated');
    await assert.rejects(db.query('select marketplace_processar_receitas()'), /permission denied/);
    await assert.rejects(db.query('select * from marketplace_receitas_gestao'), /permission denied/);
    await db.exec('reset role; set role service_role');
    assert.equal(await sync(), 0);
  } finally {
    await db.close();
  }
});
