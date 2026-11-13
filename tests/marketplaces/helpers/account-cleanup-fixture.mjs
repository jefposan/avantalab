import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { sqlDeTesteURL } from '../../helpers/sql-historico.mjs';

export const scope = {
  company: '10000000-0000-4000-8000-000000000001',
  other: '10000000-0000-4000-8000-000000000002',
  actor: '10000000-0000-4000-8000-000000000003',
  account: '10000000-0000-4000-8000-000000000004',
  sharedAccount: '10000000-0000-4000-8000-000000000005',
  foreignAccount: '10000000-0000-4000-8000-000000000006',
};
const migration = name => readFileSync(sqlDeTesteURL(name), 'utf8');
export async function accountCleanupFixture() {
  const db = new PGlite();
  await db.exec(`
    create schema auth; create role anon; create role authenticated; create role service_role;
    create table auth.users(id uuid primary key);
    create table empresas(id uuid primary key,nome text);
    create table usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text);
    create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);
    create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text,connected_by uuid,
      seller_name text,seller_reference text,status text default 'disconnected',last_error_code text,token_sealed jsonb,
      refresh_lock_until timestamptz,sync_lock_until timestamptz,expires_at timestamptz,last_synced_at timestamptz,
      sync_cursor text,sync_phase text,sync_pending_ids text[],updated_at timestamptz default now());
    create table marketplace_connection_labels(empresa_id uuid,connection_id uuid,local_label text);
    create table marketplace_listings(id uuid primary key default gen_random_uuid(),empresa_id uuid,connection_id uuid,
      provider text,provider_listing_id text,title text,status text,snapshot jsonb,synced_at timestamptz default now(),
      unique(connection_id,provider_listing_id));
    create table marketplace_publications(empresa_id uuid,connection_id uuid,provider_listing_id text,response_summary jsonb,status text);
    create table marketplace_inventory_events(id uuid default gen_random_uuid(),empresa_id uuid,product_id uuid,connection_id uuid,
      listing_id text,provider text,order_id text,state text,issue text,confirmed_at timestamptz);
    create table marketplace_inventory_outbox(empresa_id uuid,product_id uuid,link_id uuid,state text,issue text,
      next_attempt_at timestamptz,generation uuid default gen_random_uuid(),updated_at timestamptz default now());
    create table marketplace_inventory_worker(id integer primary key,lease_until timestamptz);
    insert into marketplace_inventory_worker values(1,null);
    create table marketplace_listing_actions(id uuid default gen_random_uuid(),empresa_id uuid,connection_id uuid,
      provider_listing_id text,action text,status text,error_code text);
    create function marketplace_enqueue_stock(e uuid,p uuid,i boolean) returns void language sql as $$select$$;
  `);
  await db.exec(migration('20261011200000_marketplace_local_products.sql'));
  await db.exec(migration('20261019230000_marketplace_warehouses.sql'));
  await db.exec(`
    alter table marketplace_products add column stock_baseline_at timestamptz;
    alter table marketplace_inventory_events add foreign key(empresa_id,product_id) references marketplace_products(empresa_id,id);
    create table marketplace_direct_sales(id uuid primary key default gen_random_uuid(),empresa_id uuid,product_id uuid,
      product_name text,total_cents integer,foreign key(empresa_id,product_id) references marketplace_products(empresa_id,id));
    create table marketplace_price_consultations(id uuid primary key default gen_random_uuid(),empresa_id uuid,local_product_id uuid,
      foreign key(empresa_id,local_product_id) references marketplace_products(empresa_id,id));
    create table marketplace_price_product_sources(empresa_id uuid,product_id uuid,
      foreign key(empresa_id,product_id) references marketplace_products(empresa_id,id));
    create table marketplace_product_internal_notes(empresa_id uuid,product_id uuid,notes text,
      foreign key(empresa_id,product_id) references marketplace_products(empresa_id,id));
    create table marketplace_product_price_researches(empresa_id uuid,product_id uuid,status text,
      foreign key(empresa_id,product_id) references marketplace_products(empresa_id,id));
    create table marketplace_catalog_completion(empresa_id uuid,product_id uuid,state text,
      foreign key(empresa_id,product_id) references marketplace_products(empresa_id,id) on delete cascade);
    create table marketplace_sales(id uuid primary key default gen_random_uuid(),empresa_id uuid,connection_id uuid,snapshot jsonb);
    create table marketplace_sale_alerts(id uuid primary key default gen_random_uuid(),empresa_id uuid,connection_id uuid,title text,created_at timestamptz default clock_timestamp());
    create table marketplace_sale_notifications(id uuid primary key default gen_random_uuid(),empresa_id uuid,
      connection_id uuid,created_at timestamptz default now(),processed_at timestamptz,error_code text,topic text,resource text);
    create table marketplace_inventory_reconciliation(empresa_id uuid,connection_id uuid,issue text);
    create table marketplace_listing_status_checks(empresa_id uuid,connection_id uuid,issue text);
    create table marketplace_listing_stock_control(link_id uuid,empresa_id uuid,product_id uuid);
    create table marketplace_notifications(empresa_id uuid,connection_id uuid);
    create function marketplace_live_feed(p_empresa uuid,p_user uuid) returns jsonb language sql as $$
      select jsonb_build_object('alerts',coalesce((select jsonb_agg(v) from
        (select a.id,a.connection_id from marketplace_sale_alerts a join (select 'paid'::text status) s on true
          where a.empresa_id=p_empresa and s.status='paid' order by a.created_at limit 20) v),'[]'::jsonb),
        'pendingSales',(select count(*) from marketplace_sale_notifications where empresa_id=p_empresa and processed_at is null))$$;
  `);
  await db.exec(migration('20261022010000_marketplace_listing_catalog_import.sql'));
  await db.exec(migration('20261022160000_marketplace_product_removal.sql'));
  await db.exec(migration('20261022180000_marketplace_product_delete_simple.sql'));
  await db.exec(migration('20261113180000_marketplace_account_cleanup.sql'));
  const { company, other, actor, account, sharedAccount, foreignAccount } = scope;
  await db.query("insert into empresas values($1,'TRIDIUM · teste local'),($2,'SALDÃO · teste local')", [company, other]);
  await db.query('insert into auth.users values($1)', [actor]);
  for (const tenant of [company, other]) {
    await db.query("insert into usuarios_empresa values($1,$2,'ativo','administrador')", [actor, tenant]);
    await db.query("insert into empresa_modulos values($1,'marketplaces',true,null)", [tenant]);
  }
  for (const [id, tenant, name] of [[account, company, 'JEFF'], [sharedAccount, company, 'OUTRA CONTA'], [foreignAccount, other, 'JEFF']]) {
    await db.query("insert into marketplace_connections(id,empresa_id,provider,connected_by,seller_name,seller_reference) values($1,$2,'mercado_livre',$3,$4,'230210240')", [id, tenant, actor, name]);
    await db.query('insert into marketplace_connection_labels values($1,$2,$3)', [tenant, id, name]);
  }
  async function add(title, ean, connection = account, tenant = company) {
    const listing = 'MLB' + ean;
    await db.query("insert into marketplace_listings(empresa_id,connection_id,provider,provider_listing_id,title,status,snapshot) values($1,$2,'mercado_livre',$3,$4,'active',$5)", [
      tenant, connection, listing, title, JSON.stringify({ ean, price: 100, stock: 3, pictures: [], attributes: [] }),
    ]);
    return (await db.query('select product_id from marketplace_product_links where empresa_id=$1 and connection_id=$2 and provider_listing_id=$3', [tenant, connection, listing])).rows[0].product_id;
  }
  const eligible = await add('Panificadora importada sem movimentação', '7898578153678');
  const shared = await add('Ventilador usado em duas contas', '7899882314236');
  await add('Ventilador usado em duas contas', '7899882314236', sharedAccount);
  const stocked = await add('Cafeteira com saldo registrado', '7898578150400');
  await db.query('update marketplace_products set stock_quantity=2,stock_confirmed_at=now() where id=$1', [stocked]);
  const sold = await add('Calculadora com venda registrada', '7897013526107');
  await db.query("insert into marketplace_direct_sales(empresa_id,product_id,product_name,total_cents)values($1,$2,'Calculadora com venda registrada',10000)", [company, sold]);
  const foreign = await add('Panificadora do SALDÃO', '7898578153678', foreignAccount, other);
  await db.query("insert into marketplace_sale_alerts(empresa_id,connection_id,title) values($1,$2,'Aviso antigo da conta')", [company, account]);
  await db.query("insert into marketplace_sale_notifications(empresa_id,connection_id,error_code) values($1,$2,'retry')", [company, account]);
  return { db, scope, products: { eligible, shared, stocked, sold, foreign }, add };
}

