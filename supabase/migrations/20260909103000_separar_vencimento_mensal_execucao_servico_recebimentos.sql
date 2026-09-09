-- Recebimentos Presenciais: cobrança é mensal; a recorrência passa a descrever
-- exclusivamente a execução do serviço. Histórico e lançamentos já recebidos
-- não são alterados. Apenas previsões automáticas futuras em aberto são
-- reconstruídas a partir do dia de vencimento mensal preservado.

alter table public.recebimentos_empresas
  add column if not exists frequencia_execucao_servico text,
  add column if not exists dias_execucao_semana smallint[] not null default '{}',
  add column if not exists dia_execucao_mes smallint,
  add column if not exists mes_inicio_execucao smallint,
  add column if not exists tipo_nivel text,
  add column if not exists identificacao_nivel text;

alter table public.recebimentos_subempresas
  add column if not exists frequencia_execucao_servico text,
  add column if not exists dias_execucao_semana smallint[] not null default '{}',
  add column if not exists dia_execucao_mes smallint,
  add column if not exists mes_inicio_execucao smallint,
  add column if not exists tipo_nivel text,
  add column if not exists identificacao_nivel text,
  add column if not exists herda_execucao_servico boolean not null default true;

-- Todas as subempresas já cadastradas começam usando a programação do seu
-- local agrupador. A configuração própria permanece guardada para o caso de
-- o gestor desativar essa herança mais tarde.
update public.recebimentos_subempresas
set herda_execucao_servico = true
where herda_execucao_servico is distinct from true;

alter table public.recebimentos_empresas
  drop constraint if exists recebimentos_empresas_frequencia_execucao_servico_check;
alter table public.recebimentos_subempresas
  drop constraint if exists recebimentos_subempresas_frequencia_execucao_servico_check;

alter table public.recebimentos_empresas
  drop constraint if exists recebimentos_empresas_tipo_nivel_check,
  add constraint recebimentos_empresas_tipo_nivel_check
  check (tipo_nivel is null or tipo_nivel in ('andar', 'piso', 'subsolo', 'terreo', 'mezanino', 'outro'));
alter table public.recebimentos_subempresas
  drop constraint if exists recebimentos_subempresas_tipo_nivel_check,
  add constraint recebimentos_subempresas_tipo_nivel_check
  check (tipo_nivel is null or tipo_nivel in ('andar', 'piso', 'subsolo', 'terreo', 'mezanino', 'outro'));

alter table public.recebimentos_empresas
  add constraint recebimentos_empresas_frequencia_execucao_servico_check
  check (frequencia_execucao_servico is null or frequencia_execucao_servico in ('semanal', 'quinzenal', 'mensal', 'trimestral', 'semestral', 'anual'));
alter table public.recebimentos_subempresas
  add constraint recebimentos_subempresas_frequencia_execucao_servico_check
  check (frequencia_execucao_servico is null or frequencia_execucao_servico in ('semanal', 'quinzenal', 'mensal', 'trimestral', 'semestral', 'anual'));

-- Copia a configuração existente para o novo domínio antes de normalizar a
-- cobrança. Assim, a regra que já descrevia o serviço continua disponível.
update public.recebimentos_empresas
set frequencia_execucao_servico = coalesce(frequencia_execucao_servico, frequencia_recebimento, 'mensal'),
    dias_execucao_semana = case when dias_execucao_semana = '{}'::smallint[] and dias_semana <> '{}'::smallint[] then dias_semana else dias_execucao_semana end,
    dia_execucao_mes = coalesce(dia_execucao_mes, dia_mes),
    mes_inicio_execucao = coalesce(mes_inicio_execucao, mes_inicio)
where tipo_cadastro = 'cliente_direto';

update public.recebimentos_subempresas
set frequencia_execucao_servico = coalesce(frequencia_execucao_servico, frequencia_recebimento, 'mensal'),
    dias_execucao_semana = case when dias_execucao_semana = '{}'::smallint[] and dias_semana <> '{}'::smallint[] then dias_semana else dias_execucao_semana end,
    dia_execucao_mes = coalesce(dia_execucao_mes, dia_mes),
    mes_inicio_execucao = coalesce(mes_inicio_execucao, mes_inicio);

-- A fonte do novo vencimento é, nesta ordem: o dia legado explícito, o antigo
-- dia-base, o próximo lançamento existente e, só em último caso, o dia do
-- início da recorrência. Dessa forma nenhum cadastro fica sem dia mensal.
with dias as (
  select e.id,
    coalesce(
      case when e.dia_vencimento between 1 and 31 then e.dia_vencimento end,
      case when e.dia_mes between 1 and 31 then e.dia_mes end,
      (
        select extract(day from l.vencimento)::smallint
        from public.recebimentos_lancamentos l
        where l.recebimento_empresa_id = e.id and l.subempresa_id is null
        order by (l.vencimento >= current_date) desc, l.vencimento asc
        limit 1
      ),
      extract(day from coalesce(e.recorrencia_inicio, current_date))::smallint
    ) as dia_vencimento
  from public.recebimentos_empresas e
  where e.tipo_cadastro = 'cliente_direto'
)
update public.recebimentos_empresas e
set dia_vencimento = dias.dia_vencimento
from dias
where e.id = dias.id;

