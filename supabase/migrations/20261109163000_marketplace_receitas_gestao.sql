-- Projeção mensal do faturamento bruto de Marketplaces, em uma receita da Gestão.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.marketplace_price_settings
  add column finance_revenue_enabled boolean not null default true;

create table public.marketplace_receitas_gestao (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  competencia date not null check (extract(day from competencia) = 1),
  faturamento_entrada_id uuid unique references public.faturamentos_entradas(id) on delete set null,
  next_attempt_at timestamptz default now(),
  primary key (empresa_id, competencia)
);
alter table public.marketplace_receitas_gestao enable row level security;
revoke all on public.marketplace_receitas_gestao from public, anon, authenticated;
create index marketplace_receitas_gestao_pending on public.marketplace_receitas_gestao(next_attempt_at)
  where next_attempt_at is not null;
create index marketplace_sales_receita_periodo on public.marketplace_sales(empresa_id, (snapshot->>'soldAt'))
  where status in ('paid','confirmed');

create function public.marketplace_receita_periodo(p_sold_at text) returns date
language plpgsql stable set search_path = pg_catalog, public as $$
begin
  if p_sold_at ~ '^\d{4}-\d{2}-\d{2}$' then
    return date_trunc('month', p_sold_at::date::timestamp)::date;
  end if;
  if p_sold_at ~ '^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:?\d{2})$' then
    return date_trunc('month', p_sold_at::timestamptz at time zone 'America/Sao_Paulo')::date;
  end if;
  return null;
exception when invalid_datetime_format or datetime_field_overflow or invalid_time_zone_displacement_value then
  return null;
end $$;

create function public.marketplace_receita_valor(p_provider text, p_status text, p_snapshot jsonb)
returns numeric language sql immutable set search_path = pg_catalog, public as $$
  select case when p_snapshot->>'currency' = 'BRL'
    and ((p_provider = 'mercado_livre' and p_status = 'paid') or
         (p_provider = 'magalu' and p_status in ('paid','confirmed')))
    and p_snapshot->>'total' ~ '^[0-9]{1,12}(\.[0-9]{1,10})?$'
    then round((p_snapshot->>'total')::numeric, 2) else 0 end
$$;

create function public.marketplace_marcar_receita(p_empresa uuid, p_periodo date)
returns void language sql security definer set search_path = pg_catalog, public as $$
  insert into public.marketplace_receitas_gestao(empresa_id, competencia)
  select p_empresa, p_periodo
  where p_periodo <= date_trunc('month', now() at time zone 'America/Sao_Paulo')::date
    and (p_periodo = date_trunc('month', now() at time zone 'America/Sao_Paulo')::date or exists (
      select 1 from public.marketplace_receitas_gestao
      where empresa_id = p_empresa and competencia <= p_periodo
    ))
  on conflict (empresa_id, competencia) do update set next_attempt_at = now()
$$;

create function public.marketplace_marcar_receita_venda() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_old date; v_new date; v_old_value numeric := 0; v_new_value numeric := 0; v_periodo date;
begin
  if tg_table_name = 'marketplace_sales' then
    if tg_op <> 'INSERT' then
      v_old := public.marketplace_receita_periodo(old.snapshot->>'soldAt');
      v_old_value := public.marketplace_receita_valor(old.provider, old.status, old.snapshot);
    end if;
    if tg_op <> 'DELETE' then
      v_new := public.marketplace_receita_periodo(new.snapshot->>'soldAt');
      v_new_value := public.marketplace_receita_valor(new.provider, new.status, new.snapshot);
    end if;
  else
    if tg_op <> 'INSERT' then
      v_old := date_trunc('month', old.sold_on::timestamp)::date;
      if old.status = 'confirmed' then v_old_value := old.total_cents / 100.0; end if;
    end if;
    if tg_op <> 'DELETE' then
      v_new := date_trunc('month', new.sold_on::timestamp)::date;
      if new.status = 'confirmed' then v_new_value := new.total_cents / 100.0; end if;
    end if;
  end if;
  if v_old_value = 0 then v_old := null; end if;
  if v_new_value = 0 then v_new := null; end if;
  if v_old is not distinct from v_new and v_old_value = v_new_value then return null; end if;
  -- Ordem estável de bloqueio quando uma correção muda a competência.
  for v_periodo in select distinct periodo from unnest(array[v_old,v_new]) as p(periodo)
    where periodo is not null order by periodo
  loop
    perform public.marketplace_marcar_receita(coalesce(new.empresa_id, old.empresa_id), v_periodo);
  end loop;
  return null;