/** Adaptador local para executar os serviços reais sobre o PostgreSQL de teste. */
export function fixtureClient(db) {
  return {
    from(table) {
      const filters = [];
      let range = [0, Infinity], ordering;
      const query = {
        select() { return query; },
        eq(key, value) { filters.push(row => row[key] === value); return query; },
        in(key, values) { filters.push(row => values.includes(row[key])); return query; },
        is(key, value) { filters.push(row => (row[key] ?? null) === value); return query; },
        not(key, op, value) { filters.push(row => op === 'is' ? row[key] != null : row[key] !== value); return query; },
        order(key) { ordering = key; return query; },
        range(start, end) { range = [start, end]; return query; },
        abortSignal() { return query; },
        then(resolve, reject) {
          return (async () => {
            const { rows } = await db.query('select * from public.' + table);
            const data = rows.filter(row => filters.every(filter => filter(row)));
            if (ordering) data.sort((a, b) => String(a[ordering]).localeCompare(String(b[ordering])));
            return { data: data.slice(range[0], range[1] + 1), error: null };
          })().then(resolve, reject);
        },
      };
      return query;
    },
    rpc(name, args) {
      const query = {
        async abortSignal() {
          try {
            const entries = Object.entries(args);
            const placeholders = entries.map(([key], i) => key + ' => $' + (i + 1)).join(',');
            const { rows } = await db.query('select public.' + name + '(' + placeholders + ') as value',
              entries.map(([, value]) => value && typeof value === 'object' && !Array.isArray(value) ? JSON.stringify(value) : value));
            return { data: rows[0].value, error: null };
          } catch (error) { return { data: null, error: { code: error.code, message: error.message } }; }
        },
      };
      return query;
    },
  };
}
