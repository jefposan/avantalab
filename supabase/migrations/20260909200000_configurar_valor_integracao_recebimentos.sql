-- Configuração global da integração de Operações de Campo com Resultados.
-- O padrão "recebido" preserva integralmente o comportamento já publicado:
-- somente baixas confirmadas entram nas Receitas. A opção "programado" é
-- explícita e recalcula exclusivamente as entradas automáticas deste módulo.

alter table public.recebimentos_integracao_financeira
  add column if not exists base_valor text;

update public.recebimentos_integracao_financeira
set base_valor = 'recebido'
where base_valor is null or base_valor not in ('recebido', 'programado');

alter table public.recebimentos_integracao_financeira
  alter column base_valor set default 'recebido';

alter table public.recebimentos_integracao_financeira
  alter column base_valor set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'recebimentos_integracao_financeira_base_valor_check'
      and conrelid = 'public.recebimentos_integracao_financeira'::regclass
  ) then
    alter table public.recebimentos_integracao_financeira
      add constraint recebimentos_integracao_financeira_base_valor_check
      check (base_valor in ('recebido', 'programado'));
  end if;
end $$;

create or replace function public.recebimentos_sincronizar_mes_financeiro(
  p_empresa_id uuid,
  p_ano integer,
  p_mes integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config public.recebimentos_integracao_financeira%rowtype;
  v_mes_nome text;
  v_total numeric(12,2) := 0;
  v_valor_anterior numeric(12,2) := 0;
  v_entrada_id uuid;
  v_dia integer;
begin
  if p_ano not between 2000 and 2200 or p_mes not between 1 and 12 then return; end if;

  select * into v_config
  from public.recebimentos_integracao_financeira
  where empresa_id = p_empresa_id;
  if not found or not v_config.ativo then return; end if;

  perform pg_advisory_xact_lock(hashtext(p_empresa_id::text), p_ano * 100 + p_mes);
  v_mes_nome := (array['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
    'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'])[p_mes];

  if v_config.base_valor = 'programado' then
    select coalesce(sum(valor_combinado), 0), extract(day from max(vencimento))::integer
      into v_total, v_dia
    from public.recebimentos_lancamentos
    where empresa_id = p_empresa_id
      and extract(year from vencimento)::integer = p_ano
      and extract(month from vencimento)::integer = p_mes;
  else
    select coalesce(sum(valor_recebido), 0),
           extract(day from max(coalesce(baixado_em, recebido_em) at time zone 'America/Sao_Paulo'))::integer
      into v_total, v_dia
    from public.recebimentos_lancamentos
    where empresa_id = p_empresa_id
      and situacao = 'baixado'
      and valor_recebido is not null
      and extract(year from (coalesce(baixado_em, recebido_em) at time zone 'America/Sao_Paulo'))::integer = p_ano
      and extract(month from (coalesce(baixado_em, recebido_em) at time zone 'America/Sao_Paulo'))::integer = p_mes;
  end if;

  select faturamento_entrada_id, valor_sincronizado
    into v_entrada_id, v_valor_anterior
  from public.recebimentos_receitas_gestao
  where empresa_id = p_empresa_id and ano = p_ano and mes = v_mes_nome;
  v_valor_anterior := coalesce(v_valor_anterior, 0);

  perform set_config('app.recebimentos_sync', '1', true);
  if v_total <= 0 then
    if v_entrada_id is not null then
      update public.faturamentos
      set valor = greatest(0, coalesce(valor, 0) - v_valor_anterior)
      where empresa_id = p_empresa_id and ano = p_ano and mes = v_mes_nome;
      delete from public.faturamentos_entradas
      where id = v_entrada_id and empresa_id = p_empresa_id;
    end if;
    perform set_config('app.recebimentos_sync', '0', true);
    return;
  end if;

  if v_entrada_id is null then
    insert into public.faturamentos_entradas
      (empresa_id, ano, mes, dia, origem, valor, status, tipo_obs, origem_etiqueta, criado_por)
    values
      (p_empresa_id, p_ano, v_mes_nome, coalesce(v_dia, 1), v_config.nome_entrada, v_total, null,
       'recebimentos_sistema', v_config.titulo_etiqueta, auth.uid())
    returning id into v_entrada_id;

    insert into public.recebimentos_receitas_gestao
      (empresa_id, ano, mes, faturamento_entrada_id, valor_sincronizado, atualizado_por)
    values (p_empresa_id, p_ano, v_mes_nome, v_entrada_id, v_total, auth.uid());
  else
    update public.faturamentos_entradas
    set dia = coalesce(v_dia, 1),
        origem = v_config.nome_entrada,
        valor = v_total,
        status = null,
        tipo_obs = 'recebimentos_sistema',
        origem_etiqueta = v_config.titulo_etiqueta,
        updated_at = now()
    where id = v_entrada_id and empresa_id = p_empresa_id;

    update public.recebimentos_receitas_gestao
    set valor_sincronizado = v_total, atualizado_em = now(), atualizado_por = auth.uid()
    where empresa_id = p_empresa_id and ano = p_ano and mes = v_mes_nome;
  end if;

  insert into public.faturamentos (empresa_id, ano, mes, valor)
  values (p_empresa_id, p_ano, v_mes_nome, v_total)
  on conflict (empresa_id, ano, mes) do update
  set valor = greatest(0, coalesce(public.faturamentos.valor, 0) + (v_total - v_valor_anterior));
  perform set_config('app.recebimentos_sync', '0', true);
end;
$$;

create or replace function public.recebimentos_sincronizar_todos_meses_financeiro(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_periodo record;
begin
  for v_periodo in
    select distinct ano, mes from (
      select extract(year from vencimento)::integer as ano, extract(month from vencimento)::integer as mes
      from public.recebimentos_lancamentos where empresa_id = p_empresa_id
      union all
      select extract(year from (coalesce(baixado_em, recebido_em) at time zone 'America/Sao_Paulo'))::integer,
             extract(month from (coalesce(baixado_em, recebido_em) at time zone 'America/Sao_Paulo'))::integer
      from public.recebimentos_lancamentos where empresa_id = p_empresa_id and valor_recebido is not null
      union all
      select ano, array_position(array['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
        'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'], mes)
      from public.recebimentos_receitas_gestao where empresa_id = p_empresa_id
    ) periodos
    where ano is not null and mes between 1 and 12
  loop
    perform public.recebimentos_sincronizar_mes_financeiro(p_empresa_id, v_periodo.ano, v_periodo.mes);
  end loop;
end;
$$;

create or replace function public.recebimentos_obter_integracao_financeira(
  p_empresa_id uuid,
  p_ano integer,
  p_mes integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config public.recebimentos_integracao_financeira%rowtype;
  v_valor numeric(12,2) := 0;
  v_mes_nome text;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.recebimentos_pode_gerir(p_empresa_id) then raise exception 'Acesso negado.'; end if;
  if p_ano not between 2000 and 2200 or p_mes not between 1 and 12 then raise exception 'Período inválido.'; end if;

  perform public.recebimentos_sincronizar_mes_financeiro(p_empresa_id, p_ano, p_mes);
  v_mes_nome := (array['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
    'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'])[p_mes];
  select * into v_config from public.recebimentos_integracao_financeira where empresa_id = p_empresa_id;
  select coalesce(valor_sincronizado, 0) into v_valor
  from public.recebimentos_receitas_gestao
  where empresa_id = p_empresa_id and ano = p_ano and mes = v_mes_nome;

  return jsonb_build_object(
    'nome_entrada', coalesce(v_config.nome_entrada, 'Recebimentos em campo'),
    'titulo_etiqueta', coalesce(v_config.titulo_etiqueta, 'Recebimentos'),
    'integrado', coalesce(v_config.ativo, false),
    'base_valor', coalesce(v_config.base_valor, 'recebido'),
    'valor_sincronizado', coalesce(v_valor, 0)
  );
end;
$$;

create or replace function public.recebimentos_atualizar_configuracao_financeira(
  p_empresa_id uuid,
  p_ano integer,
  p_mes integer,
  p_nome_entrada text,
  p_titulo_etiqueta text,
  p_base_valor text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := btrim(coalesce(p_nome_entrada, ''));
  v_etiqueta text := btrim(coalesce(p_titulo_etiqueta, ''));
  v_base text := btrim(coalesce(p_base_valor, ''));
  v_ativo boolean := true;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.recebimentos_pode_gerir(p_empresa_id) then raise exception 'Acesso negado.'; end if;
  if p_ano not between 2000 and 2200 or p_mes not between 1 and 12 then raise exception 'Período inválido.'; end if;
  if char_length(v_nome) not between 1 and 120 then raise exception 'Informe o nome da entrada.'; end if;
  if char_length(v_etiqueta) not between 1 and 40 then raise exception 'Informe um título de etiqueta com até 40 caracteres.'; end if;
  if v_base not in ('recebido', 'programado') then raise exception 'Escolha o tipo de valor enviado ao resultado.'; end if;

  select ativo into v_ativo from public.recebimentos_integracao_financeira where empresa_id = p_empresa_id;
  v_ativo := coalesce(v_ativo, true);
  insert into public.recebimentos_integracao_financeira
    (empresa_id, nome_entrada, titulo_etiqueta, base_valor, ativo, atualizado_em, atualizado_por)
  values (p_empresa_id, v_nome, v_etiqueta, v_base, v_ativo, now(), auth.uid())
  on conflict (empresa_id) do update set
    nome_entrada = excluded.nome_entrada,
    titulo_etiqueta = excluded.titulo_etiqueta,
    base_valor = excluded.base_valor,
    atualizado_em = now(),
    atualizado_por = auth.uid();

  if v_ativo then perform public.recebimentos_sincronizar_todos_meses_financeiro(p_empresa_id); end if;
  return public.recebimentos_obter_integracao_financeira(p_empresa_id, p_ano, p_mes);
end;
$$;

create or replace function public.recebimentos_disparar_sincronizacao_financeira()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_data timestamp;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_data := coalesce(old.baixado_em, old.recebido_em) at time zone 'America/Sao_Paulo';
    if v_data is not null then
      perform public.recebimentos_sincronizar_mes_financeiro(old.empresa_id, extract(year from v_data)::int, extract(month from v_data)::int);
    end if;
    perform public.recebimentos_sincronizar_mes_financeiro(old.empresa_id, extract(year from old.vencimento)::int, extract(month from old.vencimento)::int);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_data := coalesce(new.baixado_em, new.recebido_em) at time zone 'America/Sao_Paulo';
    if v_data is not null then
      perform public.recebimentos_sincronizar_mes_financeiro(new.empresa_id, extract(year from v_data)::int, extract(month from v_data)::int);
    end if;
    perform public.recebimentos_sincronizar_mes_financeiro(new.empresa_id, extract(year from new.vencimento)::int, extract(month from new.vencimento)::int);
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.recebimentos_atualizar_configuracao_financeira(uuid, integer, integer, text, text, text) from public;
grant execute on function public.recebimentos_atualizar_configuracao_financeira(uuid, integer, integer, text, text, text) to authenticated;
