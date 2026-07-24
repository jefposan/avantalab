-- Mantém somente o horizonte móvel dos próximos 12 meses de previsões
-- automáticas. Histórico, recebimentos e baixas nunca são removidos.

create or replace function public.recebimentos_sincronizar_recorrencias(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_limite date := ((now() at time zone 'America/Sao_Paulo')::date + interval '12 months')::date;
begin
  if not (public.recebimentos_pode_gerir(p_empresa_id) or public.recebimentos_e_colaborador(p_empresa_id)) then
    raise exception 'Acesso negado.';
  end if;

  update public.recebimentos_lancamentos
  set situacao = 'em_atraso', atualizado_em = now()
  where empresa_id = p_empresa_id
    and situacao = 'previsto'
    and valor_recebido is null
    and vencimento < v_hoje;

  delete from public.recebimentos_lancamentos
  where empresa_id = p_empresa_id
    and recorrencia_gerada
    and valor_recebido is null
    and vencimento > v_limite;

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
      s.mes_inicio
    from public.recebimentos_subempresas s
    join public.recebimentos_empresas e on e.id = s.recebimento_empresa_id
    where s.empresa_id = p_empresa_id
      and s.ativo
      and e.tipo_cadastro = 'local_agrupador'
      and s.valor_combinado is not null
      and s.frequencia_recebimento is not null

    union all

    select
      null::uuid,
      e.empresa_id,
      e.id,
      e.valor_combinado,
      e.frequencia_recebimento,
      e.recorrencia_inicio,
      e.dias_semana,
      e.dia_mes,
      e.mes_inicio
    from public.recebimentos_empresas e
    where e.empresa_id = p_empresa_id
      and e.ativo
      and e.tipo_cadastro = 'cliente_direto'
      and e.valor_combinado is not null
      and e.frequencia_recebimento is not null
  ), configuradas_com_ancora as (
    select
      c.*,
      case
        when c.dia_mes is null then null
        when make_date(
          extract(year from c.recorrencia_inicio)::int,
          extract(month from c.recorrencia_inicio)::int,
          least(
            c.dia_mes,
            extract(day from (date_trunc('month', c.recorrencia_inicio) + interval '1 month - 1 day'))::int
          )
        ) >= c.recorrencia_inicio
          then make_date(
            extract(year from c.recorrencia_inicio)::int,
            extract(month from c.recorrencia_inicio)::int,
            least(
              c.dia_mes,
              extract(day from (date_trunc('month', c.recorrencia_inicio) + interval '1 month - 1 day'))::int
            )
          )
        else make_date(
          extract(year from (c.recorrencia_inicio + interval '1 month'))::int,
          extract(month from (c.recorrencia_inicio + interval '1 month'))::int,
          least(
            c.dia_mes,
            extract(day from (date_trunc('month', c.recorrencia_inicio + interval '1 month') + interval '1 month - 1 day'))::int
          )
        )
      end as ancora_quinzenal
    from configuradas c
  ), datas as (
    select c.*, d::date as vencimento
    from configuradas_com_ancora c
    cross join lateral generate_series(c.recorrencia_inicio, v_limite, interval '1 day') d
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
      and extract(day from d)::int = least(
        c.dia_mes,
        extract(day from (date_trunc('month', d) + interval '1 month - 1 day'))::int
      )
    ) or (
      c.frequencia_recebimento in ('trimestral', 'semestral')
      and c.dia_mes is not null
      and c.mes_inicio is not null
      and extract(day from d)::int = least(
        c.dia_mes,
        extract(day from (date_trunc('month', d) + interval '1 month - 1 day'))::int
      )
      and (
        (extract(month from d)::int - c.mes_inicio + 12)
        % case when c.frequencia_recebimento = 'trimestral' then 3 else 6 end
      ) = 0
    ) or (
      c.frequencia_recebimento = 'anual'
      and c.dia_mes is not null
      and c.mes_inicio is not null
      and extract(month from d)::int = c.mes_inicio
      and extract(day from d)::int = least(
        c.dia_mes,
        extract(day from (date_trunc('month', d) + interval '1 month - 1 day'))::int
      )
    )
  )
  insert into public.recebimentos_lancamentos (
    empresa_id,
    recebimento_empresa_id,
    subempresa_id,
    vencimento,
    valor_combinado,
    situacao,
    recorrencia_gerada
  )
  select
    empresa_id,
    recebimento_empresa_id,
    subempresa_id,
    vencimento,
    valor_combinado,
    case when vencimento < v_hoje then 'em_atraso' else 'previsto' end,
    true
  from datas d
  where not exists (
    select 1
    from public.recebimentos_lancamentos l
    where l.recebimento_empresa_id = d.recebimento_empresa_id
      and l.subempresa_id is not distinct from d.subempresa_id
      and l.vencimento = d.vencimento
  )
  on conflict do nothing;
end;
$$;

revoke all on function public.recebimentos_sincronizar_recorrencias(uuid) from public;
grant execute on function public.recebimentos_sincronizar_recorrencias(uuid) to authenticated;
