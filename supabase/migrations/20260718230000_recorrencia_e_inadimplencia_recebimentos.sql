-- Regras de recorrência e geração automática de cobranças previstas.
-- A data de início é o cadastro da subempresa: nunca são criadas cobranças
-- anteriores a ela. A partir da primeira data configurada, os intervalos são
-- mantidos rigorosamente (15 dias, 3 meses ou 6 meses, conforme o caso).

alter table public.recebimentos_subempresas
  add column if not exists recorrencia_inicio date,
  add column if not exists dias_semana smallint[] not null default '{}',
  add column if not exists dia_mes smallint,
  add column if not exists mes_inicio smallint;

update public.recebimentos_subempresas
set recorrencia_inicio = criado_em::date
where recorrencia_inicio is null;

update public.recebimentos_subempresas
set dia_mes = dia_vencimento
where dia_mes is null and frequencia_recebimento = 'mensal';

alter table public.recebimentos_subempresas
  alter column recorrencia_inicio set default current_date,
  alter column recorrencia_inicio set not null;

alter table public.recebimentos_subempresas
  drop constraint if exists recebimentos_subempresas_dias_semana_check,
  drop constraint if exists recebimentos_subempresas_dia_mes_check,
  drop constraint if exists recebimentos_subempresas_mes_inicio_check;

alter table public.recebimentos_subempresas
  add constraint recebimentos_subempresas_dias_semana_check
    check (coalesce(array_length(dias_semana, 1), 0) <= 7 and dias_semana <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  add constraint recebimentos_subempresas_dia_mes_check
    check (dia_mes is null or dia_mes between 1 and 31),
  add constraint recebimentos_subempresas_mes_inicio_check
    check (mes_inicio is null or mes_inicio between 1 and 12);

alter table public.recebimentos_lancamentos
  add column if not exists recorrencia_gerada boolean not null default false;

create unique index if not exists recebimentos_lancamentos_recorrencia_unica_idx
  on public.recebimentos_lancamentos (subempresa_id, vencimento)
  where recorrencia_gerada;

create or replace function public.recebimentos_sincronizar_recorrencias(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not (public.recebimentos_pode_gerir(p_empresa_id) or public.recebimentos_e_colaborador(p_empresa_id)) then
    raise exception 'Acesso negado.';
  end if;

  -- A virada de dia já coloca toda cobrança prevista e não recebida em atraso.
  update public.recebimentos_lancamentos
  set situacao = 'em_atraso', atualizado_em = now()
  where empresa_id = p_empresa_id
    and situacao = 'previsto'
    and valor_recebido is null
    and vencimento < v_hoje;

  with configuradas as (
    select
      s.id as subempresa_id,
      s.empresa_id,
      s.recebimento_empresa_id,
      s.valor_combinado,
      s.frequencia_recebimento,
      s.recorrencia_inicio,
      s.dias_semana,
      s.dia_mes,
      s.mes_inicio,
      case
        when s.dia_mes is null then null
        when make_date(extract(year from s.recorrencia_inicio)::int, extract(month from s.recorrencia_inicio)::int, least(s.dia_mes, extract(day from (date_trunc('month', s.recorrencia_inicio) + interval '1 month - 1 day'))::int)) >= s.recorrencia_inicio
          then make_date(extract(year from s.recorrencia_inicio)::int, extract(month from s.recorrencia_inicio)::int, least(s.dia_mes, extract(day from (date_trunc('month', s.recorrencia_inicio) + interval '1 month - 1 day'))::int))
        else make_date(extract(year from (s.recorrencia_inicio + interval '1 month'))::int, extract(month from (s.recorrencia_inicio + interval '1 month'))::int, least(s.dia_mes, extract(day from (date_trunc('month', s.recorrencia_inicio + interval '1 month') + interval '1 month - 1 day'))::int))
      end as ancora_quinzenal
    from public.recebimentos_subempresas s
    where s.empresa_id = p_empresa_id
      and s.ativo
  ), datas as (
    select c.*, d::date as vencimento
    from configuradas c
    cross join lateral generate_series(c.recorrencia_inicio, v_hoje + 365, interval '1 day') d
    where (
      c.frequencia_recebimento = 'semanal'
      and extract(dow from d)::smallint = any(c.dias_semana)
    ) or (
      c.frequencia_recebimento = 'quinzenal'
      and c.ancora_quinzenal is not null
      and d::date >= c.ancora_quinzenal
      and ((d::date - c.ancora_quinzenal) % 15) = 0
    ) or (
      c.frequencia_recebimento = 'mensal'
      and c.dia_mes is not null
      and extract(day from d)::int = least(c.dia_mes, extract(day from (date_trunc('month', d) + interval '1 month - 1 day'))::int)
    ) or (
      c.frequencia_recebimento in ('trimestral', 'semestral')
      and c.dia_mes is not null and c.mes_inicio is not null
      and extract(day from d)::int = least(c.dia_mes, extract(day from (date_trunc('month', d) + interval '1 month - 1 day'))::int)
      and ((extract(month from d)::int - c.mes_inicio + 12) % case when c.frequencia_recebimento = 'trimestral' then 3 else 6 end) = 0
    ) or (
      c.frequencia_recebimento = 'anual'
      and c.dia_mes is not null and c.mes_inicio is not null
      and extract(month from d)::int = c.mes_inicio
      and extract(day from d)::int = least(c.dia_mes, extract(day from (date_trunc('month', d) + interval '1 month - 1 day'))::int)
    )
  )
  insert into public.recebimentos_lancamentos (
    empresa_id, recebimento_empresa_id, subempresa_id, vencimento, valor_combinado, situacao, recorrencia_gerada
  )
  select d.empresa_id, d.recebimento_empresa_id, d.subempresa_id, d.vencimento, d.valor_combinado,
    case when d.vencimento < v_hoje then 'em_atraso' else 'previsto' end,
    true
  from datas d
  where not exists (
    select 1 from public.recebimentos_lancamentos l
    where l.subempresa_id = d.subempresa_id and l.vencimento = d.vencimento
  )
  on conflict do nothing;
end;
$$;

revoke all on function public.recebimentos_sincronizar_recorrencias(uuid) from public;
grant execute on function public.recebimentos_sincronizar_recorrencias(uuid) to authenticated;
