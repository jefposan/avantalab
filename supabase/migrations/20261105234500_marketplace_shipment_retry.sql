-- Correção 3.2.0.353: classificação e consultas aprovadas pelo responsável em 06/11/2026.
-- Classificação e fila apenas. Não altera saldo, pedido, token ou documento fiscal.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';

create or replace function public.marketplace_shipment_has_left_seller(p_status text,p_substatus text)
returns boolean language sql immutable as $$
  select coalesce(p_status in ('shipped','delivered','not_delivered') or
    (p_status='ready_to_ship' and p_substatus in
      ('picked_up','dropped_off','authorized_by_carrier','in_hub','in_transit','out_for_delivery','soon_deliver','at_the_door')),false);
$$;
revoke all on function public.marketplace_shipment_has_left_seller(text,text) from public,anon,authenticated;
grant execute on function public.marketplace_shipment_has_left_seller(text,text) to service_role;

create or replace function public.marketplace_sale_operation(p_status text,p_shipment text,p_snapshot jsonb,p_substatus text)
returns text language sql immutable as $$
  select case
    when p_snapshot->'postSaleProgress'->>'state'='open' then 'Pós-venda em andamento'
    when p_status in ('cancelled','refunded') then
      case when p_snapshot->'postSaleProgress'->>'state'='closed' then null else 'Pós-venda a confirmar' end
    when p_status='partially_refunded' and (p_snapshot->'postSaleProgress'->>'state') is distinct from 'closed' then 'Pós-venda a confirmar'
    when p_status='invalid' then null
    when p_status='pending_cancel' then 'Cancelamento em processamento'
    when p_status='payment_required' then 'Aguardando pagamento'
    when p_status='payment_in_process' then 'Pagamento em análise'
    when p_status='partially_paid' then 'Pagamento parcial'
    when p_shipment='delivered' then
      case when p_snapshot->'postSaleProgress'->>'state'='unknown' then 'Pós-venda a confirmar' else null end
    when p_shipment='not_delivered' then 'Não entregue / devolução em andamento'
    when p_shipment='shipped' or public.marketplace_shipment_has_left_seller(p_shipment,p_substatus) then 'Em trânsito'
    when p_shipment in ('pending','handling','ready_to_ship','not_verified') then 'Aguardando envio'
    when p_status in ('paid','confirmed') then 'Venda confirmada'
    else 'Pedido em atualização'
  end;