with dias as (
  select s.id,
    coalesce(
      case when s.dia_vencimento between 1 and 31 then s.dia_vencimento end,
      case when s.dia_mes between 1 and 31 then s.dia_mes end,
      (
        select extract(day from l.vencimento)::smallint
        from public.recebimentos_lancamentos l
        where l.subempresa_id = s.id
        order by (l.vencimento >= current_date) desc, l.vencimento asc
        limit 1
      ),
      extract(day from coalesce(s.recorrencia_inicio, current_date))::smallint
    ) as dia_vencimento
  from public.recebimentos_subempresas s
)
update public.recebimentos_subempresas s
set dia_vencimento = dias.dia_vencimento
from dias
where s.id = dias.id;

alter table public.recebimentos_empresas
  drop constraint if exists recebimentos_empresas_dia_vencimento_cliente_direto_check,
  add constraint recebimentos_empresas_dia_vencimento_cliente_direto_check
  check (tipo_cadastro <> 'cliente_direto' or dia_vencimento between 1 and 31);
alter table public.recebimentos_subempresas
  drop constraint if exists recebimentos_subempresas_dia_vencimento_mensal_check,
  add constraint recebimentos_subempresas_dia_vencimento_mensal_check
  check (dia_vencimento between 1 and 31);

-- Impede que os gatilhos antigos recriem previsões intermediárias enquanto os
-- campos legados são normalizados para compatibilidade com clientes antigos.
alter table public.recebimentos_empresas disable trigger user;
alter table public.recebimentos_subempresas disable trigger user;

update public.recebimentos_empresas
set frequencia_recebimento = case when tipo_cadastro = 'cliente_direto' then 'mensal' else null end,
    dias_semana = '{}',
    dia_mes = case when tipo_cadastro = 'cliente_direto' then dia_vencimento else null end,
    mes_inicio = null;

update public.recebimentos_subempresas
set frequencia_recebimento = 'mensal',
    dias_semana = '{}',
    dia_mes = dia_vencimento,
    mes_inicio = null;

alter table public.recebimentos_empresas enable trigger user;
alter table public.recebimentos_subempresas enable trigger user;

create or replace function public.recebimentos_normalizar_execucao_servico()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.frequencia_execucao_servico is null then
    new.frequencia_execucao_servico := coalesce(new.frequencia_recebimento, 'mensal');
    if new.dias_execucao_semana = '{}'::smallint[] and new.dias_semana <> '{}'::smallint[] then
      new.dias_execucao_semana := new.dias_semana;
    end if;
    new.dia_execucao_mes := coalesce(new.dia_execucao_mes, new.dia_mes);
    new.mes_inicio_execucao := coalesce(new.mes_inicio_execucao, new.mes_inicio);
  end if;
  if new.frequencia_execucao_servico = 'semanal' then
    new.dia_execucao_mes := null;
    new.mes_inicio_execucao := null;
  elsif new.frequencia_execucao_servico in ('quinzenal', 'mensal') then
    new.dias_execucao_semana := '{}';
    new.mes_inicio_execucao := null;
  else
    new.dias_execucao_semana := '{}';
  end if;
  return new;
end;
$$;