end $$;

create trigger marketplace_sales_marcar_receita
  after insert or update of snapshot, status or delete on public.marketplace_sales
  for each row execute function public.marketplace_marcar_receita_venda();
create trigger marketplace_direct_sales_marcar_receita
  after insert or update of sold_on, status, quantity, unit_price_cents or delete on public.marketplace_direct_sales
  for each row execute function public.marketplace_marcar_receita_venda();

create function public.marketplace_marcar_receita_config() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  -- Serializa o desligamento com um trabalho que esteja concluindo o mês.
  if tg_op = 'INSERT' or new.finance_revenue_enabled is distinct from old.finance_revenue_enabled then
    perform pg_advisory_xact_lock(hashtextextended('marketplace-receita:' || new.empresa_id, 0));
    if new.finance_revenue_enabled then
      perform public.marketplace_marcar_receita(new.empresa_id, date_trunc('month', now() at time zone 'America/Sao_Paulo')::date);
    end if;
  end if;
  return null;
end $$;
create trigger marketplace_settings_marcar_receita
  after insert or update of finance_revenue_enabled on public.marketplace_price_settings
  for each row execute function public.marketplace_marcar_receita_config();

create function public.proteger_receita_marketplaces() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  if current_setting('app.marketplace_receita_sync', true) is distinct from '1' and
    ((tg_op <> 'INSERT' and old.tipo_obs = 'marketplace_sistema') or
     (tg_op <> 'DELETE' and new.tipo_obs = 'marketplace_sistema')) then
    raise exception 'A receita de Marketplaces é controlada pelo módulo de origem.' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger faturamentos_entradas_proteger_marketplaces
  before insert or update or delete on public.faturamentos_entradas
  for each row execute function public.proteger_receita_marketplaces();

create function public.marketplace_atualizar_receita_mes(p_empresa uuid, p_periodo date, p_entrada uuid)
returns uuid language plpgsql set search_path = pg_catalog, public as $$
declare
  v_proximo date := (p_periodo + interval '1 month')::date;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_total numeric;
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

  select coalesce(sum(valor), 0) into v_total from (
    select public.marketplace_receita_valor(provider, status, snapshot) valor
    from public.marketplace_sales
    where empresa_id = p_empresa and status in ('paid','confirmed')
      and snapshot->>'soldAt' >= to_char(p_periodo - 1, 'YYYY-MM-DD')
      and snapshot->>'soldAt' < to_char(v_proximo + 1, 'YYYY-MM-DD')
      and public.marketplace_receita_periodo(snapshot->>'soldAt') = p_periodo
    union all
    select total_cents / 100.0 from public.marketplace_direct_sales
    where empresa_id = p_empresa and status = 'confirmed' and sold_on >= p_periodo and sold_on < v_proximo
  ) as vendas;

  if (p_entrada is null and v_total = 0) or exists (
    select 1 from public.faturamentos_entradas where id = p_entrada and empresa_id = p_empresa and valor = v_total
  ) then return p_entrada; end if;

  -- Mesmo total mensal utilizado pela Gestão, com a entrada de cada origem preservada.
  insert into public.faturamentos(empresa_id, ano, mes, valor)
    values (p_empresa, v_ano, v_mes, 0) on conflict (empresa_id, ano, mes) do nothing;
  perform 1 from public.faturamentos where empresa_id = p_empresa and ano = v_ano and mes = v_mes for update;
  perform set_config('app.marketplace_receita_sync', '1', true);
  if v_total = 0 then
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

create function public.marketplace_processar_receitas() returns integer
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_item public.marketplace_receitas_gestao;
  v_entrada uuid;
  v_total integer := 0;
begin
  for v_item in select * from public.marketplace_receitas_gestao
    where next_attempt_at <= now() order by next_attempt_at, empresa_id, competencia
    limit 8 for update skip locked
  loop
    if not pg_try_advisory_xact_lock(hashtextextended('marketplace-receita:' || v_item.empresa_id, 0)) then continue; end if;
    begin
      v_entrada := public.marketplace_atualizar_receita_mes(v_item.empresa_id, v_item.competencia, v_item.faturamento_entrada_id);
      update public.marketplace_receitas_gestao set faturamento_entrada_id = v_entrada, next_attempt_at = null
      where empresa_id = v_item.empresa_id and competencia = v_item.competencia;
      v_total := v_total + 1;
    exception when others then
      update public.marketplace_receitas_gestao set next_attempt_at = now() + interval '5 minutes'
      where empresa_id = v_item.empresa_id and competencia = v_item.competencia;
      raise warning 'marketplace_receita_retry: %', sqlstate;
    end;
  end loop;
  return v_total;
