-- Avisos de envio pendente independentes da baixa de estoque e do ponto inicial.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
alter table public.marketplace_sale_alerts add column if not exists alert_kind text not null default 'new_sale';
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.marketplace_sale_alerts'::regclass and conname='marketplace_sale_alerts_kind_check') then
    alter table public.marketplace_sale_alerts add constraint marketplace_sale_alerts_kind_check check(alert_kind in ('new_sale','pending_dispatch'));
  end if;
end $$;

create or replace function public.marketplace_register_pending_sale(p_sale uuid) returns void
language plpgsql security definer set search_path=public as $$
declare sale marketplace_sales; item jsonb; listing text; qty integer; sold timestamptz; baseline timestamptz; connected timestamptz;
begin
  select s.* into sale from marketplace_sales s join marketplace_connections c on c.id=s.connection_id and c.empresa_id=s.empresa_id and c.provider=s.provider
    where s.id=p_sale and s.provider in ('mercado_livre','magalu') and s.status in ('paid','confirmed','partially_refunded')
    and coalesce(s.shipment_status,'') in ('','pending','handling','ready_to_ship','not_verified') and s.label_status<>'fulfilled'
    and (c.status='connected' or (c.provider='magalu' and c.status='attention' and c.last_error_code='magalu_connector_pending'));
  if not found then return; end if;
  if not exists(select 1 from empresa_modulos where empresa_id=sale.empresa_id and modulo_id='marketplaces' and ativo and (expira_em is null or expira_em>now())) then return; end if;
  if exists(select 1 from marketplace_sale_alerts where sale_id=sale.id and empresa_id=sale.empresa_id and connection_id=sale.connection_id) then return; end if;
  item:=case when sale.provider='mercado_livre' then sale.snapshot->'inventoryLines'->0 else sale.snapshot->'items'->0 end;
  listing:=case when sale.provider='mercado_livre' then item->>'listingId' else 'order:'||sale.provider_order_id end;
  if listing is null or (sale.provider='mercado_livre' and listing !~ '^MLB[0-9]{6,20}$') or coalesce(item->>'quantity','') !~ '^[0-9]{1,5}$' then return; end if;
  qty:=(item->>'quantity')::integer; if qty<1 then return; end if;
  begin sold:=coalesce((sale.snapshot->>'confirmedAt')::timestamptz,(sale.snapshot->>'soldAt')::timestamptz); exception when others then return; end;
  if sold is null or sold>now()+interval '1 minute' then return; end if;
  select connected_at into connected from marketplace_connections where id=sale.connection_id and empresa_id=sale.empresa_id;
  select activated_at into baseline from marketplace_inventory_settings where empresa_id=sale.empresa_id;
  baseline:=coalesce(baseline,connected,now());
  insert into marketplace_sale_alerts(empresa_id,connection_id,sale_id,provider,listing_id,variation_id,title,quantity,sold_at,alert_kind)
  values(sale.empresa_id,sale.connection_id,sale.id,sale.provider,listing,coalesce(item->>'variationId',''),coalesce(item->>'title','Produto'),qty,sold,
    case when sold<=baseline then 'pending_dispatch' else 'new_sale' end)
  on conflict(sale_id,listing_id,variation_id) do nothing;
end $$;
revoke all on function public.marketplace_register_pending_sale(uuid) from public,anon,authenticated;
grant execute on function public.marketplace_register_pending_sale(uuid) to service_role;
create or replace function public.marketplace_sale_pending_alert() returns trigger
language plpgsql security definer set search_path=public as $$ begin
  perform marketplace_register_pending_sale(new.id); return new;
end $$;
revoke all on function public.marketplace_sale_pending_alert() from public,anon,authenticated;
drop trigger if exists marketplace_sale_pending_alert on public.marketplace_sales;
create trigger marketplace_sale_pending_alert after insert or update on public.marketplace_sales for each row execute function public.marketplace_sale_pending_alert();
drop trigger if exists marketplace_sale_alerts_broadcast on public.marketplace_sale_alerts;
create trigger marketplace_sale_alerts_broadcast after insert on public.marketplace_sale_alerts for each row execute function public.marketplace_broadcast_changed();
-- Backfill chama SOMENTE o registrador de avisos: não atualiza vendas ou estoque.
select public.marketplace_register_pending_sale(id) from public.marketplace_sales
where status in ('paid','confirmed','partially_refunded') and coalesce(shipment_status,'') in ('','pending','handling','ready_to_ship','not_verified') and label_status<>'fulfilled';

