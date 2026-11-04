-- Histórico fiscal independente da sincronização de pedidos. Nenhuma emissão é executada.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
create table public.marketplace_fiscal_operations (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  connection_id uuid not null references public.marketplace_connections(id),
  sale_id uuid not null references public.marketplace_sales(id),
  order_id text not null check(order_id ~ '^[0-9]{1,24}$'),
  shipment_id text not null check(shipment_id ~ '^[0-9]{1,24}$'),
  document_type text not null check(document_type in ('dce','nfe')),
  action text not null check(action in ('issue','import','replace','legacy')),
  state text not null check(state in ('sending','requested','uncertain','completed','rejected')),
  receipt_id text,
  error_code text,
  http_status integer,
  correlation text,
  content_hash text,
  expected_key_hash text,
  actor_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- DC-e/NF-e e todos os pedidos de um mesmo envio compartilham a reserva.
create unique index marketplace_fiscal_operations_inflight on public.marketplace_fiscal_operations(connection_id,shipment_id) where state in ('sending','requested','uncertain');
create index marketplace_fiscal_operations_sale on public.marketplace_fiscal_operations(empresa_id,connection_id,sale_id,created_at desc);
create table public.marketplace_fiscal_status (
  sale_id uuid primary key references public.marketplace_sales(id),
  empresa_id uuid not null references public.empresas(id),
  connection_id uuid not null references public.marketplace_connections(id),
  dce jsonb not null default '{"status":"unknown","documents":[]}',
  nfe jsonb not null default '{"status":"unknown","documents":[]}',
  profile jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
create function public.marketplace_fiscal_guard() returns trigger language plpgsql set search_path=public as $$
begin
  if not exists(select 1 from marketplace_sales s join marketplace_connections c on c.id=s.connection_id
    where s.id=new.sale_id and s.empresa_id=new.empresa_id and s.connection_id=new.connection_id and s.provider='mercado_livre' and c.empresa_id=s.empresa_id and c.provider='mercado_livre'
      and (tg_table_name<>'marketplace_fiscal_operations' or tg_op='UPDATE' or (s.provider_order_id=to_jsonb(new)->>'order_id' and s.shipment_id=to_jsonb(new)->>'shipment_id'))) then
    raise exception 'Vínculo fiscal inválido' using errcode='23514';
  end if;
  if tg_op='UPDATE' and (new.sale_id<>old.sale_id or new.connection_id<>old.connection_id or new.empresa_id<>old.empresa_id) then
    raise exception 'Identidade fiscal imutável' using errcode='23514';
  end if;
  if tg_op='UPDATE' and tg_table_name='marketplace_fiscal_operations' and
    (to_jsonb(new)->>'order_id'<>to_jsonb(old)->>'order_id' or to_jsonb(new)->>'shipment_id'<>to_jsonb(old)->>'shipment_id' or to_jsonb(new)->>'document_type'<>to_jsonb(old)->>'document_type' or to_jsonb(new)->>'action'<>to_jsonb(old)->>'action') then
    raise exception 'Operação fiscal imutável' using errcode='23514';
  end if;
  return new;
end $$;
create trigger marketplace_fiscal_operations_guard before insert or update on public.marketplace_fiscal_operations for each row execute function public.marketplace_fiscal_guard();
create trigger marketplace_fiscal_status_guard before insert or update on public.marketplace_fiscal_status for each row execute function public.marketplace_fiscal_guard();
alter table public.marketplace_fiscal_operations enable row level security;
alter table public.marketplace_fiscal_status enable row level security;
revoke all on public.marketplace_fiscal_operations,public.marketplace_fiscal_status from public,anon,authenticated;
grant select,insert,update on public.marketplace_fiscal_operations,public.marketplace_fiscal_status to service_role;
revoke all on function public.marketplace_fiscal_guard() from public,anon,authenticated;
-- Preservar somente evidências reais legadas, sem converter 404 em ausência/aceite.
insert into public.marketplace_fiscal_operations(empresa_id,connection_id,sale_id,order_id,shipment_id,document_type,action,state,receipt_id,created_at)
select empresa_id,connection_id,id,provider_order_id,shipment_id,'dce','legacy',
  case when snapshot->'dceEmission'->>'status'='completed' then 'completed' when coalesce(snapshot->'dceEmission'->>'emissionId','')<>'' then 'requested' else 'uncertain' end,
  snapshot->'dceEmission'->>'emissionId',coalesce(nullif(snapshot->'dceEmission'->>'requestedAt','')::timestamptz,updated_at)
from public.marketplace_sales where provider='mercado_livre' and shipment_id ~ '^[0-9]{1,24}$'
  and (coalesce(snapshot->'dceEmission'->>'requestedAt','')<>'' or coalesce(snapshot->'dceEmission'->>'emissionId','')<>'')
order by updated_at desc on conflict do nothing;
insert into public.marketplace_fiscal_status(sale_id,empresa_id,connection_id,dce)
select id,empresa_id,connection_id,jsonb_build_object('status',case when snapshot->'dceEmission'->>'status'='completed' then 'completed' when coalesce(snapshot->'dceEmission'->>'emissionId','')<>'' then 'requested' else 'uncertain' end,
  'documents','[]'::jsonb,'requestedAt',snapshot->'dceEmission'->>'requestedAt','receiptId',snapshot->'dceEmission'->>'emissionId')
from public.marketplace_sales where provider='mercado_livre' and (coalesce(snapshot->'dceEmission'->>'requestedAt','')<>'' or coalesce(snapshot->'dceEmission'->>'emissionId','')<>'');
-- Proteção inclusive durante a transição: um sincronizador antigo não apaga o legado.
create function public.marketplace_preserve_fiscal_receipt() returns trigger language plpgsql set search_path=public as $$
begin
  if old.snapshot->'dceEmission'->>'requestedAt' is not null or old.snapshot->'dceEmission'->>'emissionId' is not null then
    new.snapshot=jsonb_set(new.snapshot,'{dceEmission}',coalesce(nullif(new.snapshot->'dceEmission','null'::jsonb),'{}'::jsonb)||
      jsonb_strip_nulls(jsonb_build_object('requestedAt',coalesce(old.snapshot->'dceEmission'->>'requestedAt',new.snapshot->'dceEmission'->>'requestedAt'),
        'emissionId',coalesce(old.snapshot->'dceEmission'->>'emissionId',new.snapshot->'dceEmission'->>'emissionId'))),true);
  end if;
  return new;
end $$;
create trigger marketplace_preserve_fiscal_receipt before update of snapshot on public.marketplace_sales for each row execute function public.marketplace_preserve_fiscal_receipt();
revoke all on function public.marketplace_preserve_fiscal_receipt() from public,anon,authenticated;
create function public.marketplace_archive_legacy_dce() returns trigger language plpgsql set search_path=public as $$
declare f jsonb=new.snapshot->'dceEmission'; op_state text;
begin
  if new.provider='mercado_livre' and new.shipment_id ~ '^[0-9]{1,24}$' and
    (coalesce(f->>'requestedAt','')<>'' or coalesce(f->>'emissionId','')<>'') then
    op_state=case when f->>'status'='completed' then 'completed' when coalesce(f->>'emissionId','')<>'' then 'requested' else 'uncertain' end;
    if not exists(select 1 from marketplace_fiscal_operations where sale_id=new.id and document_type='dce') then
      insert into marketplace_fiscal_operations(empresa_id,connection_id,sale_id,order_id,shipment_id,document_type,action,state,receipt_id)
      values(new.empresa_id,new.connection_id,new.id,new.provider_order_id,new.shipment_id,'dce','legacy',op_state,f->>'emissionId') on conflict do nothing;
    end if;
    insert into marketplace_fiscal_status(sale_id,empresa_id,connection_id,dce)
    values(new.id,new.empresa_id,new.connection_id,jsonb_build_object('status',op_state,'documents','[]'::jsonb,'requestedAt',f->>'requestedAt','receiptId',f->>'emissionId')) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger marketplace_archive_legacy_dce after insert or update of snapshot on public.marketplace_sales for each row execute function public.marketplace_archive_legacy_dce();
revoke all on function public.marketplace_archive_legacy_dce() from public,anon,authenticated;
alter table public.marketplace_sale_notifications drop constraint marketplace_sale_notifications_topic_check;
alter table public.marketplace_sale_notifications add constraint marketplace_sale_notifications_topic_check check(topic in ('orders_v2','orders','shipments','items','invoices'));
commit;