drop trigger if exists recebimentos_normalizar_vencimento_unico_trigger on public.recebimentos_subempresas;
drop trigger if exists recebimentos_normalizar_execucao_servico_trigger on public.recebimentos_subempresas;
create trigger recebimentos_normalizar_execucao_servico_trigger
before insert or update of frequencia_execucao_servico, dias_execucao_semana, dia_execucao_mes, mes_inicio_execucao
on public.recebimentos_subempresas
for each row execute function public.recebimentos_normalizar_execucao_servico();

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
  if auth.uid() is not null and not (public.recebimentos_pode_gerir(p_empresa_id) or public.recebimentos_e_colaborador(p_empresa_id)) then
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
    select s.id as subempresa_id, s.empresa_id, s.recebimento_empresa_id,
      s.valor_combinado, s.recorrencia_inicio, s.dia_vencimento
    from public.recebimentos_subempresas s
    join public.recebimentos_empresas e on e.id = s.recebimento_empresa_id
    where s.empresa_id = p_empresa_id and s.ativo and e.tipo_cadastro = 'local_agrupador'
      and s.valor_combinado is not null and s.dia_vencimento between 1 and 31

    union all

    select null::uuid, e.empresa_id, e.id, e.valor_combinado,
      e.recorrencia_inicio, e.dia_vencimento
    from public.recebimentos_empresas e
    where e.empresa_id = p_empresa_id and e.ativo and e.tipo_cadastro = 'cliente_direto'
      and e.valor_combinado is not null and e.dia_vencimento between 1 and 31
  ), datas as (
    select c.*, d::date as vencimento
    from configuradas c
    cross join lateral generate_series(c.recorrencia_inicio, v_limite, interval '1 day') d
    where extract(day from d)::int = least(
      c.dia_vencimento,
      extract(day from (date_trunc('month', d) + interval '1 month - 1 day'))::int
    )
  )
  insert into public.recebimentos_lancamentos (
    empresa_id, recebimento_empresa_id, subempresa_id, vencimento,
    valor_combinado, situacao, recorrencia_gerada
  )
  select empresa_id, recebimento_empresa_id, subempresa_id, vencimento,
    valor_combinado, case when vencimento < v_hoje then 'em_atraso' else 'previsto' end, true
  from datas d
  where not exists (
    select 1 from public.recebimentos_lancamentos l
    where l.recebimento_empresa_id = d.recebimento_empresa_id
      and l.subempresa_id is not distinct from d.subempresa_id
      and l.vencimento = d.vencimento
  )
  on conflict do nothing;
end;
$$;

create or replace function public.recebimentos_substituir_previsoes_cliente_direto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if new.tipo_cadastro = 'cliente_direto' and (
    tg_op = 'INSERT'
    or old.valor_combinado is distinct from new.valor_combinado
    or old.dia_vencimento is distinct from new.dia_vencimento
    or old.recorrencia_inicio is distinct from new.recorrencia_inicio
    or old.ativo is distinct from new.ativo
  ) then
    delete from public.recebimentos_lancamentos
    where recebimento_empresa_id = new.id and subempresa_id is null
      and recorrencia_gerada and valor_recebido is null and vencimento >= v_hoje;
    perform public.recebimentos_sincronizar_recorrencias(new.empresa_id);
  end if;
  return new;
end;
$$;

create or replace function public.recebimentos_substituir_previsoes_ao_alterar_vencimento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if tg_op = 'UPDATE' and (
    old.dia_vencimento is distinct from new.dia_vencimento
    or old.recorrencia_inicio is distinct from new.recorrencia_inicio
    or old.valor_combinado is distinct from new.valor_combinado
    or old.ativo is distinct from new.ativo
  ) then
    delete from public.recebimentos_lancamentos
    where subempresa_id = new.id
      and recorrencia_gerada and valor_recebido is null and vencimento >= v_hoje;
    perform public.recebimentos_sincronizar_recorrencias(new.empresa_id);
  elsif tg_op = 'INSERT' then
    perform public.recebimentos_sincronizar_recorrencias(new.empresa_id);
  end if;
  return new;
end;
$$;

drop trigger if exists recebimentos_substituir_previsoes_cliente_direto_trigger on public.recebimentos_empresas;
create trigger recebimentos_substituir_previsoes_cliente_direto_trigger
after insert or update of tipo_cadastro, valor_combinado, dia_vencimento, recorrencia_inicio, ativo
on public.recebimentos_empresas
for each row execute function public.recebimentos_substituir_previsoes_cliente_direto();

drop trigger if exists recebimentos_substituir_previsoes_trigger on public.recebimentos_subempresas;
create trigger recebimentos_substituir_previsoes_trigger
after insert or update of valor_combinado, dia_vencimento, recorrencia_inicio, ativo
on public.recebimentos_subempresas
for each row execute function public.recebimentos_substituir_previsoes_ao_alterar_vencimento();

-- Recalcula apenas previsões abertas futuras. Lançamentos históricos, atrasos,
-- conferências, baixas, comprovantes e eventos permanecem intocados.
delete from public.recebimentos_lancamentos
where recorrencia_gerada
  and valor_recebido is null
  and vencimento >= (now() at time zone 'America/Sao_Paulo')::date;

do $$
declare v_empresa record;
begin
  for v_empresa in
    select distinct empresa_id from public.recebimentos_empresas
    union
    select distinct empresa_id from public.recebimentos_subempresas
  loop
    perform public.recebimentos_sincronizar_recorrencias(v_empresa.empresa_id);
  end loop;
end;
$$;

revoke all on function public.recebimentos_normalizar_execucao_servico() from public, authenticated;
revoke all on function public.recebimentos_sincronizar_recorrencias(uuid) from public;
grant execute on function public.recebimentos_sincronizar_recorrencias(uuid) to authenticated;
revoke all on function public.recebimentos_substituir_previsoes_cliente_direto() from public, authenticated;
revoke all on function public.recebimentos_substituir_previsoes_ao_alterar_vencimento() from public, authenticated;