$$;
revoke all on function public.marketplace_sale_operation(text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.marketplace_sale_operation(text,text,jsonb,text) to service_role;

create or replace view public.marketplace_listing_operations with (security_invoker=true) as
select l.empresa_id,l.connection_id,l.provider_listing_id,l.search_text,l.status,l.snapshot,l.synced_at,
  case when o.total>0 then 'active'
    when l.status='active' and l.snapshot->>'stock'='0' then 'inactive'
    else l.status end as operational_status,
  jsonb_build_object('count',o.total,'labels',coalesce(o.labels,'[]'::jsonb)) as operations
from public.marketplace_listings l
cross join lateral (
  select count(*) as total,jsonb_agg(distinct pending.label order by pending.label) as labels
  from (
    select public.marketplace_sale_operation(s.status,s.shipment_status,s.snapshot,s.shipment_substatus) as label
    from public.marketplace_sales s
    where s.empresa_id=l.empresa_id and s.connection_id=l.connection_id
      and s.snapshot->'inventoryLines' @> jsonb_build_array(jsonb_build_object('listingId',l.provider_listing_id))
  ) pending where pending.label is not null
) o;
revoke all on public.marketplace_listing_operations from public,anon,authenticated;
grant select on public.marketplace_listing_operations to service_role;

create or replace view public.marketplace_pending_sales with (security_invoker=true) as
select s.empresa_id,s.connection_id,s.provider,s.provider_order_id,s.updated_at,coalesce(s.operation_checked_at,s.updated_at) as checked_at
from public.marketplace_sales s
where public.marketplace_sale_operation(s.status,s.shipment_status,s.snapshot,s.shipment_substatus) is not null;
revoke all on public.marketplace_pending_sales from public,anon,authenticated;
grant select on public.marketplace_pending_sales to service_role;


create or replace function public.marketplace_register_pending_sale(p_sale uuid) returns void
language plpgsql security definer set search_path=public as $$
declare sale marketplace_sales; item jsonb; listing text; qty integer; sold timestamptz; baseline timestamptz; connected timestamptz;
begin
  select s.* into sale from marketplace_sales s join marketplace_connections c on c.id=s.connection_id and c.empresa_id=s.empresa_id and c.provider=s.provider
    where s.id=p_sale and s.provider in ('mercado_livre','magalu') and s.status in ('paid','confirmed','partially_refunded')
    and coalesce(s.shipment_status,'') in ('','pending','handling','ready_to_ship','not_verified') and s.label_status<>'fulfilled'
    and not public.marketplace_shipment_has_left_seller(s.shipment_status,s.shipment_substatus)
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
      and not public.marketplace_shipment_has_left_seller(s.shipment_status,s.shipment_substatus)
      and (c.status='connected' or (c.provider='magalu' and c.status='attention' and c.last_error_code='magalu_connector_pending'))
      and not exists(select 1 from marketplace_sale_alert_reads r where r.alert_id=a.id and r.user_id=p_user and r.empresa_id=p_empresa)
      order by s.id,a.created_at,a.id) grouped order by created_at,id limit 20) v),'[]'::jsonb),
    'pendingStock',(select count(*) from marketplace_inventory_outbox where empresa_id=p_empresa and state in ('pending','protected')),
    'pendingSales',(select count(*) from marketplace_sale_notifications where empresa_id=p_empresa and processed_at is null),
    'issues',coalesce((select jsonb_agg(v) from (select issue,count(*) as total from (
      select issue from marketplace_inventory_events where empresa_id=p_empresa and issue is not null
      union all select issue from marketplace_inventory_outbox where empresa_id=p_empresa and state in ('pending','protected') and issue is not null
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
-- Uma consulta validada que alcança ou ultrapassa o saldo-alvo antecipa a próxima rodada.
-- Não confirma sincronização, não altera quantidade nem autoriza reposição.
create or replace function public.marketplace_observe_listing(p_empresa uuid,p_connection uuid,p_listing text,p_quantity integer,p_status text) returns void
language plpgsql security definer set search_path=public as $$
declare l marketplace_product_links;
begin
IF auth.uid() IS NOT NULL AND NOT public.usuario_area_rpc_restricao('marketplaces',jsonb_build_object('p_empresa',p_empresa,'p_connection',p_connection)) THEN RAISE EXCEPTION 'Esta área não foi liberada.' USING ERRCODE='42501'; END IF;
 select * into l from marketplace_product_links where empresa_id=p_empresa and connection_id=p_connection and provider_listing_id=p_listing for update;
 if not found then return;end if;
 if not exists(select 1 from marketplace_connections where id=p_connection and empresa_id=p_empresa and provider=l.provider) then raise exception 'Conta não pertence à empresa.';end if;
 update marketplace_product_links set reported_stock=p_quantity,status=p_status,updated_at=now() where id=l.id;
 update marketplace_inventory_outbox set next_attempt_at=least(next_attempt_at,now())
 where empresa_id=p_empresa and product_id=l.product_id and link_id=l.id and state='pending' and issue='lower_remote_stock'
   and (p_quantity>=desired_quantity or p_status in ('closed','deleted','excluded','unpublished','cancelled','canceled'));
end $$;
revoke all on function public.marketplace_observe_listing(uuid,uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.marketplace_observe_listing(uuid,uuid,text,integer,text) to service_role;

notify pgrst,'reload schema';
commit;
