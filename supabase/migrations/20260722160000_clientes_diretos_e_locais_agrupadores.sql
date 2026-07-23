-- Recebimentos Presenciais: uma empresa pode ser um cliente direto ou apenas
-- um local agrupador (shopping, galeria, condomínio). Clientes dentro de um
-- local continuam em recebimentos_subempresas por compatibilidade histórica.

alter table public.recebimentos_empresas
  add column if not exists tipo_cadastro text not null default 'local_agrupador',
  add column if not exists endereco text not null default '',
  add column if not exists cep text not null default '',
  add column if not exists logradouro text not null default '',
  add column if not exists bairro text not null default '',
  add column if not exists cidade text not null default '',
  add column if not exists estado text not null default '',
  add column if not exists numero text not null default '',
  add column if not exists complemento text not null default '',
  add column if not exists valor_combinado numeric(12,2),
  add column if not exists frequencia_recebimento text,
  add column if not exists recorrencia_inicio date not null default current_date,
  add column if not exists dias_semana smallint[] not null default '{}',
  add column if not exists dia_mes smallint,
  add column if not exists mes_inicio smallint,
  add column if not exists dia_vencimento smallint;

alter table public.recebimentos_empresas
  drop constraint if exists recebimentos_empresas_tipo_cadastro_check,
  drop constraint if exists recebimentos_empresas_valor_combinado_check,
  drop constraint if exists recebimentos_empresas_frequencia_check;

alter table public.recebimentos_empresas
  add constraint recebimentos_empresas_tipo_cadastro_check
    check (tipo_cadastro in ('cliente_direto', 'local_agrupador')),
  add constraint recebimentos_empresas_valor_combinado_check
    check (valor_combinado is null or valor_combinado > 0),
  add constraint recebimentos_empresas_frequencia_check
    check (frequencia_recebimento is null or frequencia_recebimento in ('semanal', 'quinzenal', 'mensal', 'trimestral', 'semestral', 'anual'));

-- Cadastros antigos eram todos contêineres de subempresas; preserva-os como
-- locais agrupadores, sem criar cobrança indevida.
update public.recebimentos_empresas
set tipo_cadastro = 'local_agrupador'
where tipo_cadastro is null;

alter table public.recebimentos_lancamentos
  alter column subempresa_id drop not null;

create or replace function public.recebimentos_validar_origem_lancamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo text;
  v_pai uuid;
begin
  select tipo_cadastro into v_tipo
  from public.recebimentos_empresas
  where id = new.recebimento_empresa_id and empresa_id = new.empresa_id;

  if not found then raise exception 'Empresa de recebimento inválida.'; end if;
  if new.subempresa_id is null then
    if v_tipo <> 'cliente_direto' then
      raise exception 'Somente cliente direto pode receber cobrança própria.';
    end if;
  else
    select recebimento_empresa_id into v_pai
    from public.recebimentos_subempresas
    where id = new.subempresa_id and empresa_id = new.empresa_id;
    if not found or v_pai is distinct from new.recebimento_empresa_id then
      raise exception 'Cliente vinculado ao local incorreto.';
    end if;
    if v_tipo <> 'local_agrupador' then
      raise exception 'Cliente direto não aceita clientes abaixo.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists recebimentos_validar_origem_lancamento_trigger on public.recebimentos_lancamentos;
create trigger recebimentos_validar_origem_lancamento_trigger
before insert or update of recebimento_empresa_id, subempresa_id on public.recebimentos_lancamentos
for each row execute function public.recebimentos_validar_origem_lancamento();

-- Impede incluir clientes em um cadastro que representa um cliente direto.
create or replace function public.recebimentos_validar_cliente_no_local()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.recebimentos_empresas e
    where e.id = new.recebimento_empresa_id
      and e.empresa_id = new.empresa_id
      and e.tipo_cadastro <> 'local_agrupador'
  ) then
    raise exception 'Clientes abaixo só podem ser cadastrados em um local agrupador.';
  end if;
  return new;
end;
$$;

drop trigger if exists recebimentos_validar_cliente_no_local_trigger on public.recebimentos_subempresas;
create trigger recebimentos_validar_cliente_no_local_trigger
before insert or update of recebimento_empresa_id on public.recebimentos_subempresas
for each row execute function public.recebimentos_validar_cliente_no_local();

-- Uma empresa não pode virar cliente direto se ainda organiza clientes.
create or replace function public.recebimentos_validar_tipo_empresa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo_cadastro = 'cliente_direto' and exists (
    select 1 from public.recebimentos_subempresas s
    where s.recebimento_empresa_id = new.id
  ) then
    raise exception 'Este local possui clientes cadastrados e não pode ser convertido em cliente direto.';
  end if;
  return new;
end;
$$;

drop trigger if exists recebimentos_validar_tipo_empresa_trigger on public.recebimentos_empresas;
create trigger recebimentos_validar_tipo_empresa_trigger
before update of tipo_cadastro on public.recebimentos_empresas
for each row execute function public.recebimentos_validar_tipo_empresa();

create or replace function public.recebimentos_substituir_previsoes_cliente_direto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if new.tipo_cadastro = 'cliente_direto' and (
    tg_op = 'INSERT' or old.valor_combinado is distinct from new.valor_combinado or old.frequencia_recebimento is distinct from new.frequencia_recebimento or old.dias_semana is distinct from new.dias_semana or old.dia_mes is distinct from new.dia_mes or old.mes_inicio is distinct from new.mes_inicio or old.recorrencia_inicio is distinct from new.recorrencia_inicio or old.ativo is distinct from new.ativo
  ) then
    delete from public.recebimentos_lancamentos
    where recebimento_empresa_id = new.id and subempresa_id is null and recorrencia_gerada and valor_recebido is null and vencimento >= v_hoje;
    perform public.recebimentos_sincronizar_recorrencias(new.empresa_id);
  end if;
  return new;
