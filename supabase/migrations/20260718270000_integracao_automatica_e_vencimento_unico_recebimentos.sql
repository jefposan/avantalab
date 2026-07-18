-- Automatiza a integração mensal entre Recebimentos Presenciais e Receitas.
-- Também garante uma única configuração de vencimento por subempresa: ao
-- alterar a recorrência, somente previsões futuras automáticas são substituídas.

alter table public.recebimentos_integracao_financeira
  add column if not exists ativo boolean not null default true;

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

  select coalesce(sum(valor_recebido), 0),
         extract(day from max(coalesce(baixado_em, recebido_em) at time zone 'America/Sao_Paulo'))::integer
    into v_total, v_dia
  from public.recebimentos_lancamentos
  where empresa_id = p_empresa_id
    and situacao = 'baixado'
    and valor_recebido is not null
    and extract(year from (coalesce(baixado_em, recebido_em) at time zone 'America/Sao_Paulo'))::integer = p_ano
    and extract(month from (coalesce(baixado_em, recebido_em) at time zone 'America/Sao_Paulo'))::integer = p_mes;

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
      (p_empresa_id, p_ano, v_mes_nome, v_dia, v_config.nome_entrada, v_total, null,
       'recebimentos_sistema', v_config.titulo_etiqueta, auth.uid())
    returning id into v_entrada_id;

    insert into public.recebimentos_receitas_gestao
      (empresa_id, ano, mes, faturamento_entrada_id, valor_sincronizado, atualizado_por)
    values (p_empresa_id, p_ano, v_mes_nome, v_entrada_id, v_total, auth.uid());
  else
    update public.faturamentos_entradas
    set dia = v_dia,
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
      select
        extract(year from (coalesce(baixado_em, recebido_em) at time zone 'America/Sao_Paulo'))::integer as ano,
        extract(month from (coalesce(baixado_em, recebido_em) at time zone 'America/Sao_Paulo'))::integer as mes
      from public.recebimentos_lancamentos
      where empresa_id = p_empresa_id and situacao = 'baixado' and valor_recebido is not null
      union all
      select ano, array_position(array['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
        'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'], mes)
      from public.recebimentos_receitas_gestao
      where empresa_id = p_empresa_id
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
    'valor_sincronizado', coalesce(v_valor, 0)
  );
end;
$$;

