-- Separa definitivamente o vínculo comercial do destino financeiro do Vendas.
-- A conta pode operar sem perfil financeiro. Quando houver destino, a receita
-- consolidada passa a ser rastreada por usuário, perfil e competência, permitindo
-- transferir, manter desbloqueado ou apagar somente o histórico daquela conta.

alter table public.vendas_mobile_perfis_financeiros
  add column if not exists empresa_anterior_id uuid references public.empresas(id) on delete set null,
  add column if not exists vigente_desde date not null default current_date,
  add column if not exists acao_historico_anterior text not null default 'manter'
    check (acao_historico_anterior in ('manter', 'apagar'));

-- Os destinos anteriores à migração já abrangiam todo o histórico existente.
update public.vendas_mobile_perfis_financeiros
set vigente_desde = date '0001-01-01'
where empresa_anterior_id is null
  and vigente_desde = current_date;

-- A operação pessoal do Vendas pertence à conta autenticada. A instalação do
-- módulo empresarial controla publicação e administração de conteúdos, mas não
-- bloqueia clientes, produtos, agenda, pedidos ou pagamentos do vendedor.
create or replace function public.vendas_mobile_modulo_ativo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
$$;

create table if not exists public.vendas_mobile_receitas_gestao_usuario (
  user_id uuid not null references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  competencia date not null,
  faturamento_entrada_id uuid not null unique
    references public.faturamentos_entradas(id) on delete cascade,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (user_id, empresa_id, competencia)
);

create index if not exists vendas_receitas_gestao_usuario_empresa_idx
  on public.vendas_mobile_receitas_gestao_usuario (empresa_id, competencia);

alter table public.vendas_mobile_receitas_gestao_usuario enable row level security;

drop policy if exists vendas_receitas_gestao_usuario_proprias
  on public.vendas_mobile_receitas_gestao_usuario;
create policy vendas_receitas_gestao_usuario_proprias
  on public.vendas_mobile_receitas_gestao_usuario
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.usuarios_empresa acesso
      where acesso.user_id = auth.uid()
        and acesso.empresa_id = vendas_mobile_receitas_gestao_usuario.empresa_id
        and acesso.status = 'ativo'
    )
  );

-- A consolidação antiga agrupava vendedores diferentes na mesma entrada.
-- Ela é removida com ajuste do total e será reconstruída individualmente abaixo.
do $$
declare
  v_entrada record;
begin
  perform set_config('app.vendas_mobile_sync', '1', true);

  for v_entrada in
    select
      entrada.id,
      entrada.empresa_id,
      entrada.ano,
      entrada.mes,
      entrada.valor
    from public.vendas_mobile_receitas_gestao receita
    join public.faturamentos_entradas entrada
      on entrada.id = receita.faturamento_entrada_id
  loop
    delete from public.faturamentos_entradas where id = v_entrada.id;

    insert into public.faturamentos (empresa_id, ano, mes, valor)
    values (
      v_entrada.empresa_id,
      v_entrada.ano,
      v_entrada.mes,
      greatest(0, -coalesce(v_entrada.valor, 0))
    )
    on conflict (empresa_id, ano, mes) do update
      set valor = greatest(
        0,
        public.faturamentos.valor - coalesce(v_entrada.valor, 0)
      );
  end loop;

  delete from public.vendas_mobile_receitas_gestao;
end;
$$;

