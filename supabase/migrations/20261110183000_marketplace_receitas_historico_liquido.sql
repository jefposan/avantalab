begin;

alter table public.marketplace_price_settings
  add column finance_revenue_basis text not null default 'gross'
  check (finance_revenue_basis in ('gross', 'net'));

create table public.marketplace_sale_financial (
  sale_id uuid primary key references public.marketplace_sales(id) on delete cascade,
  source_key jsonb not null,
  fees bigint,
  freight bigint,
  adjustments bigint not null,
  net bigint,
  issue text,
  next_attempt_at timestamptz
);
alter table public.marketplace_sale_financial enable row level security;
revoke all on public.marketplace_sale_financial from public, anon, authenticated, service_role;

create function public.marketplace_sale_financial_key(p_sale public.marketplace_sales) returns jsonb
language sql stable set search_path = pg_catalog, public as $$
  select jsonb_build_array(p_sale.connection_id, p_sale.provider, p_sale.provider_order_id, p_sale.status,
    coalesce(nullif(p_sale.snapshot->>'providerUpdatedAt', ''), to_char(p_sale.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US')),
    p_sale.snapshot->'total', p_sale.snapshot->>'currency',
    p_sale.snapshot->>'shipmentId', p_sale.snapshot->>'shipmentStatus', p_sale.snapshot->>'shipmentSubstatus')
$$;

create or replace function public.marketplace_marcar_receita(p_empresa uuid, p_periodo date)
returns void language sql security definer set search_path = pg_catalog, public as $$
  insert into public.marketplace_receitas_gestao(empresa_id, competencia)
  select p_empresa, p_periodo
  where p_periodo <= date_trunc('month', now() at time zone 'America/Sao_Paulo')::date
  on conflict (empresa_id, competencia) do update set next_attempt_at = now()
$$;

create function public.marketplace_enfileirar_historico_receitas(p_empresa uuid) returns void
language sql set search_path = pg_catalog, public as $$
  insert into public.marketplace_receitas_gestao(empresa_id, competencia)
  select p_empresa, competencia from (
    select public.marketplace_receita_periodo(snapshot->>'soldAt') competencia
    from public.marketplace_sales where empresa_id = p_empresa and status in ('paid','confirmed')
      and public.marketplace_receita_valor(provider, status, snapshot) > 0
    union
    select date_trunc('month', sold_on::timestamp)::date
    from public.marketplace_direct_sales where empresa_id = p_empresa and status = 'confirmed'
    union
    select competencia from public.marketplace_receitas_gestao where empresa_id = p_empresa
  ) meses
  where competencia <= date_trunc('month', now() at time zone 'America/Sao_Paulo')::date
  order by competencia
  on conflict (empresa_id, competencia) do update set next_attempt_at = now()
$$;

create or replace function public.marketplace_marcar_receita_config() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if tg_op = 'INSERT' or new.finance_revenue_enabled is distinct from old.finance_revenue_enabled
    or new.finance_revenue_basis is distinct from old.finance_revenue_basis then
    perform pg_advisory_xact_lock(hashtextextended('marketplace-receita:' || new.empresa_id, 0));
    if new.finance_revenue_enabled then
      perform public.marketplace_enfileirar_historico_receitas(new.empresa_id);
    end if;
  end if;
  return null;
end $$;
drop trigger marketplace_settings_marcar_receita on public.marketplace_price_settings;
create trigger marketplace_settings_marcar_receita
  after insert or update of finance_revenue_enabled, finance_revenue_basis on public.marketplace_price_settings
  for each row execute function public.marketplace_marcar_receita_config();

create function public.marketplace_read_sale_financial(p_empresa uuid, p_sales uuid[])
returns table (sale_id uuid, revision timestamptz, fees bigint, freight bigint,
  adjustments bigint, net bigint, issue text, next_attempt_at timestamptz)
language sql stable security definer set search_path = pg_catalog, public as $$
  select s.id, s.updated_at, f.fees, f.freight, f.adjustments, f.net, f.issue, f.next_attempt_at
  from public.marketplace_sales s join public.marketplace_sale_financial f on f.sale_id = s.id
  where s.empresa_id = p_empresa and s.id = any(p_sales)
    and f.source_key = public.marketplace_sale_financial_key(s)
$$;

create function public.marketplace_save_sale_financial(p_empresa uuid, p_sale uuid, p_revision timestamptz,
  p_fees bigint, p_freight bigint, p_adjustments bigint, p_net bigint, p_issue text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_sale public.marketplace_sales;
begin
  select * into v_sale from public.marketplace_sales
  where id = p_sale and empresa_id = p_empresa and updated_at = p_revision for share;
  if not found or public.marketplace_receita_valor(v_sale.provider, v_sale.status, v_sale.snapshot) <= 0 then
    return false;
  end if;
  insert into public.marketplace_sale_financial as saved
    (sale_id, source_key, fees, freight, adjustments, net, issue, next_attempt_at)
  values (p_sale, public.marketplace_sale_financial_key(v_sale), p_fees, p_freight, p_adjustments, p_net,
    left(p_issue, 240), case when p_net is null then now() + interval '1 hour' end)
  on conflict (sale_id) do update set source_key = excluded.source_key, fees = case when saved.source_key = excluded.source_key and excluded.net is null then coalesce(excluded.fees, saved.fees) else excluded.fees end,
    freight = case when saved.source_key = excluded.source_key and excluded.net is null then coalesce(excluded.freight, saved.freight) else excluded.freight end, adjustments = excluded.adjustments, net = excluded.net,
    issue = excluded.issue, next_attempt_at = excluded.next_attempt_at
  where saved.source_key is distinct from excluded.source_key or saved.net is null;
  if found and p_net is not null and exists (
    select 1 from public.marketplace_price_settings where empresa_id = p_empresa
      and finance_revenue_enabled and finance_revenue_basis = 'net'
  ) then
    perform public.marketplace_marcar_receita(p_empresa, public.marketplace_receita_periodo(v_sale.snapshot->>'soldAt'));
  end if;
  return true;
end $$;

-- Reclama trabalhos por tempo limitado para que crons sobrepostos não consultem o mesmo pedido.
create function public.marketplace_claim_sale_financial()
returns setof public.marketplace_sales
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_sale public.marketplace_sales;
begin
  for v_sale in select s.* from public.marketplace_sales s
    join public.marketplace_price_settings c on c.empresa_id = s.empresa_id
    left join public.marketplace_sale_financial f on f.sale_id = s.id
      and f.source_key = public.marketplace_sale_financial_key(s)
    where c.finance_revenue_enabled and c.finance_revenue_basis = 'net'
      and exists (select 1 from public.empresa_modulos m where m.empresa_id = s.empresa_id
        and m.modulo_id = 'marketplaces' and m.ativo and (m.expira_em is null or m.expira_em > now()))
      and s.status in ('paid','confirmed')
      and public.marketplace_receita_valor(s.provider, s.status, s.snapshot) > 0
      and public.marketplace_receita_periodo(s.snapshot->>'soldAt') <= date_trunc('month', now() at time zone 'America/Sao_Paulo')::date
      and f.net is null and (f.sale_id is null or f.next_attempt_at <= now())
    order by f.next_attempt_at nulls first, s.snapshot->>'soldAt', s.id
    limit 3 for update of s skip locked
  loop
    insert into public.marketplace_sale_financial as saved (sale_id, source_key, adjustments, issue, next_attempt_at)
    values (v_sale.id, public.marketplace_sale_financial_key(v_sale), 0,
      'Taxas e frete em consulta.', now() + interval '2 minutes')
    on conflict (sale_id) do update set
      fees = case when saved.source_key = excluded.source_key then saved.fees end,
      freight = case when saved.source_key = excluded.source_key then saved.freight end,
      adjustments = case when saved.source_key = excluded.source_key then saved.adjustments else 0 end,
      net = null, source_key = excluded.source_key, issue = excluded.issue,
      next_attempt_at = excluded.next_attempt_at
    where saved.source_key is distinct from excluded.source_key
      or (saved.net is null and saved.next_attempt_at <= now());
    if found then return next v_sale; end if;
  end loop;
end $$;

create or replace function public.marketplace_atualizar_receita_mes(p_empresa uuid, p_periodo date, p_entrada uuid)
returns uuid language plpgsql set search_path = pg_catalog, public as $$
declare
  v_proximo date := (p_periodo + interval '1 month')::date;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_total numeric;
  v_online numeric;
  v_direto numeric;
  v_online_count bigint;
  v_direct_count bigint;
  v_pending bigint;
  v_basis text;
  v_empty boolean;
  v_ano integer := extract(year from p_periodo);
  v_mes text := (array['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'])[extract(month from p_periodo)::int];
  v_dia integer := extract(day from least(v_hoje, v_proximo - 1));
  v_gatilho_anterior text := current_setting('app.marketplace_receita_sync', true);
begin
  if not exists (select 1 from public.empresa_modulos where empresa_id = p_empresa
    and modulo_id = 'marketplaces' and ativo and (expira_em is null or expira_em > now())) or
    exists (select 1 from public.marketplace_price_settings where empresa_id = p_empresa and not finance_revenue_enabled) then
    return p_entrada;
  end if;

  select coalesce((select finance_revenue_basis from public.marketplace_price_settings where empresa_id = p_empresa), 'gross')
    into v_basis;

  select coalesce(sum(case when v_basis = 'net' then f.net / 100.0 else venda.bruto end), 0),
    count(*), count(*) filter (where f.net is null)
  into v_online, v_online_count, v_pending
  from public.marketplace_sales s
  cross join lateral (select public.marketplace_receita_valor(s.provider, s.status, s.snapshot) bruto) venda
  left join public.marketplace_sale_financial f on v_basis = 'net' and f.sale_id = s.id
    and f.source_key = public.marketplace_sale_financial_key(s)
  where s.empresa_id = p_empresa and s.status in ('paid','confirmed') and venda.bruto > 0
    and s.snapshot->>'soldAt' >= to_char(p_periodo - 1, 'YYYY-MM-DD')
    and s.snapshot->>'soldAt' < to_char(v_proximo + 1, 'YYYY-MM-DD')
    and public.marketplace_receita_periodo(s.snapshot->>'soldAt') = p_periodo;

  -- O custo confirmado de cada pedido volta a enfileirar a competência.
  if v_basis = 'net' and v_pending > 0 then return p_entrada; end if;

  select coalesce(sum(total_cents / 100.0), 0), count(*) into v_direto, v_direct_count
  from public.marketplace_direct_sales where empresa_id = p_empresa and status = 'confirmed'
    and sold_on >= p_periodo and sold_on < v_proximo and total_cents > 0;
  v_total := v_online + v_direto;
  v_empty := v_online_count + v_direct_count = 0;

  if (p_entrada is null and v_empty) or (not v_empty and exists (
    select 1 from public.faturamentos_entradas where id = p_entrada and empresa_id = p_empresa and valor = v_total
  )) then return p_entrada; end if;

  -- Mesmo total mensal utilizado pela Gestão, com a entrada de cada origem preservada.
  insert into public.faturamentos(empresa_id, ano, mes, valor)
    values (p_empresa, v_ano, v_mes, 0) on conflict (empresa_id, ano, mes) do nothing;
  perform 1 from public.faturamentos where empresa_id = p_empresa and ano = v_ano and mes = v_mes for update;
  perform set_config('app.marketplace_receita_sync', '1', true);
  if v_empty then
    delete from public.faturamentos_entradas where id = p_entrada and empresa_id = p_empresa;
    p_entrada := null;
  elsif p_entrada is null then
    insert into public.faturamentos_entradas(empresa_id, ano, mes, dia, origem, valor, tipo_obs, origem_etiqueta)
    values (p_empresa, v_ano, v_mes, v_dia, 'Vendas Mkt Places', v_total, 'marketplace_sistema', 'Vendas Mkt Places')
    returning id into p_entrada;
  else
    update public.faturamentos_entradas set valor = v_total, dia = v_dia, updated_at = now()
    where id = p_entrada and empresa_id = p_empresa;
  end if;
  perform set_config('app.marketplace_receita_sync', coalesce(v_gatilho_anterior, ''), true);

  update public.faturamentos set valor = (
    select coalesce(sum(valor), 0) from public.faturamentos_entradas
    where empresa_id = p_empresa and ano = v_ano and mes = v_mes and coalesce(status, '') <> 'prevista'
  ), referencia_total_mensal = false
  where empresa_id = p_empresa and ano = v_ano and mes = v_mes;
  return p_entrada;
end $$;

revoke execute on function public.marketplace_sale_financial_key(public.marketplace_sales),
  public.marketplace_enfileirar_historico_receitas(uuid), public.marketplace_read_sale_financial(uuid,uuid[]),
  public.marketplace_save_sale_financial(uuid,uuid,timestamptz,bigint,bigint,bigint,bigint,text),
  public.marketplace_claim_sale_financial()
  from public, anon, authenticated;
grant execute on function public.marketplace_read_sale_financial(uuid,uuid[]),
  public.marketplace_save_sale_financial(uuid,uuid,timestamptz,bigint,bigint,bigint,bigint,text),
  public.marketplace_claim_sale_financial() to service_role;

do $$
declare v_empresa uuid;
begin
  for v_empresa in select distinct m.empresa_id from public.empresa_modulos m
    left join public.marketplace_price_settings c on c.empresa_id = m.empresa_id
    where m.modulo_id = 'marketplaces' and m.ativo and (m.expira_em is null or m.expira_em > now())
      and coalesce(c.finance_revenue_enabled, true)
  loop
    perform public.marketplace_enfileirar_historico_receitas(v_empresa);
  end loop;
end $$;
commit;