create or replace function public.recebimentos_atualizar_titulos_financeiro(
  p_empresa_id uuid,
  p_ano integer,
  p_mes integer,
  p_nome_entrada text,
  p_titulo_etiqueta text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := btrim(coalesce(p_nome_entrada, ''));
  v_etiqueta text := btrim(coalesce(p_titulo_etiqueta, ''));
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.recebimentos_pode_gerir(p_empresa_id) then raise exception 'Acesso negado.'; end if;
  if char_length(v_nome) not between 1 and 120 then raise exception 'Informe o nome da entrada.'; end if;
  if char_length(v_etiqueta) not between 1 and 40 then raise exception 'Informe um título de etiqueta com até 40 caracteres.'; end if;

  insert into public.recebimentos_integracao_financeira
    (empresa_id, nome_entrada, titulo_etiqueta, ativo, atualizado_em, atualizado_por)
  values (p_empresa_id, v_nome, v_etiqueta, true, now(), auth.uid())
  on conflict (empresa_id) do update set
    nome_entrada = excluded.nome_entrada,
    titulo_etiqueta = excluded.titulo_etiqueta,
    atualizado_em = now(),
    atualizado_por = auth.uid();

  perform set_config('app.recebimentos_sync', '1', true);
  update public.faturamentos_entradas e
  set origem = v_nome, origem_etiqueta = v_etiqueta, updated_at = now()
  from public.recebimentos_receitas_gestao r
  where r.empresa_id = p_empresa_id and r.faturamento_entrada_id = e.id;
  perform set_config('app.recebimentos_sync', '0', true);

  return public.recebimentos_obter_integracao_financeira(p_empresa_id, p_ano, p_mes);
end;
$$;

create or replace function public.recebimentos_definir_integracao_financeira(
  p_empresa_id uuid,
  p_ativa boolean,
  p_ano integer,
  p_mes integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vinculo record;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.recebimentos_pode_gerir(p_empresa_id) then raise exception 'Acesso negado.'; end if;

  insert into public.recebimentos_integracao_financeira (empresa_id, ativo, atualizado_em, atualizado_por)
  values (p_empresa_id, p_ativa, now(), auth.uid())
  on conflict (empresa_id) do update set ativo = excluded.ativo, atualizado_em = now(), atualizado_por = auth.uid();

  if p_ativa then
    perform public.recebimentos_sincronizar_todos_meses_financeiro(p_empresa_id);
  else
    perform set_config('app.recebimentos_sync', '1', true);
    for v_vinculo in
      select ano, mes, faturamento_entrada_id, valor_sincronizado
      from public.recebimentos_receitas_gestao where empresa_id = p_empresa_id
    loop
      update public.faturamentos
      set valor = greatest(0, coalesce(valor, 0) - v_vinculo.valor_sincronizado)
      where empresa_id = p_empresa_id and ano = v_vinculo.ano and mes = v_vinculo.mes;
      delete from public.faturamentos_entradas where id = v_vinculo.faturamento_entrada_id;
    end loop;
    perform set_config('app.recebimentos_sync', '0', true);
  end if;

  return public.recebimentos_obter_integracao_financeira(p_empresa_id, p_ano, p_mes);
end;
$$;

-- Compatibilidade com clientes que ainda chamem o nome anterior durante a publicação.
create or replace function public.recebimentos_integrar_financeiro(
  p_empresa_id uuid, p_ano integer, p_mes integer, p_nome_entrada text, p_titulo_etiqueta text
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.recebimentos_atualizar_titulos_financeiro(
    p_empresa_id, p_ano, p_mes, p_nome_entrada, p_titulo_etiqueta
  );
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
  if tg_op in ('UPDATE', 'DELETE') and old.situacao = 'baixado' and old.valor_recebido is not null then
    v_data := coalesce(old.baixado_em, old.recebido_em) at time zone 'America/Sao_Paulo';
    perform public.recebimentos_sincronizar_mes_financeiro(old.empresa_id, extract(year from v_data)::int, extract(month from v_data)::int);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.situacao = 'baixado' and new.valor_recebido is not null then
    v_data := coalesce(new.baixado_em, new.recebido_em) at time zone 'America/Sao_Paulo';
    perform public.recebimentos_sincronizar_mes_financeiro(new.empresa_id, extract(year from v_data)::int, extract(month from v_data)::int);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists recebimentos_sincronizacao_financeira_trigger on public.recebimentos_lancamentos;
create trigger recebimentos_sincronizacao_financeira_trigger
after insert or update or delete on public.recebimentos_lancamentos
for each row execute function public.recebimentos_disparar_sincronizacao_financeira();

create or replace function public.recebimentos_ativar_integracao_ao_instalar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.modulo_id = 'recebimentos_presencial' and new.ativo
     and (tg_op = 'INSERT' or not coalesce(old.ativo, false)) then
    insert into public.recebimentos_integracao_financeira (empresa_id, ativo, atualizado_em, atualizado_por)
    values (new.empresa_id, true, now(), auth.uid())
    on conflict (empresa_id) do update set ativo = true, atualizado_em = now(), atualizado_por = auth.uid();
    perform public.recebimentos_sincronizar_todos_meses_financeiro(new.empresa_id);
  end if;
  return new;
end;
$$;

drop trigger if exists recebimentos_ativar_integracao_trigger on public.empresa_modulos;
create trigger recebimentos_ativar_integracao_trigger
after insert or update of ativo on public.empresa_modulos
for each row execute function public.recebimentos_ativar_integracao_ao_instalar();

-- Mantém apenas os campos próprios do período selecionado.
create or replace function public.recebimentos_normalizar_vencimento_unico()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.frequencia_recebimento = 'semanal' then
    new.dia_mes := null; new.mes_inicio := null;
  elsif new.frequencia_recebimento in ('quinzenal', 'mensal') then
    new.dias_semana := '{}'; new.mes_inicio := null;
  else
    new.dias_semana := '{}';
  end if;
  return new;
end;
$$;

drop trigger if exists recebimentos_normalizar_vencimento_unico_trigger on public.recebimentos_subempresas;
create trigger recebimentos_normalizar_vencimento_unico_trigger
before insert or update of frequencia_recebimento, dias_semana, dia_mes, mes_inicio
on public.recebimentos_subempresas
for each row execute function public.recebimentos_normalizar_vencimento_unico();

create or replace function public.recebimentos_substituir_previsoes_ao_alterar_vencimento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if tg_op = 'UPDATE' and (
    old.frequencia_recebimento is distinct from new.frequencia_recebimento or
    old.dias_semana is distinct from new.dias_semana or
    old.dia_mes is distinct from new.dia_mes or
    old.mes_inicio is distinct from new.mes_inicio or
    old.recorrencia_inicio is distinct from new.recorrencia_inicio or
    old.valor_combinado is distinct from new.valor_combinado or
    old.ativo is distinct from new.ativo
  ) then
    delete from public.recebimentos_lancamentos
    where subempresa_id = new.id
      and recorrencia_gerada
      and valor_recebido is null
      and vencimento >= v_hoje;
    perform public.recebimentos_sincronizar_recorrencias(new.empresa_id);
  elsif tg_op = 'INSERT' then
    perform public.recebimentos_sincronizar_recorrencias(new.empresa_id);
  end if;
  return new;
end;
$$;

drop trigger if exists recebimentos_substituir_previsoes_trigger on public.recebimentos_subempresas;
create trigger recebimentos_substituir_previsoes_trigger
after insert or update of frequencia_recebimento, dias_semana, dia_mes, mes_inicio, recorrencia_inicio, valor_combinado, ativo
on public.recebimentos_subempresas
for each row execute function public.recebimentos_substituir_previsoes_ao_alterar_vencimento();

-- Instalações já ativas passam a sincronizar automaticamente sem ação manual.
insert into public.recebimentos_integracao_financeira (empresa_id, ativo, atualizado_em)
select empresa_id, true, now()
from public.empresa_modulos
where modulo_id = 'recebimentos_presencial' and ativo
on conflict (empresa_id) do update set ativo = true, atualizado_em = now();

do $$
declare v_empresa record;
begin
  for v_empresa in select empresa_id from public.recebimentos_integracao_financeira where ativo
  loop
    perform public.recebimentos_sincronizar_todos_meses_financeiro(v_empresa.empresa_id);
  end loop;
end $$;

revoke all on function public.recebimentos_sincronizar_mes_financeiro(uuid, integer, integer) from public, authenticated;
revoke all on function public.recebimentos_sincronizar_todos_meses_financeiro(uuid) from public, authenticated;
revoke all on function public.recebimentos_disparar_sincronizacao_financeira() from public, authenticated;
revoke all on function public.recebimentos_ativar_integracao_ao_instalar() from public, authenticated;
revoke all on function public.recebimentos_normalizar_vencimento_unico() from public, authenticated;
revoke all on function public.recebimentos_substituir_previsoes_ao_alterar_vencimento() from public, authenticated;
revoke all on function public.recebimentos_obter_integracao_financeira(uuid, integer, integer) from public;
grant execute on function public.recebimentos_obter_integracao_financeira(uuid, integer, integer) to authenticated;
revoke all on function public.recebimentos_atualizar_titulos_financeiro(uuid, integer, integer, text, text) from public;
grant execute on function public.recebimentos_atualizar_titulos_financeiro(uuid, integer, integer, text, text) to authenticated;
revoke all on function public.recebimentos_definir_integracao_financeira(uuid, boolean, integer, integer) from public;
grant execute on function public.recebimentos_definir_integracao_financeira(uuid, boolean, integer, integer) to authenticated;
revoke all on function public.recebimentos_integrar_financeiro(uuid, integer, integer, text, text) from public;
grant execute on function public.recebimentos_integrar_financeiro(uuid, integer, integer, text, text) to authenticated;
