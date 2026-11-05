-- Contrato comum de anúncios/estoque. Não importa saldos nem reprocessa pedidos.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
alter table public.marketplace_listings drop constraint if exists marketplace_listings_provider_check;
alter table public.marketplace_listings drop constraint if exists marketplace_listings_provider_listing_id_check;
alter table public.marketplace_listings add constraint marketplace_listings_identity_check check(
 (provider='mercado_livre' and provider_listing_id~'^MLB[0-9]{6,20}$') or
 (provider='magalu' and provider_listing_id~'^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$'));
alter table public.marketplace_listing_actions add column request_payload jsonb;
alter table public.marketplace_listing_actions add column provider text not null default 'mercado_livre';
create unique index marketplace_connector_action_inflight_idx on public.marketplace_listing_actions(connection_id,provider_listing_id) where provider<>'mercado_livre' and status in ('requested','uncertain');
create table public.marketplace_inventory_channels(
 empresa_id uuid not null references public.empresas(id),connection_id uuid primary key references public.marketplace_connections(id),
 provider text not null check(provider in ('mercado_livre','magalu')),activated_at timestamptz not null default now()
);
alter table public.marketplace_inventory_channels enable row level security;
revoke all on public.marketplace_inventory_channels from public,anon,authenticated;
grant select,insert,update on public.marketplace_inventory_channels to service_role;
create function public.marketplace_connector_inventory_setup() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.provider in ('mercado_livre','magalu') and new.status in ('connected','attention') and exists(select 1 from empresa_modulos where empresa_id=new.empresa_id and modulo_id='marketplaces' and ativo and (expira_em is null or expira_em>now())) then
  insert into marketplace_inventory_settings(empresa_id)values(new.empresa_id)on conflict do nothing;
  insert into marketplace_inventory_channels(empresa_id,connection_id,provider)values(new.empresa_id,new.id,new.provider)on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function public.marketplace_connector_inventory_setup() from public,anon,authenticated;
create trigger marketplace_connector_inventory_setup after insert or update of status on public.marketplace_connections for each row execute function public.marketplace_connector_inventory_setup();
insert into marketplace_inventory_settings(empresa_id)
 select distinct c.empresa_id from marketplace_connections c join empresa_modulos m on m.empresa_id=c.empresa_id and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now()) where c.provider='magalu' and c.status in ('connected','attention') on conflict do nothing;
insert into marketplace_inventory_channels(empresa_id,connection_id,provider)
 select c.empresa_id,c.id,c.provider from marketplace_connections c join marketplace_inventory_settings s on s.empresa_id=c.empresa_id and s.enabled where c.provider in ('mercado_livre','magalu') and c.status in ('connected','attention') on conflict do nothing;
-- Usa as mesmas funções testadas; preserva guardas, baseline, idempotência e auditoria existentes.
do $migration$declare definition text;updated text;begin
 definition:=pg_get_functiondef('public.marketplace_enqueue_stock(uuid,uuid,boolean)'::regprocedure);
 updated:=replace(definition,'l.provider=''mercado_livre''','l.provider in (''mercado_livre'',''magalu'')');
 if updated=definition then raise exception 'Enfileiramento inesperado. Conferir antes da migração.';end if;execute updated;
 definition:=pg_get_functiondef('public.marketplace_order_inventory()'::regprocedure);
 updated:=replace(definition,'if coalesce(item->>''listingId'','''') !~ ''^MLB[0-9]{6,20}$'' or',
 'if not ((new.provider=''mercado_livre'' and coalesce(item->>''listingId'','''') ~ ''^MLB[0-9]{6,20}$'') or (new.provider=''magalu'' and coalesce(item->>''listingId'','''') ~ ''^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$'')) or');
 if updated=definition then raise exception 'Baixa de estoque inesperada. Conferir antes da migração.';end if;
 definition:=updated;
 updated:=replace(definition,'select * into s from marketplace_inventory_settings where empresa_id=new.empresa_id and enabled;',
 'if new.provider=''magalu'' and not exists(select 1 from marketplace_inventory_channels c where c.empresa_id=new.empresa_id and c.connection_id=new.connection_id and c.provider=''magalu'' and (new.snapshot->>''confirmedAt'')::timestamptz>c.activated_at) then return new;end if;
  select * into s from marketplace_inventory_settings where empresa_id=new.empresa_id and enabled;');
 if updated=definition then raise exception 'Baseline inesperado. Conferir antes da migração.';end if;execute updated;
end $migration$;
-- O alerta genérico passa a ser por item/SKU, sem duplicar o antigo alerta por pedido.
drop trigger if exists marketplace_magalu_sale_alert on public.marketplace_sales;
commit;
