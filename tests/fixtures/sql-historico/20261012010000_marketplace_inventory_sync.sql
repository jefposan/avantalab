-- Estoque central: baixa por pedido, fila durável e avisos individuais.
-- Não reprocessa vendas históricas nem soma quantidades das contas.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter table public.marketplace_sale_notifications drop constraint marketplace_sale_notifications_topic_check;
alter table public.marketplace_sale_notifications add constraint marketplace_sale_notifications_topic_check check(topic in ('orders_v2','orders','shipments','items'));

create table public.marketplace_inventory_settings (
  empresa_id uuid primary key references public.empresas(id),
  enabled boolean not null default true, activated_at timestamptz not null default now()
);
insert into public.marketplace_inventory_settings(empresa_id)
select distinct c.empresa_id from public.marketplace_connections c
join public.empresa_modulos m on m.empresa_id=c.empresa_id and m.modulo_id='marketplaces' and m.ativo
where c.status='connected' and c.provider='mercado_livre';

alter table public.marketplace_products add column stock_baseline_at timestamptz;
-- Todos os saldos anteriores são o ponto de partida, não uma nova entrada de estoque.
update public.marketplace_products set stock_baseline_at=now() where stock_quantity is not null;
alter table public.marketplace_stock_movements alter column actor_id drop not null;
alter table public.marketplace_stock_movements drop constraint marketplace_stock_movements_kind_check;
alter table public.marketplace_stock_movements add constraint marketplace_stock_movements_kind_check check(kind in ('confirmation','adjustment','sale'));
alter table public.marketplace_stock_movements add column provider text;
alter table public.marketplace_stock_movements add column provider_order_id text;

create table public.marketplace_inventory_events (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id),
  connection_id uuid not null references public.marketplace_connections(id), provider text not null,
  order_id text not null, listing_id text not null, variation_id text not null default '',
  quantity integer not null check(quantity between 1 and 99999), confirmed_at timestamptz not null,
  product_id uuid, state text not null default 'pending' check(state in ('pending','applied','baseline')),
  issue text, shortfall integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(connection_id,order_id,listing_id,variation_id),
  foreign key(empresa_id,product_id) references public.marketplace_products(empresa_id,id)
);
create table public.marketplace_inventory_outbox (
  link_id uuid primary key references public.marketplace_product_links(id), empresa_id uuid not null references public.empresas(id),
  product_id uuid not null, desired_quantity integer not null check(desired_quantity between 0 and 99999),
  revision bigint not null, generation uuid not null default gen_random_uuid(), allow_increase boolean not null default false,
  state text not null default 'pending' check(state in ('pending','synced','excluded')),
  issue text, attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), synced_at timestamptz,
  foreign key(empresa_id,product_id) references public.marketplace_products(empresa_id,id)
);
create index marketplace_inventory_outbox_pending_idx on public.marketplace_inventory_outbox(next_attempt_at) where state='pending';
create index marketplace_inventory_events_pending_idx on public.marketplace_inventory_events(empresa_id,created_at) where state='pending';
create table public.marketplace_sale_alerts (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id),
  connection_id uuid not null references public.marketplace_connections(id), sale_id uuid not null references public.marketplace_sales(id),
  provider text not null, listing_id text not null, variation_id text not null default '',
  title text not null, quantity integer not null, sold_at timestamptz not null, created_at timestamptz not null default now(),
  unique(sale_id,listing_id,variation_id)
);
create table public.marketplace_sale_alert_reads (
  empresa_id uuid not null references public.empresas(id), alert_id uuid not null references public.marketplace_sale_alerts(id),
  user_id uuid not null references auth.users(id), read_at timestamptz not null default now(), primary key(alert_id,user_id)
);
create table public.marketplace_inventory_reconciliation (
  connection_id uuid primary key references public.marketplace_connections(id), empresa_id uuid not null references public.empresas(id),
  checkpoint timestamptz not null, window_end timestamptz, scan_offset integer not null default 0,
  checked_at timestamptz, issue text
);
-- Credencial exclusiva do agendador. Não é a service_role nem credencial de conta ML.
create table public.marketplace_inventory_worker (
  id integer primary key check(id=1), token text not null default(gen_random_uuid()::text || gen_random_uuid()::text),
  lease_owner uuid, lease_until timestamptz, started_at timestamptz, finished_at timestamptz, issue text, turn bigint not null default 0
);
insert into public.marketplace_inventory_worker(id) values(1);