create or replace function public.marketplace_live_feed(p_empresa uuid,p_user uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from usuarios_empresa u join empresa_modulos m on m.empresa_id=u.empresa_id
    where u.empresa_id=p_empresa and u.user_id=p_user and u.status='ativo' and u.perfil in ('gestor_master','administrador','operador_completo','operador_simples')
    and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now())) then raise exception 'Sem acesso aos avisos desta empresa.'; end if;
  return jsonb_build_object(
    'alerts',coalesce((select jsonb_agg(v) from (select * from (select distinct on(s.id) a.id,a.sale_id,a.connection_id,a.provider,a.listing_id,a.title,a.quantity,a.sold_at,a.alert_kind as kind,
      s.provider_order_id as order_id,coalesce(nullif(names.local_label,''),c.seller_name) as account_name,l.snapshot->>'permalink' as permalink,a.created_at
      from marketplace_sale_alerts a join marketplace_sales s on s.id=a.sale_id and s.empresa_id=a.empresa_id and s.connection_id=a.connection_id and s.provider=a.provider
      join marketplace_connections c on c.id=a.connection_id and c.empresa_id=a.empresa_id and c.provider=a.provider
      left join marketplace_connection_labels names on names.connection_id=c.id and names.empresa_id=c.empresa_id
      left join marketplace_listings l on l.connection_id=a.connection_id and l.provider_listing_id=a.listing_id and l.empresa_id=a.empresa_id
      where a.empresa_id=p_empresa and s.status in ('paid','confirmed','partially_refunded')
      and coalesce(s.shipment_status,'') in ('','pending','handling','ready_to_ship','not_verified') and s.label_status<>'fulfilled'
      and (c.status='connected' or (c.provider='magalu' and c.status='attention' and c.last_error_code='magalu_connector_pending'))
      and not exists(select 1 from marketplace_sale_alert_reads r where r.alert_id=a.id and r.user_id=p_user and r.empresa_id=p_empresa)
      order by s.id,a.created_at,a.id) grouped order by created_at,id limit 20) v),'[]'::jsonb),
    'pendingStock',(select count(*) from marketplace_inventory_outbox where empresa_id=p_empresa and state='pending'),
    'pendingSales',(select count(*) from marketplace_sale_notifications where empresa_id=p_empresa and processed_at is null),
    'issues',coalesce((select jsonb_agg(v) from (select issue,count(*) as total from (
      select issue from marketplace_inventory_events where empresa_id=p_empresa and issue is not null
      union all select issue from marketplace_inventory_outbox where empresa_id=p_empresa and state='pending' and issue is not null
      union all select issue from marketplace_inventory_reconciliation where empresa_id=p_empresa and issue is not null
      union all select error_code as issue from marketplace_sale_notifications where empresa_id=p_empresa and processed_at is null and error_code is not null
    ) t group by issue) v),'[]'::jsonb),
    'updatedAt',greatest((select max(updated_at) from marketplace_products where empresa_id=p_empresa),(select max(updated_at) from marketplace_sales where empresa_id=p_empresa),(select max(synced_at) from marketplace_listings where empresa_id=p_empresa)),
    'workerFinishedAt',(select finished_at from marketplace_inventory_worker where id=1),
    'workerHealthy',coalesce((select finished_at>now()-interval '3 minutes' and issue is null from marketplace_inventory_worker where id=1),false),
    'enabled',coalesce((select enabled from marketplace_inventory_settings where empresa_id=p_empresa),false)
  );
end $$;
revoke all on function public.marketplace_live_feed(uuid,uuid) from public,anon,authenticated;
grant execute on function public.marketplace_live_feed(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
