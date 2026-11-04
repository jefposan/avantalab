-- Aditiva: lotes recebidos não alteram estoque, histórico de preços ou anúncios.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
create table public.marketplace_price_lots (
  id uuid primary key,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  company_name text not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  supplier text not null default '' check (char_length(supplier) <= 180),
  received_on date not null default current_date,
  notes text not null default '' check (char_length(notes) <= 2000),
  purchase_cost_cents integer check (purchase_cost_cents between 0 and 2000000000),
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  revision bigint not null default 0,
  unique (id, empresa_id)
);
create table public.marketplace_price_lot_items (
  id uuid primary key,
  lot_id uuid not null,
  empresa_id uuid not null,
  scanned_code text not null check (char_length(trim(scanned_code)) between 1 and 180),
  quantity integer not null default 1 check (quantity between 1 and 100000),
  history_id uuid references public.marketplace_price_consultations(id) on delete set null,
  product_name text, product_description text, image_url text,
  reference_source text, researched_at timestamptz,
  market_price_cents integer, minimum_price_cents integer, medium_price_cents integer, ideal_price_cents integer,
  created_at timestamptz not null default now(),
  foreign key (lot_id,empresa_id) references public.marketplace_price_lots(id,empresa_id) on delete cascade,
  constraint lot_prices_complete check (
    (market_price_cents is null and minimum_price_cents is null and medium_price_cents is null and ideal_price_cents is null)
    or (market_price_cents is not null and market_price_cents > 0 and minimum_price_cents is not null and minimum_price_cents > 0
      and medium_price_cents is not null and medium_price_cents > 0 and ideal_price_cents is not null and ideal_price_cents > 0))
);
create index marketplace_price_lots_company_idx on public.marketplace_price_lots(empresa_id,created_at desc,id);
create index marketplace_price_lot_items_lot_idx on public.marketplace_price_lot_items(lot_id,empresa_id,created_at,id);
alter table public.marketplace_price_lots enable row level security;
alter table public.marketplace_price_lot_items enable row level security;
revoke all on public.marketplace_price_lots, public.marketplace_price_lot_items from public, anon, authenticated;
grant select,insert,update,delete on public.marketplace_price_lots,public.marketplace_price_lot_items to service_role;

-- Lock comum para fechamento/captura: um lote fechado nunca recebe leituras tardias.
-- O UUID da leitura é a chave idempotente; duas leituras físicas têm UUIDs diferentes.
create function public.marketplace_price_lot_mutate(p_empresa_id uuid,p_lot_id uuid,p_action text,p_data jsonb)
returns void language plpgsql set search_path = public as $$
declare l public.marketplace_price_lots; h public.marketplace_price_consultations;
begin
  select * into l from public.marketplace_price_lots where id=p_lot_id and empresa_id=p_empresa_id for update;
  if not found then raise exception 'Lote não encontrado.' using errcode='P0002'; end if;
  if p_action='metadata' then
    update public.marketplace_price_lots set name=p_data->>'name',supplier=p_data->>'supplier',
      received_on=(p_data->>'received_on')::date,notes=p_data->>'notes',
      purchase_cost_cents=(p_data->>'purchase_cost_cents')::integer,updated_at=now(),revision=revision+1 where id=l.id;
  elsif p_action='status' then
    update public.marketplace_price_lots set status=p_data->>'status',updated_at=now(),revision=revision+1 where id=l.id;
  else
    if l.status <> 'open' then raise exception 'Lote concluído. Reabra para alterar os produtos.'; end if;
    if p_action='capture' then
      insert into public.marketplace_price_lot_items(id,lot_id,empresa_id,scanned_code)
        values((p_data->>'item_id')::uuid,l.id,l.empresa_id,p_data->>'scanned_code') on conflict(id) do nothing;
      if not exists(select 1 from public.marketplace_price_lot_items where id=(p_data->>'item_id')::uuid and lot_id=l.id and empresa_id=l.empresa_id and scanned_code=p_data->>'scanned_code')
        then raise exception 'Identificador de leitura já utilizado.'; end if;
    elsif p_action='resolve' then
      select * into h from public.marketplace_price_consultations where id=(p_data->>'history_id')::uuid and empresa_id=l.empresa_id;
      if not found then raise exception 'Consulta não encontrada nesta empresa.' using errcode='P0002'; end if;
      if not exists(select 1 from public.marketplace_price_lot_items where id=(p_data->>'item_id')::uuid and lot_id=l.id and empresa_id=l.empresa_id)
        then raise exception 'Leitura não encontrada.' using errcode='P0002'; end if;
      update public.marketplace_price_lot_items set history_id=h.id,product_name=h.product_name,product_description=h.product_description,
        image_url=h.image_url,reference_source=h.sample_source,researched_at=h.last_researched_at,
        market_price_cents=h.market_price_cents,minimum_price_cents=h.minimum_price_cents,medium_price_cents=h.medium_price_cents,ideal_price_cents=h.ideal_price_cents
        where id=(p_data->>'item_id')::uuid and lot_id=l.id and empresa_id=l.empresa_id and market_price_cents is null;
    elsif p_action='quantity' then
      update public.marketplace_price_lot_items set quantity=(p_data->>'quantity')::integer
        where id=(p_data->>'item_id')::uuid and lot_id=l.id and empresa_id=l.empresa_id;
      if not found then raise exception 'Leitura não encontrada.' using errcode='P0002'; end if;
    elsif p_action='remove' then
      delete from public.marketplace_price_lot_items where id=(p_data->>'item_id')::uuid and lot_id=l.id and empresa_id=l.empresa_id;
    else raise exception 'Ação de lote inválida.'; end if;
    update public.marketplace_price_lots set updated_at=now(),revision=revision+1 where id=l.id;
  end if;
end $$;
revoke all on function public.marketplace_price_lot_mutate(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.marketplace_price_lot_mutate(uuid,uuid,text,jsonb) to service_role;
commit;
-- Recuperação: manter tabelas/dados e desativar a interface. Não remover lotes em rollback de aplicação.