create or replace function public.empresa_financeira_vendas_mobile(
  p_user_id uuid,
  p_data date
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when destino.empresa_anterior_id is not null
      and destino.vigente_desde > coalesce(p_data, current_date)
      then destino.empresa_anterior_id
    when destino.empresa_anterior_id is null
      and coalesce(p_data, current_date) < destino.vigente_desde
      then null
    else destino.empresa_id
  end
  from public.vendas_mobile_perfis_financeiros destino
  where destino.user_id = p_user_id
$$;

-- Mantém compatibilidade com chamadas antigas sem ignorar a vigência.
create or replace function public.empresa_financeira_vendas_mobile(
  p_user_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select public.empresa_financeira_vendas_mobile(p_user_id, current_date)
$$;

create or replace function public.sincronizar_receita_vendas_mobile_usuario(
  p_user_id uuid,
  p_empresa_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_dia_atual integer :=
    extract(day from (now() at time zone 'America/Sao_Paulo'))::integer;
  v_entrada record;
  v_mes record;
  v_entrada_id uuid;
  v_dia integer;
begin
  if p_user_id is null or p_empresa_id is null then
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_user_id::text || ':' || p_empresa_id::text, 0)
  );

  select integracao.base_receita
    into v_base
  from public.vendas_mobile_integracao_gestao integracao
  where integracao.empresa_id = p_empresa_id;
  v_base := coalesce(v_base, 'recebidos');

  perform set_config('app.vendas_mobile_sync', '1', true);

  for v_entrada in
    select
      mapa.faturamento_entrada_id,
      entrada.ano,
      entrada.mes,
      entrada.valor
    from public.vendas_mobile_receitas_gestao_usuario mapa
    join public.faturamentos_entradas entrada
      on entrada.id = mapa.faturamento_entrada_id
    where mapa.user_id = p_user_id
      and mapa.empresa_id = p_empresa_id
  loop
    delete from public.faturamentos_entradas
    where id = v_entrada.faturamento_entrada_id;

    insert into public.faturamentos (empresa_id, ano, mes, valor)
    values (
      p_empresa_id,
      v_entrada.ano,
      v_entrada.mes,
      greatest(0, -coalesce(v_entrada.valor, 0))
    )
    on conflict (empresa_id, ano, mes) do update
      set valor = greatest(
        0,
        public.faturamentos.valor - coalesce(v_entrada.valor, 0)
      );
  end loop;

  for v_mes in
    select
      date_trunc('month', origem.referencia)::date as competencia,
      extract(year from origem.referencia)::integer as ano,
      extract(month from origem.referencia)::integer as numero_mes,
      (
        array[
          'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
          'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
        ]
      )[extract(month from origem.referencia)::integer] as mes,
      sum(origem.valor)::numeric(12, 2) as valor
    from (
      select pagamento.data_pagamento as referencia, pagamento.valor
      from public.vendas_mobile_pagamentos pagamento
      where v_base = 'recebidos'
        and pagamento.user_id = p_user_id
        and pagamento.empresa_id = p_empresa_id

      union all

      select
        (pedido.criado_em at time zone 'America/Sao_Paulo')::date as referencia,
        pedido.total as valor
      from public.vendas_mobile_pedidos pedido
      where v_base = 'vendidos'
        and pedido.user_id = p_user_id
        and pedido.empresa_id = p_empresa_id
        and coalesce(lower(pedido.status), '') not in ('cancelada', 'convertida')
        and coalesce(lower(pedido.forma_pagamento), '') not like '%consign%'
        and coalesce(pedido.total, 0) > 0
    ) origem
    where origem.referencia is not null
    group by
      date_trunc('month', origem.referencia),
      extract(year from origem.referencia),
      extract(month from origem.referencia)
    having sum(origem.valor) > 0
    order by date_trunc('month', origem.referencia)
  loop
    v_dia := least(
      v_dia_atual,
      extract(
        day from (
          make_date(v_mes.ano, v_mes.numero_mes, 1)
          + interval '1 month - 1 day'
        )
      )::integer
    );

    insert into public.faturamentos_entradas (
      empresa_id,
      ano,
      mes,
      dia,
      origem,
      valor,
      status,
      tipo_obs,
      criado_por
    )
    values (
      p_empresa_id,
      v_mes.ano,
      v_mes.mes,
      v_dia,
      'Vendas Mobile',
      v_mes.valor,
      null,
      'vendas_mobile_sistema',
      p_user_id
    )
    returning id into v_entrada_id;

    insert into public.vendas_mobile_receitas_gestao_usuario (
      user_id,
      empresa_id,
      competencia,
      faturamento_entrada_id
    )
    values (
      p_user_id,
      p_empresa_id,
      v_mes.competencia,
      v_entrada_id
    );

    insert into public.faturamentos (empresa_id, ano, mes, valor)
    values (p_empresa_id, v_mes.ano, v_mes.mes, v_mes.valor)
    on conflict (empresa_id, ano, mes) do update
      set valor = public.faturamentos.valor + v_mes.valor;
  end loop;
end;
$$;

create or replace function public.sincronizar_receita_vendas_mobile_gestao(
  p_empresa_id uuid,
  p_data date default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario record;
begin
  if p_empresa_id is null then
    return;
  end if;

  for v_usuario in
    select distinct origem.user_id
    from (
      select pedido.user_id
      from public.vendas_mobile_pedidos pedido
      where pedido.empresa_id = p_empresa_id

      union

      select pagamento.user_id
      from public.vendas_mobile_pagamentos pagamento
      where pagamento.empresa_id = p_empresa_id

      union

      select mapa.user_id
      from public.vendas_mobile_receitas_gestao_usuario mapa
      where mapa.empresa_id = p_empresa_id
    ) origem
  loop
    perform public.sincronizar_receita_vendas_mobile_usuario(
      v_usuario.user_id,
      p_empresa_id
    );
  end loop;
end;
$$;

create or replace function public.desvincular_receitas_vendas_mobile_usuario(
  p_user_id uuid,
  p_empresa_id uuid,
  p_apagar boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entrada record;
begin
  if p_user_id is null or p_empresa_id is null then
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_user_id::text || ':' || p_empresa_id::text, 0)
  );

  perform set_config('app.vendas_mobile_sync', '1', true);

  for v_entrada in
    select
      mapa.faturamento_entrada_id,
      entrada.ano,
      entrada.mes,
      entrada.valor
    from public.vendas_mobile_receitas_gestao_usuario mapa
    join public.faturamentos_entradas entrada
      on entrada.id = mapa.faturamento_entrada_id
    where mapa.user_id = p_user_id
      and mapa.empresa_id = p_empresa_id
  loop
    if p_apagar then
      delete from public.faturamentos_entradas
      where id = v_entrada.faturamento_entrada_id;

      insert into public.faturamentos (empresa_id, ano, mes, valor)
      values (
        p_empresa_id,
        v_entrada.ano,
        v_entrada.mes,
        greatest(0, -coalesce(v_entrada.valor, 0))
      )
      on conflict (empresa_id, ano, mes) do update
        set valor = greatest(
          0,
          public.faturamentos.valor - coalesce(v_entrada.valor, 0)
        );
    else
      update public.faturamentos_entradas
      set
        tipo_obs = 'vendas_mobile_desvinculado',
        origem = 'Vendas Mobile — histórico desvinculado'
      where id = v_entrada.faturamento_entrada_id;

      delete from public.vendas_mobile_receitas_gestao_usuario
      where faturamento_entrada_id = v_entrada.faturamento_entrada_id;
    end if;
  end loop;
end;
$$;

create or replace function public.executar_troca_financeira_vendas_mobile(
  p_user_id uuid,
  p_empresa_anterior_id uuid,
  p_nova_empresa_id uuid,
  p_inicio date,
  p_apagar_anterior boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_nova_empresa_id is null or p_inicio is null then
    raise exception 'Dados da troca financeira incompletos.';
  end if;

  perform set_config('app.vendas_mobile_transferencia', '1', true);

  if p_empresa_anterior_id is not null then
    perform public.desvincular_receitas_vendas_mobile_usuario(
      p_user_id,
      p_empresa_anterior_id,
      p_apagar_anterior
    );

    update public.vendas_mobile_pedidos
    set empresa_id = null
    where user_id = p_user_id
      and empresa_id = p_empresa_anterior_id;

    update public.vendas_mobile_pagamentos
    set empresa_id = null
    where user_id = p_user_id
      and empresa_id = p_empresa_anterior_id;
  end if;

  update public.vendas_mobile_pedidos
  set empresa_id = p_nova_empresa_id
  where user_id = p_user_id
    and empresa_id is null
    and (criado_em at time zone 'America/Sao_Paulo')::date >= p_inicio;

  update public.vendas_mobile_pagamentos
  set empresa_id = p_nova_empresa_id
  where user_id = p_user_id
    and empresa_id is null
    and data_pagamento >= p_inicio;

  perform public.sincronizar_receita_vendas_mobile_usuario(
    p_user_id,
    p_nova_empresa_id
  );

  perform set_config('app.vendas_mobile_transferencia', '0', true);
end;
$$;

create or replace function public.aplicar_troca_financeira_pendente_vendas_mobile(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_destino public.vendas_mobile_perfis_financeiros;
begin
  select *
    into v_destino
  from public.vendas_mobile_perfis_financeiros
  where user_id = p_user_id
  for update;

  if v_destino.user_id is null
    or v_destino.empresa_anterior_id is null
    or v_destino.vigente_desde > current_date
  then
    return;
  end if;

  perform public.executar_troca_financeira_vendas_mobile(
    p_user_id,
    v_destino.empresa_anterior_id,
    v_destino.empresa_id,
    v_destino.vigente_desde,
    v_destino.acao_historico_anterior = 'apagar'
  );

  update public.vendas_mobile_perfis_financeiros
  set
    empresa_anterior_id = null,
    acao_historico_anterior = 'manter',
    atualizado_em = now()
  where user_id = p_user_id;
end;
$$;

-- Sem destino financeiro, pedidos e pagamentos continuam sendo gravados com
-- empresa_id nulo. Uma troca agendada é efetivada antes do primeiro lançamento
-- feito a partir da competência escolhida.
create or replace function public.preencher_empresa_lancamento_vendas_mobile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_data date;
begin
  perform public.aplicar_troca_financeira_pendente_vendas_mobile(new.user_id);

  if tg_table_name = 'vendas_mobile_pagamentos' then
    v_data := coalesce(new.data_pagamento, current_date);
  else
    v_data := coalesce(
      (new.criado_em at time zone 'America/Sao_Paulo')::date,
      current_date
    );
  end if;

  if new.empresa_id is null then
    new.empresa_id := public.empresa_financeira_vendas_mobile(
      new.user_id,
      v_data
    );
  end if;

  return new;
end;
$$;

create or replace function public.disparar_sincronizacao_receita_vendas_mobile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('app.vendas_mobile_transferencia', true) = '1' then
    return coalesce(new, old);
  end if;

  if tg_op <> 'INSERT' and old.empresa_id is not null then
    perform public.sincronizar_receita_vendas_mobile_usuario(
      old.user_id,
      old.empresa_id
    );
  end if;

  if tg_op <> 'DELETE'
    and new.empresa_id is not null
    and (
      tg_op = 'INSERT'
      or old.empresa_id is distinct from new.empresa_id
      or old.user_id is distinct from new.user_id
      or to_jsonb(old) is distinct from to_jsonb(new)
    )
  then
    perform public.sincronizar_receita_vendas_mobile_usuario(
      new.user_id,
      new.empresa_id
    );
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.proteger_receita_vendas_mobile_gestao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('app.vendas_mobile_sync', true) = '1' then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' and new.tipo_obs = 'vendas_mobile_sistema' then
    raise exception 'A receita do Vendas Mobile é atualizada automaticamente.';
  end if;

  if tg_op in ('UPDATE', 'DELETE')
    and exists (
      select 1
      from public.vendas_mobile_receitas_gestao_usuario mapa
      where mapa.faturamento_entrada_id = old.id
    )
  then
    raise exception 'A receita do Vendas Mobile é atualizada automaticamente.';
  end if;

  return coalesce(new, old);
end;
$$;

drop function if exists public.definir_perfil_financeiro_vendas_mobile_rpc(uuid);

create function public.definir_perfil_financeiro_vendas_mobile_rpc(
  p_empresa_id uuid,
  p_periodo text default 'todo_historico',
  p_historico_anterior text default 'manter'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_destino_atual uuid;
  v_inicio date;
  v_apagar boolean;
  v_pendente boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada.';
  end if;

  if p_periodo not in ('todo_historico', 'mes_atual', 'mes_seguinte') then
    raise exception 'Período de transferência inválido.';
  end if;

  if p_historico_anterior not in ('manter', 'apagar') then
    raise exception 'Destino do histórico anterior inválido.';
  end if;

  if not exists (
    select 1
    from public.usuarios_empresa acesso
    where acesso.user_id = auth.uid()
      and acesso.empresa_id = p_empresa_id
      and acesso.status = 'ativo'
      and acesso.perfil in ('gestor_master', 'administrador')
  ) then
    raise exception 'Você não possui permissão financeira neste perfil.';
  end if;

  perform public.aplicar_troca_financeira_pendente_vendas_mobile(auth.uid());
  v_destino_atual := public.empresa_financeira_vendas_mobile(
    auth.uid(),
    current_date
  );

  if v_destino_atual is null then
    v_inicio := date '0001-01-01';
  elsif p_periodo = 'todo_historico' then
    v_inicio := date '0001-01-01';
  elsif p_periodo = 'mes_atual' then
    v_inicio := date_trunc('month', current_date)::date;
  else
    v_inicio := (
      date_trunc('month', current_date) + interval '1 month'
    )::date;
  end if;

  v_apagar := p_historico_anterior = 'apagar';

  if v_destino_atual = p_empresa_id then
    update public.vendas_mobile_perfis_financeiros
    set
      empresa_id = p_empresa_id,
      empresa_anterior_id = null,
      vigente_desde = current_date,
      acao_historico_anterior = 'manter',
      atualizado_em = now()
    where user_id = auth.uid();

    return jsonb_build_object(
      'empresa_id', p_empresa_id,
      'empresa_ativa_id', p_empresa_id,
      'vigente_desde', current_date,
      'troca_pendente', false
    );
  end if;

  if v_destino_atual is not null and v_inicio > current_date then
    insert into public.vendas_mobile_perfis_financeiros (
      user_id,
      empresa_id,
      empresa_anterior_id,
      vigente_desde,
      acao_historico_anterior,
      atualizado_em
    )
    values (
      auth.uid(),
      p_empresa_id,
      v_destino_atual,
      v_inicio,
      p_historico_anterior,
      now()
    )
    on conflict (user_id) do update set
      empresa_id = excluded.empresa_id,
      empresa_anterior_id = excluded.empresa_anterior_id,
      vigente_desde = excluded.vigente_desde,
      acao_historico_anterior = excluded.acao_historico_anterior,
      atualizado_em = now();

    v_pendente := true;
  else
    perform public.executar_troca_financeira_vendas_mobile(
      auth.uid(),
      v_destino_atual,
      p_empresa_id,
      v_inicio,
      v_apagar
    );

    insert into public.vendas_mobile_perfis_financeiros (
      user_id,
      empresa_id,
      empresa_anterior_id,
      vigente_desde,
      acao_historico_anterior,
      atualizado_em
    )
    values (
      auth.uid(),
      p_empresa_id,
      null,
      v_inicio,
      'manter',
      now()
    )
    on conflict (user_id) do update set
      empresa_id = excluded.empresa_id,
      empresa_anterior_id = null,
      vigente_desde = excluded.vigente_desde,
      acao_historico_anterior = 'manter',
      atualizado_em = now();
  end if;

  return jsonb_build_object(
    'empresa_id', p_empresa_id,
    'empresa_ativa_id', case
      when v_pendente then v_destino_atual
      else p_empresa_id
    end,
    'vigente_desde', v_inicio,
    'troca_pendente', v_pendente
  );
end;
$$;

create or replace function public.desvincular_perfil_financeiro_vendas_mobile_rpc(
  p_historico_anterior text default 'manter'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada.';
  end if;

  if p_historico_anterior not in ('manter', 'apagar') then
    raise exception 'Destino do histórico anterior inválido.';
  end if;

  perform public.aplicar_troca_financeira_pendente_vendas_mobile(auth.uid());
  v_empresa_id := public.empresa_financeira_vendas_mobile(auth.uid(), current_date);

  if v_empresa_id is null then
    delete from public.vendas_mobile_perfis_financeiros
    where user_id = auth.uid();
    return jsonb_build_object('desvinculado', true);
  end if;

  perform set_config('app.vendas_mobile_transferencia', '1', true);
  perform public.desvincular_receitas_vendas_mobile_usuario(
    auth.uid(),
    v_empresa_id,
    p_historico_anterior = 'apagar'
  );

  update public.vendas_mobile_pedidos
  set empresa_id = null
  where user_id = auth.uid()
    and empresa_id = v_empresa_id;

  update public.vendas_mobile_pagamentos
  set empresa_id = null
  where user_id = auth.uid()
    and empresa_id = v_empresa_id;

  delete from public.vendas_mobile_perfis_financeiros
  where user_id = auth.uid();

  perform set_config('app.vendas_mobile_transferencia', '0', true);

  return jsonb_build_object('desvinculado', true);
end;
$$;

create or replace function public.meus_perfis_financeiros_vendas_mobile_rpc()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada.';
  end if;

  perform public.aplicar_troca_financeira_pendente_vendas_mobile(auth.uid());

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'empresa_id', empresa.id,
        'empresa_nome', empresa.nome
      )
      order by empresa.nome
    )
    from public.usuarios_empresa acesso
    join public.empresas empresa on empresa.id = acesso.empresa_id
    where acesso.user_id = auth.uid()
      and acesso.status = 'ativo'
      and acesso.perfil in ('gestor_master', 'administrador')
  ), '[]'::jsonb);
end;
$$;

create or replace function public.obter_integracao_gestao_vendas_mobile_rpc()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_destino public.vendas_mobile_perfis_financeiros;
  v_empresa_ativa_id uuid;
  v_base text;
  v_pode boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada.';
  end if;

  perform public.aplicar_troca_financeira_pendente_vendas_mobile(auth.uid());

  select *
    into v_destino
  from public.vendas_mobile_perfis_financeiros
  where user_id = auth.uid();

  v_empresa_ativa_id := public.empresa_financeira_vendas_mobile(
    auth.uid(),
    current_date
  );

  if v_empresa_ativa_id is null then
    return jsonb_build_object(
      'base_receita', 'recebidos',
      'pode_configurar', false,
      'vinculado', false,
      'troca_pendente', false
    );
  end if;

  perform public.sincronizar_receita_vendas_mobile_usuario(
    auth.uid(),
    v_empresa_ativa_id
  );

  select integracao.base_receita
    into v_base
  from public.vendas_mobile_integracao_gestao integracao
  where integracao.empresa_id = v_empresa_ativa_id;

  v_pode := exists (
    select 1
    from public.usuarios_empresa acesso
    where acesso.user_id = auth.uid()
      and acesso.empresa_id = v_empresa_ativa_id
      and acesso.status = 'ativo'
      and acesso.perfil in ('gestor_master', 'administrador')
  );

  return jsonb_build_object(
    'base_receita', coalesce(v_base, 'recebidos'),
    'pode_configurar', v_pode,
    'vinculado', true,
    'empresa_id', v_empresa_ativa_id,
    'troca_pendente', v_destino.empresa_anterior_id is not null,
    'proxima_empresa_id', case
      when v_destino.empresa_anterior_id is not null then v_destino.empresa_id
      else null
    end,
    'vigente_desde', v_destino.vigente_desde,
    'acao_historico_anterior', v_destino.acao_historico_anterior
  );
end;
$$;

create or replace function public.configurar_integracao_gestao_vendas_mobile_rpc(
  p_base_receita text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada.';
  end if;

  if p_base_receita not in ('recebidos', 'vendidos') then
    raise exception 'Base de receita inválida.';
  end if;

  perform public.aplicar_troca_financeira_pendente_vendas_mobile(auth.uid());
  v_empresa_id := public.empresa_financeira_vendas_mobile(auth.uid(), current_date);

  if v_empresa_id is null then
    raise exception 'Defina um perfil financeiro antes de ativar a integração.';
  end if;

  if not exists (
    select 1
    from public.usuarios_empresa acesso
    where acesso.user_id = auth.uid()
      and acesso.empresa_id = v_empresa_id
      and acesso.status = 'ativo'
      and acesso.perfil in ('gestor_master', 'administrador')
  ) then
    raise exception 'Você não possui permissão financeira neste perfil.';
  end if;

  insert into public.vendas_mobile_integracao_gestao (
    empresa_id,
    base_receita,
    atualizado_por
  )
  values (v_empresa_id, p_base_receita, auth.uid())
  on conflict (empresa_id) do update set
    base_receita = excluded.base_receita,
    atualizado_em = now(),
    atualizado_por = excluded.atualizado_por;

  perform public.sincronizar_receita_vendas_mobile_usuario(
    auth.uid(),
    v_empresa_id
  );

  return jsonb_build_object(
    'base_receita', p_base_receita,
    'pode_configurar', true,
    'vinculado', true,
    'empresa_id', v_empresa_id
  );
end;
$$;

create or replace function public.atualizar_receita_vendas_mobile_gestao_rpc(
  p_empresa_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada.';
  end if;

  if not exists (
    select 1
    from public.usuarios_empresa acesso
    where acesso.user_id = auth.uid()
      and acesso.empresa_id = p_empresa_id
      and acesso.status = 'ativo'
  ) then
    raise exception 'Você não possui acesso a este perfil.';
  end if;

  perform public.sincronizar_receita_vendas_mobile_gestao(p_empresa_id, null);
  return jsonb_build_object('atualizado', true);
end;
$$;

revoke all on function public.definir_perfil_financeiro_vendas_mobile_rpc(
  uuid,
  text,
  text
) from public;
grant execute on function public.definir_perfil_financeiro_vendas_mobile_rpc(
  uuid,
  text,
  text
) to authenticated;

revoke all on function public.desvincular_perfil_financeiro_vendas_mobile_rpc(text)
  from public;
grant execute on function public.desvincular_perfil_financeiro_vendas_mobile_rpc(text)
  to authenticated;

-- As rotinas abaixo operam com identificadores de qualquer usuário e são
-- chamadas apenas por triggers ou pelos RPCs autenticados acima.
revoke all on function public.empresa_financeira_vendas_mobile(uuid, date)
  from public;
revoke all on function public.empresa_financeira_vendas_mobile(uuid)
  from public;
revoke all on function public.sincronizar_receita_vendas_mobile_usuario(uuid, uuid)
  from public;
revoke all on function public.sincronizar_receita_vendas_mobile_gestao(uuid, date)
  from public;
revoke all on function public.desvincular_receitas_vendas_mobile_usuario(uuid, uuid, boolean)
  from public;
revoke all on function public.executar_troca_financeira_vendas_mobile(uuid, uuid, uuid, date, boolean)
  from public;
revoke all on function public.aplicar_troca_financeira_pendente_vendas_mobile(uuid)
  from public;

-- Reconstrói todos os vínculos existentes sem mudar o destino atual.
do $$
declare
  v_origem record;
begin
  for v_origem in
    select distinct origem.user_id, origem.empresa_id
    from (
      select pedido.user_id, pedido.empresa_id
      from public.vendas_mobile_pedidos pedido
      where pedido.empresa_id is not null

      union

      select pagamento.user_id, pagamento.empresa_id
      from public.vendas_mobile_pagamentos pagamento
      where pagamento.empresa_id is not null
    ) origem
  loop
    perform public.sincronizar_receita_vendas_mobile_usuario(
      v_origem.user_id,
      v_origem.empresa_id
    );
  end loop;
end;
$$;