do $$ declare t text; begin
  foreach t in array array['marketplace_inventory_settings','marketplace_inventory_events','marketplace_inventory_outbox','marketplace_sale_alerts','marketplace_sale_alert_reads','marketplace_inventory_reconciliation','marketplace_inventory_worker'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select, insert, update on public.%I to service_role',t);
  end loop;
end $$;

create function public.marketplace_worker_authorized(p_token text) returns boolean
language sql security definer set search_path=public as $$
  select exists(select 1 from marketplace_inventory_worker where id=1 and token=p_token);
$$;
create function public.marketplace_worker_claim(p_owner uuid) returns boolean
language plpgsql security definer set search_path=public as $$
begin
  update marketplace_inventory_worker set lease_owner=p_owner, lease_until=now()+interval '75 seconds', started_at=now(), issue=null,turn=turn+1
  where id=1 and (lease_until is null or lease_until<now());
  return found;
end $$;

create function public.marketplace_enqueue_stock(p_empresa uuid,p_product uuid,p_increase boolean default false) returns void
language plpgsql security definer set search_path=public as $$
begin
  insert into marketplace_inventory_outbox(link_id,empresa_id,product_id,desired_quantity,revision,allow_increase)
  select l.id,l.empresa_id,p.id,p.stock_quantity,p.revision,p_increase
  from marketplace_products p join marketplace_product_links l on l.empresa_id=p.empresa_id and l.product_id=p.id
  join marketplace_inventory_settings s on s.empresa_id=p.empresa_id and s.enabled
  where p.empresa_id=p_empresa and p.id=p_product and p.archived_at is null and p.stock_quantity is not null
  on conflict(link_id) do update set product_id=excluded.product_id,desired_quantity=excluded.desired_quantity,revision=excluded.revision,
    generation=gen_random_uuid(),allow_increase=excluded.allow_increase,state='pending',issue=null,attempts=0,next_attempt_at=now(),updated_at=now();
end $$;

create function public.marketplace_stock_baseline() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.stock_quantity is not null and (tg_op='INSERT' or new.stock_confirmed_at is distinct from old.stock_confirmed_at) then
    new.stock_baseline_at:=coalesce(new.stock_confirmed_at,now());
  end if;
  return new;
end $$;
create trigger marketplace_stock_baseline before insert or update on public.marketplace_products for each row execute function public.marketplace_stock_baseline();
create function public.marketplace_stock_changed() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' or new.stock_quantity is distinct from old.stock_quantity then
    perform marketplace_enqueue_stock(new.empresa_id,new.id,tg_op='INSERT' or new.stock_confirmed_at is distinct from old.stock_confirmed_at);
  end if;
  return new;
end $$;
create trigger marketplace_stock_changed after insert or update on public.marketplace_products for each row execute function public.marketplace_stock_changed();
create function public.marketplace_link_changed() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' or new.product_id is distinct from old.product_id then
    perform marketplace_enqueue_stock(new.empresa_id,new.product_id,false);
  end if;
  return new;
end $$;
create trigger marketplace_link_changed after insert or update on public.marketplace_product_links for each row execute function public.marketplace_link_changed();

create function public.marketplace_observe_listing(p_empresa uuid,p_connection uuid,p_listing text,p_quantity integer,p_status text) returns void
language plpgsql security definer set search_path=public as $$
declare l marketplace_product_links;
begin
  select * into l from marketplace_product_links where empresa_id=p_empresa and connection_id=p_connection and provider_listing_id=p_listing for update;
  if not found then return; end if;
  if not exists(select 1 from marketplace_connections where id=p_connection and empresa_id=p_empresa and provider=l.provider) then raise exception 'Conta não pertence à empresa.'; end if;
  if l.reported_stock is distinct from p_quantity or l.status is distinct from p_status then
    update marketplace_product_links set reported_stock=p_quantity,status=p_status,updated_at=now() where id=l.id;
    perform marketplace_enqueue_stock(p_empresa,l.product_id,false);
  end if;
end $$;
create function public.marketplace_inventory_connection() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.status='connected' then
    insert into marketplace_inventory_settings(empresa_id) values(new.empresa_id) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger marketplace_inventory_connection after insert or update on public.marketplace_connections for each row execute function public.marketplace_inventory_connection();

create function public.marketplace_apply_inventory_event(p_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare e marketplace_inventory_events; p marketplace_products; l marketplace_product_links; s marketplace_inventory_settings;
begin
  select * into e from marketplace_inventory_events where id=p_id for update;
  if not found or e.state<>'pending' then return; end if;
  select * into s from marketplace_inventory_settings where empresa_id=e.empresa_id and enabled;
  if not found then return; end if;
  if e.confirmed_at<=s.activated_at then
    update marketplace_inventory_events set state='baseline',issue=null,updated_at=now() where id=e.id; return;
  end if;
  if e.variation_id<>'' then
    update marketplace_inventory_events set issue='variation_not_linked',updated_at=now() where id=e.id; return;
  end if;
  select * into l from marketplace_product_links where empresa_id=e.empresa_id and connection_id=e.connection_id and provider=e.provider and provider_listing_id=e.listing_id;
  if not found then update marketplace_inventory_events set issue='product_not_linked',updated_at=now() where id=e.id; return; end if;
  select * into p from marketplace_products where empresa_id=e.empresa_id and id=l.product_id and archived_at is null for update;
  if not found or p.stock_quantity is null then
    update marketplace_inventory_events set product_id=l.product_id,issue='stock_not_confirmed',updated_at=now() where id=e.id; return;
  end if;
  if e.confirmed_at<=p.stock_baseline_at then
    update marketplace_inventory_events set product_id=p.id,state='baseline',issue=null,updated_at=now() where id=e.id; return;
  end if;
  update marketplace_products set stock_quantity=greatest(0,p.stock_quantity-e.quantity),revision=revision+1,updated_at=now() where id=p.id;
  insert into marketplace_stock_movements(empresa_id,product_id,actor_id,kind,stock_before,stock_after,note,provider,provider_order_id)
  values(e.empresa_id,p.id,null,'sale',p.stock_quantity,greatest(0,p.stock_quantity-e.quantity),'Venda '||e.order_id||' · '||e.quantity||' unidade(s) · '||e.listing_id,e.provider,e.order_id);
  update marketplace_inventory_events set product_id=p.id,state='applied',shortfall=greatest(0,e.quantity-p.stock_quantity),issue=case when e.quantity>p.stock_quantity then 'insufficient_stock' end,updated_at=now() where id=e.id;
end $$;

create function public.marketplace_order_inventory() returns trigger
language plpgsql security definer set search_path=public as $$
declare item jsonb; e_id uuid; s marketplace_inventory_settings; v_closed timestamptz; v_quantity integer; v_changed boolean;
begin
  select * into s from marketplace_inventory_settings where empresa_id=new.empresa_id and enabled;
  if not found or not exists(select 1 from marketplace_connections where id=new.connection_id and empresa_id=new.empresa_id and provider=new.provider) then return new; end if;
  if jsonb_typeof(new.snapshot->'inventoryLines') is distinct from 'array' then return new; end if;
  begin v_closed:=(new.snapshot->>'confirmedAt')::timestamptz; exception when others then return new; end;
  if v_closed is null or v_closed>now()+interval '1 minute' then return new; end if;
  for item in select value from jsonb_array_elements(new.snapshot->'inventoryLines') loop
    if coalesce(item->>'listingId','') !~ '^MLB[0-9]{6,20}$' or coalesce(item->>'quantity','') !~ '^[0-9]{1,5}$' then continue; end if;
    v_quantity:=(item->>'quantity')::integer; if v_quantity<1 then continue; end if;
    insert into marketplace_inventory_events(empresa_id,connection_id,provider,order_id,listing_id,variation_id,quantity,confirmed_at)
    values(new.empresa_id,new.connection_id,new.provider,new.provider_order_id,item->>'listingId',coalesce(item->>'variationId',''),v_quantity,v_closed)
    on conflict(connection_id,order_id,listing_id,variation_id) do nothing;
    select id,quantity<>v_quantity into e_id,v_changed from marketplace_inventory_events where connection_id=new.connection_id and order_id=new.provider_order_id and listing_id=item->>'listingId' and variation_id=coalesce(item->>'variationId','');
    if v_changed then update marketplace_inventory_events set issue='order_quantity_changed',updated_at=now() where id=e_id;
    else perform marketplace_apply_inventory_event(e_id); end if;
    -- Cancelamento posterior não devolve estoque nem gera um novo aviso de venda.
    if new.status in ('paid','partially_refunded') and v_closed>s.activated_at then
      insert into marketplace_sale_alerts(empresa_id,connection_id,sale_id,provider,listing_id,variation_id,title,quantity,sold_at)
      values(new.empresa_id,new.connection_id,new.id,new.provider,item->>'listingId',coalesce(item->>'variationId',''),coalesce(item->>'title','Produto'),v_quantity,v_closed)
      on conflict(sale_id,listing_id,variation_id) do nothing;
    end if;
  end loop;
  return new;
end $$;
create trigger marketplace_order_inventory after insert or update on public.marketplace_sales for each row execute function public.marketplace_order_inventory();

create function public.marketplace_order_freshness() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_old timestamptz; v_new timestamptz;
begin
  begin
    v_old:=(old.snapshot->>'providerUpdatedAt')::timestamptz;
    v_new:=(new.snapshot->>'providerUpdatedAt')::timestamptz;
  exception when others then return new; end;
  if v_old is not null and v_new is not null and v_new<v_old then return null; end if;
  return new;
end $$;
create trigger marketplace_order_freshness before update on public.marketplace_sales for each row execute function public.marketplace_order_freshness();

create function public.marketplace_live_feed(p_empresa uuid,p_user uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from usuarios_empresa u join empresa_modulos m on m.empresa_id=u.empresa_id
    where u.empresa_id=p_empresa and u.user_id=p_user and u.status='ativo' and u.perfil in ('gestor_master','administrador','operador_completo','operador_simples')
    and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now())) then raise exception 'Sem acesso aos avisos desta empresa.'; end if;
  return jsonb_build_object(
    'alerts',coalesce((select jsonb_agg(v) from (select a.id,a.connection_id,a.provider,a.listing_id,a.title,a.quantity,a.sold_at,
      s.provider_order_id as order_id,c.seller_name as account_name,l.snapshot->>'permalink' as permalink
      from marketplace_sale_alerts a join marketplace_sales s on s.id=a.sale_id and s.empresa_id=a.empresa_id
      join marketplace_connections c on c.id=a.connection_id and c.empresa_id=a.empresa_id
      left join marketplace_listings l on l.connection_id=a.connection_id and l.provider_listing_id=a.listing_id and l.empresa_id=a.empresa_id
      where a.empresa_id=p_empresa and s.status in ('paid','partially_refunded')
      and not exists(select 1 from marketplace_sale_alert_reads r where r.alert_id=a.id and r.user_id=p_user)
      order by a.created_at,a.id limit 20) v),'[]'::jsonb),
    'pendingStock',(select count(*) from marketplace_inventory_outbox where empresa_id=p_empresa and state='pending'),
    'pendingSales',(select count(*) from marketplace_sale_notifications where empresa_id=p_empresa and processed_at is null),
    'issues',coalesce((select jsonb_agg(v) from (select issue,count(*) as total from (
      select issue from marketplace_inventory_events where empresa_id=p_empresa and issue is not null
      union all select issue from marketplace_inventory_outbox where empresa_id=p_empresa and state='pending' and issue is not null
      union all select issue from marketplace_inventory_reconciliation where empresa_id=p_empresa and issue is not null
      union all select error_code as issue from marketplace_sale_notifications where empresa_id=p_empresa and processed_at is null and error_code is not null
    ) t group by issue) v),'[]'::jsonb),
    'updatedAt',greatest(
      (select max(updated_at) from marketplace_products where empresa_id=p_empresa),
      (select max(updated_at) from marketplace_sales where empresa_id=p_empresa),
      (select max(synced_at) from marketplace_listings where empresa_id=p_empresa)),
    'workerFinishedAt',(select finished_at from marketplace_inventory_worker where id=1),
    'workerHealthy',coalesce((select finished_at>now()-interval '3 minutes' and issue is null from marketplace_inventory_worker where id=1),false),
    'enabled',coalesce((select enabled from marketplace_inventory_settings where empresa_id=p_empresa),false)
  );
end $$;

-- Sinal sem dados do pedido: somente assinantes autorizados relêem a API.
create function public.marketplace_broadcast_changed() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is not null then
    perform realtime.send('{}'::jsonb,'changed','marketplace:'||new.empresa_id::text,true);
  end if;
  return new;
exception when others then
  -- Realtime é só um sinal. Sua indisponibilidade não pode reverter venda/estoque.
  return new;
end $$;
create trigger marketplace_sales_broadcast after insert or update on public.marketplace_sales for each row execute function public.marketplace_broadcast_changed();
create trigger marketplace_products_broadcast after insert or update on public.marketplace_products for each row execute function public.marketplace_broadcast_changed();
create trigger marketplace_listings_broadcast after insert or update on public.marketplace_listings for each row execute function public.marketplace_broadcast_changed();
do $$ begin
  if to_regclass('realtime.messages') is not null then
    execute $policy$create policy marketplace_company_broadcast on realtime.messages for select to authenticated using (
      extension='broadcast' and realtime.topic() ~ '^marketplace:[0-9a-f-]{36}$'
      and exists(select 1 from public.usuarios_empresa u join public.empresa_modulos m on m.empresa_id=u.empresa_id
      where 'marketplace:'||u.empresa_id::text=realtime.topic() and u.user_id=auth.uid() and u.status='ativo'
      and u.perfil in ('gestor_master','administrador','operador_completo','operador_simples') and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now())))$policy$;
  end if;
end $$;

select public.marketplace_enqueue_stock(empresa_id,id,false) from public.marketplace_products where stock_quantity is not null and archived_at is null;

-- APIs/RPCs protegidos: usuários só recebem resumos pelo servidor autenticado.
do $$ declare f text; begin
  foreach f in array array['marketplace_worker_authorized(text)','marketplace_worker_claim(uuid)','marketplace_enqueue_stock(uuid,uuid,boolean)','marketplace_stock_baseline()','marketplace_stock_changed()','marketplace_link_changed()','marketplace_observe_listing(uuid,uuid,text,integer,text)','marketplace_inventory_connection()','marketplace_apply_inventory_event(uuid)','marketplace_order_inventory()','marketplace_order_freshness()','marketplace_live_feed(uuid,uuid)','marketplace_broadcast_changed()'] loop
    execute 'revoke all on function public.'||f||' from public, anon, authenticated';
    execute 'grant execute on function public.'||f||' to service_role';
  end loop;
end $$;
notify pgrst,'reload schema';
commit;
