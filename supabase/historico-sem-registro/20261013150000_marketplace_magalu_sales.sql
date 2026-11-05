-- Preparada localmente: aplicar somente com autorização para o banco de destino.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter table public.marketplace_sales drop constraint if exists marketplace_sales_provider_check;
alter table public.marketplace_sales drop constraint if exists marketplace_sales_provider_order_id_check;
alter table public.marketplace_sales drop constraint if exists marketplace_sales_order_provider_check;
alter table public.marketplace_sales add constraint marketplace_sales_order_provider_check check (
  (provider='mercado_livre' and provider_order_id ~ '^[0-9]{1,24}$') or
  (provider='magalu' and provider_order_id ~ '^[A-Za-z0-9_-]{1,100}$')
);
create unique index if not exists marketplace_connections_company_id_idx on public.marketplace_connections(empresa_id,id);
create table if not exists public.marketplace_magalu_sales_sync (
  connection_id uuid primary key, empresa_id uuid not null references public.empresas(id),
  scan_offset integer not null default 0 check(scan_offset>=0),
  checkpoint timestamptz, window_end timestamptz, last_completed_at timestamptz,
  last_checked_at timestamptz, lease_owner uuid, lease_until timestamptz,
  foreign key(empresa_id,connection_id) references public.marketplace_connections(empresa_id,id) on delete cascade
);
alter table public.marketplace_magalu_sales_sync enable row level security;
revoke all on public.marketplace_magalu_sales_sync from public, anon, authenticated;
grant select,insert,update,delete on public.marketplace_magalu_sales_sync to service_role;

create or replace function public.marketplace_magalu_sale_alert() returns trigger
language plpgsql security definer set search_path=public as $$
declare approved timestamptz; connected timestamptz; activated timestamptz; item jsonb;
begin
  if new.provider<>'magalu' or new.status<>'paid' then return new; end if;
  select connected_at into connected from marketplace_connections where id=new.connection_id and empresa_id=new.empresa_id and provider='magalu' and status in ('connected','attention');
  if not found then return new; end if;
  select activated_at into activated from marketplace_inventory_settings where empresa_id=new.empresa_id and enabled;
  if not found then return new; end if;
  begin approved:=(new.snapshot->>'confirmedAt')::timestamptz; exception when others then return new; end;
  if approved is null or approved<=greatest(connected,activated) or approved>now()+interval '1 minute' then return new; end if;
  item:=new.snapshot->'items'->0;
  if coalesce(item->>'quantity','') !~ '^[0-9]{1,5}$' or (item->>'quantity')::integer<1 then return new; end if;
  -- Aviso por pedido. Não baixa estoque: conector de estoque Magalu é uma etapa separada.
  insert into marketplace_sale_alerts(empresa_id,connection_id,sale_id,provider,listing_id,variation_id,title,quantity,sold_at)
  values(new.empresa_id,new.connection_id,new.id,'magalu','order:'||new.provider_order_id,'',coalesce(item->>'title','Produto'),(item->>'quantity')::integer,approved)
  on conflict(sale_id,listing_id,variation_id) do nothing;
  return new;
end $$;
revoke all on function public.marketplace_magalu_sale_alert() from public,anon,authenticated;
drop trigger if exists marketplace_magalu_sale_alert on public.marketplace_sales;
create trigger marketplace_magalu_sale_alert after insert or update on public.marketplace_sales for each row execute function public.marketplace_magalu_sale_alert();
commit;
