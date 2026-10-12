-- Cursor de leitura do histórico separado do cursor das novas movimentações.
-- Não altera tokens, pedidos, saldos, alertas nem a ativação da automação.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter table public.marketplace_inventory_reconciliation
  add column if not exists history_started_at timestamptz,
  add column if not exists history_window_end timestamptz,
  add column if not exists history_scan_offset integer not null default 0 check (history_scan_offset >= 0),
  add column if not exists history_checked_at timestamptz,
  add column if not exists history_completed_at timestamptz;
alter table public.marketplace_sales add column if not exists operation_checked_at timestamptz;
-- A importação não pode deixar uma venda nova esperando atrás do histórico.
alter table public.marketplace_sale_notifications add column if not exists priority smallint not null default 0 check (priority in (0,1));
create index if not exists marketplace_sale_notifications_priority_idx on public.marketplace_sale_notifications(priority,created_at) where processed_at is null;
-- Mantém RLS e acesso exclusivo do servidor já definidos para esta tabela.

-- Classificação operacional local. Os estados originais do ML não são alterados.
create or replace function public.marketplace_sale_operation(p_status text,p_shipment text,p_snapshot jsonb)
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
    when p_shipment='shipped' then 'Em trânsito'
    when p_shipment='not_delivered' then 'Não entregue / devolução em andamento'
    when p_shipment in ('pending','handling','ready_to_ship','not_verified') then 'Aguardando envio'
    when p_status in ('paid','confirmed') then 'Venda confirmada'
    else 'Pedido em atualização'
  end;
$$;
revoke all on function public.marketplace_sale_operation(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.marketplace_sale_operation(text,text,jsonb) to service_role;

create index if not exists marketplace_sales_listing_lines_idx on public.marketplace_sales using gin ((snapshot->'inventoryLines'));

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
    select public.marketplace_sale_operation(s.status,s.shipment_status,s.snapshot) as label
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
where public.marketplace_sale_operation(s.status,s.shipment_status,s.snapshot) is not null;
revoke all on public.marketplace_pending_sales from public,anon,authenticated;
grant select on public.marketplace_pending_sales to service_role;
commit;