end;
$$;

drop trigger if exists recebimentos_substituir_previsoes_cliente_direto_trigger on public.recebimentos_empresas;
create trigger recebimentos_substituir_previsoes_cliente_direto_trigger
after insert or update of tipo_cadastro, valor_combinado, frequencia_recebimento, dias_semana, dia_mes, mes_inicio, recorrencia_inicio, ativo on public.recebimentos_empresas
for each row execute function public.recebimentos_substituir_previsoes_cliente_direto();

-- A sincronização de recorrências passa a incluir tanto clientes em locais
-- quanto empresas-clientes diretas. Lançamentos diretos usam subempresa_id nulo.
create or replace function public.recebimentos_sincronizar_recorrencias(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not (public.recebimentos_pode_gerir(p_empresa_id) or public.recebimentos_e_colaborador(p_empresa_id)) then raise exception 'Acesso negado.'; end if;

  update public.recebimentos_lancamentos
  set situacao = 'em_atraso', atualizado_em = now()
  where empresa_id = p_empresa_id and situacao = 'previsto' and valor_recebido is null and vencimento < v_hoje;

  with configuradas as (
    select s.id as subempresa_id, s.empresa_id, s.recebimento_empresa_id, s.valor_combinado, s.frequencia_recebimento, s.recorrencia_inicio, s.dias_semana, s.dia_mes, s.mes_inicio
    from public.recebimentos_subempresas s
    join public.recebimentos_empresas e on e.id = s.recebimento_empresa_id
    where s.empresa_id = p_empresa_id and s.ativo and e.tipo_cadastro = 'local_agrupador'
    union all
    select null::uuid, e.empresa_id, e.id, e.valor_combinado, e.frequencia_recebimento, e.recorrencia_inicio, e.dias_semana, e.dia_mes, e.mes_inicio
    from public.recebimentos_empresas e
    where e.empresa_id = p_empresa_id and e.ativo and e.tipo_cadastro = 'cliente_direto'
      and e.valor_combinado is not null and e.frequencia_recebimento is not null
  ), configuradas_com_ancora as (
    select c.*,
      case
        when c.dia_mes is null then null
        when make_date(extract(year from c.recorrencia_inicio)::int, extract(month from c.recorrencia_inicio)::int, least(c.dia_mes, extract(day from (date_trunc('month', c.recorrencia_inicio) + interval '1 month - 1 day'))::int)) >= c.recorrencia_inicio
          then make_date(extract(year from c.recorrencia_inicio)::int, extract(month from c.recorrencia_inicio)::int, least(c.dia_mes, extract(day from (date_trunc('month', c.recorrencia_inicio) + interval '1 month - 1 day'))::int))
        else make_date(extract(year from (c.recorrencia_inicio + interval '1 month'))::int, extract(month from (c.recorrencia_inicio + interval '1 month'))::int, least(c.dia_mes, extract(day from (date_trunc('month', c.recorrencia_inicio + interval '1 month') + interval '1 month - 1 day'))::int))
      end as ancora_quinzenal
    from configuradas c
  ), datas as (
    select c.*, d::date as vencimento
    from configuradas_com_ancora c cross join lateral generate_series(c.recorrencia_inicio, v_hoje + 365, interval '1 day') d
    where (c.frequencia_recebimento = 'semanal' and extract(dow from d)::smallint = any(c.dias_semana))
       or (c.frequencia_recebimento = 'quinzenal' and c.ancora_quinzenal is not null and d::date >= c.ancora_quinzenal and ((d::date - c.ancora_quinzenal) % 15) = 0)
       or (c.frequencia_recebimento = 'mensal' and c.dia_mes is not null and extract(day from d)::int = least(c.dia_mes, extract(day from (date_trunc('month', d) + interval '1 month - 1 day'))::int))
       or (c.frequencia_recebimento in ('trimestral', 'semestral') and c.dia_mes is not null and c.mes_inicio is not null and extract(day from d)::int = least(c.dia_mes, extract(day from (date_trunc('month', d) + interval '1 month - 1 day'))::int) and ((extract(month from d)::int - c.mes_inicio + 12) % case when c.frequencia_recebimento = 'trimestral' then 3 else 6 end) = 0)
       or (c.frequencia_recebimento = 'anual' and c.dia_mes is not null and c.mes_inicio is not null and extract(month from d)::int = c.mes_inicio and extract(day from d)::int = least(c.dia_mes, extract(day from (date_trunc('month', d) + interval '1 month - 1 day'))::int))
  )
  insert into public.recebimentos_lancamentos (empresa_id, recebimento_empresa_id, subempresa_id, vencimento, valor_combinado, situacao, recorrencia_gerada)
  select empresa_id, recebimento_empresa_id, subempresa_id, vencimento, valor_combinado, case when vencimento < v_hoje then 'em_atraso' else 'previsto' end, true
  from datas d
  where not exists (select 1 from public.recebimentos_lancamentos l where l.recebimento_empresa_id = d.recebimento_empresa_id and l.subempresa_id is not distinct from d.subempresa_id and l.vencimento = d.vencimento)
  on conflict do nothing;
end;
$$;

revoke all on function public.recebimentos_validar_origem_lancamento() from public, authenticated;
revoke all on function public.recebimentos_validar_cliente_no_local() from public, authenticated;
revoke all on function public.recebimentos_validar_tipo_empresa() from public, authenticated;
revoke all on function public.recebimentos_substituir_previsoes_cliente_direto() from public, authenticated;