end $$;

revoke execute on function public.marketplace_receita_periodo(text), public.marketplace_receita_valor(text,text,jsonb),
  public.marketplace_marcar_receita(uuid,date), public.marketplace_marcar_receita_venda(),
  public.marketplace_marcar_receita_config(), public.proteger_receita_marketplaces(),
  public.marketplace_atualizar_receita_mes(uuid,date,uuid), public.marketplace_processar_receitas()
  from public, anon, authenticated;
grant execute on function public.marketplace_processar_receitas() to service_role;

create or replace function public.restaurar_ponto_restauracao(p_ponto_id uuid, p_criado_por uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_ponto public.pontos_restauracao; v_seguro uuid; v_dados jsonb;
begin
  select * into v_ponto from public.pontos_restauracao where id=p_ponto_id for update;
  if not found then raise exception 'Ponto de restauração não encontrado.'; end if;
  -- A projeção de Marketplaces vem das vendas atuais, fora do ponto financeiro.
  perform pg_advisory_xact_lock(hashtextextended('marketplace-receita:' || v_ponto.empresa_id, 0));
  v_seguro:=public.criar_ponto_restauracao(v_ponto.empresa_id,'pre_restauracao',p_criado_por,'Segurança antes da restauração');
  v_dados:=v_ponto.snapshot->'dados';
  delete from public.recorrencias where empresa_id=v_ponto.empresa_id;
  delete from public.agenda_itens where empresa_id=v_ponto.empresa_id;
  delete from public.lancamentos where empresa_id=v_ponto.empresa_id;
  delete from public.faturamentos_entradas where empresa_id=v_ponto.empresa_id and tipo_obs is distinct from 'marketplace_sistema';
  delete from public.faturamentos where empresa_id=v_ponto.empresa_id;
  delete from public.despesas_cadastradas where empresa_id=v_ponto.empresa_id;
  delete from public.configuracoes where empresa_id=v_ponto.empresa_id;
  insert into public.configuracoes select * from jsonb_populate_recordset(null::public.configuracoes,v_dados->'configuracoes');
  insert into public.despesas_cadastradas select * from jsonb_populate_recordset(null::public.despesas_cadastradas,v_dados->'despesas_cadastradas');
  insert into public.lancamentos select * from jsonb_populate_recordset(null::public.lancamentos,v_dados->'lancamentos');
  insert into public.faturamentos select * from jsonb_populate_recordset(null::public.faturamentos,v_dados->'faturamentos');
  insert into public.faturamentos_entradas
  select * from jsonb_populate_recordset(null::public.faturamentos_entradas,v_dados->'faturamentos_entradas')
  where tipo_obs is distinct from 'marketplace_sistema';
  -- Recompõe competências presentes no ponto ou no lançamento automático vigente.
  insert into public.faturamentos(empresa_id, ano, mes, valor, referencia_total_mensal)
  select v_ponto.empresa_id, periodo.ano, periodo.mes, coalesce(sum(e.valor), 0), false
  from (
    select ano, mes from public.faturamentos_entradas
    where empresa_id = v_ponto.empresa_id and tipo_obs = 'marketplace_sistema'
    union
    select ano, mes from jsonb_populate_recordset(null::public.faturamentos_entradas, v_dados->'faturamentos_entradas')
    where tipo_obs = 'marketplace_sistema'
  ) periodo
  left join public.faturamentos_entradas e on e.empresa_id = v_ponto.empresa_id
    and e.ano = periodo.ano and e.mes = periodo.mes and coalesce(e.status, '') <> 'prevista'
  group by periodo.ano, periodo.mes
  on conflict (empresa_id, ano, mes) do update set valor = excluded.valor, referencia_total_mensal = false;
  insert into public.recorrencias select * from jsonb_populate_recordset(null::public.recorrencias,v_dados->'recorrencias');
  insert into public.agenda_itens select * from jsonb_populate_recordset(null::public.agenda_itens,v_dados->'agenda_itens');
  return v_seguro;
end $$;

-- Fila inicial da competência atual, sem lançar ou recalcular meses anteriores.
insert into public.marketplace_receitas_gestao(empresa_id, competencia)
select distinct empresa_id, date_trunc('month', now() at time zone 'America/Sao_Paulo')::date
from public.empresa_modulos where modulo_id = 'marketplaces' and ativo and (expira_em is null or expira_em > now());
commit;
