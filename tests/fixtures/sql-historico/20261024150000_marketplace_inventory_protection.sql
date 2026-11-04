-- Proteção de estoque: pausa confirmada, reversão somente antes de despacho e trilha auditável.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';

alter table public.marketplace_inventory_outbox drop constraint if exists marketplace_inventory_outbox_state_check;
alter table public.marketplace_inventory_outbox add constraint marketplace_inventory_outbox_state_check check(state in ('pending','synced','excluded','protected'));
alter table public.marketplace_inventory_outbox add column if not exists protected_at timestamptz;

do $$ begin
  if to_regclass('public.marketplace_listing_stock_control') is not null then
    alter table public.marketplace_listing_stock_control add column if not exists pause_reason text;
    alter table public.marketplace_listing_stock_control drop constraint if exists marketplace_listing_stock_control_pause_reason_check;
    alter table public.marketplace_listing_stock_control add constraint marketplace_listing_stock_control_pause_reason_check check(pause_reason is null or pause_reason in ('zero_stock','zero_stock_protection'));
  end if;
end $$;

alter table public.marketplace_inventory_events drop constraint if exists marketplace_inventory_events_state_check;
alter table public.marketplace_inventory_events add constraint marketplace_inventory_events_state_check check(state in ('pending','applied','baseline','reversed','cancelled'));
alter table public.marketplace_inventory_events add column if not exists applied_quantity integer not null default 0 check(applied_quantity between 0 and 99999);
update public.marketplace_inventory_events set applied_quantity=greatest(0,quantity-shortfall) where state='applied' and applied_quantity=0;

alter table public.marketplace_stock_movements drop constraint if exists marketplace_stock_movements_kind_check;
alter table public.marketplace_stock_movements add constraint marketplace_stock_movements_kind_check check(kind in ('confirmation','adjustment','sale','sale_reversal'));

-- A devolução automática só é segura quando o Marketplace confirma que a venda
-- foi cancelada antes de a etiqueta ficar disponível ou o envio avançar. Depois
-- disso, a unidade só retorna por entrada física manual, pois pode haver avaria.
create or replace function public.marketplace_apply_inventory_event(p_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare e marketplace_inventory_events; p marketplace_products; l marketplace_product_links; s marketplace_inventory_settings;
 sale marketplace_sales; safe_cancel boolean; release_quantity integer;
begin
  select * into e from marketplace_inventory_events where id=p_id for update;
  if not found then return; end if;
  select * into s from marketplace_inventory_settings where empresa_id=e.empresa_id and enabled;
  if not found then return; end if;
  select * into sale from marketplace_sales where empresa_id=e.empresa_id and connection_id=e.connection_id and provider_order_id=e.order_id;
  safe_cancel:=coalesce(sale.status='cancelled' and sale.label_status='unavailable' and coalesce(sale.shipment_status,'') in ('','pending','not_verified','cancelled'),false);

  if e.state='applied' and sale.status='cancelled' then
    if safe_cancel and e.issue is distinct from 'cancelled_requires_manual_return' then
      select * into p from marketplace_products where empresa_id=e.empresa_id and id=e.product_id and archived_at is null for update;
      if not found or p.stock_quantity is null then
        update marketplace_inventory_events set issue='cancelled_stock_review',updated_at=now() where id=e.id; return;
      end if;
      release_quantity:=e.applied_quantity;
      if release_quantity>0 then
        update marketplace_products set stock_quantity=least(99999,p.stock_quantity+release_quantity),revision=revision+1,updated_at=now() where id=p.id;
        insert into marketplace_stock_movements(empresa_id,product_id,actor_id,kind,stock_before,stock_after,note,provider,provider_order_id)
        values(e.empresa_id,p.id,null,'sale_reversal',p.stock_quantity,least(99999,p.stock_quantity+release_quantity),'Cancelamento antes do despacho · '||release_quantity||' unidade(s) liberada(s) · '||e.listing_id,e.provider,e.order_id);
      end if;
      update marketplace_inventory_events set state='reversed',issue=null,updated_at=now() where id=e.id;
    else
      update marketplace_inventory_events set issue='cancelled_requires_manual_return',updated_at=now() where id=e.id;
    end if;
    return;
  end if;

  if e.state='reversed' and sale.status is distinct from 'cancelled' then
    update marketplace_inventory_events set state='pending',issue=null,updated_at=now() where id=e.id;
    select * into e from marketplace_inventory_events where id=e.id for update;
  end if;
  if e.state='cancelled' and sale.status is distinct from 'cancelled' then
    update marketplace_inventory_events set state='pending',issue=null,updated_at=now() where id=e.id;
    select * into e from marketplace_inventory_events where id=e.id for update;
  end if;
  if e.state<>'pending' then return; end if;
  if sale.status='cancelled' then
    update marketplace_inventory_events set state='cancelled',issue=null,updated_at=now() where id=e.id;
    return;
  end if;
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
  release_quantity:=least(e.quantity,p.stock_quantity);
  update marketplace_products set stock_quantity=p.stock_quantity-release_quantity,revision=revision+1,updated_at=now() where id=p.id;
  insert into marketplace_stock_movements(empresa_id,product_id,actor_id,kind,stock_before,stock_after,note,provider,provider_order_id)
  values(e.empresa_id,p.id,null,'sale',p.stock_quantity,p.stock_quantity-release_quantity,'Venda '||e.order_id||' · '||e.quantity||' unidade(s) · '||e.listing_id,e.provider,e.order_id);
  update marketplace_inventory_events set product_id=p.id,state='applied',applied_quantity=release_quantity,shortfall=e.quantity-release_quantity,
    issue=case when e.quantity>p.stock_quantity then 'insufficient_stock' end,updated_at=now() where id=e.id;
end $$;

-- Aviso protegido é pendência operacional visível, não uma sincronização verde.
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
revoke all on function public.marketplace_apply_inventory_event(uuid) from public,anon,authenticated;
grant execute on function public.marketplace_apply_inventory_event(uuid) to service_role;
revoke all on function public.marketplace_live_feed(uuid,uuid) from public,anon,authenticated;
grant execute on function public.marketplace_live_feed(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
