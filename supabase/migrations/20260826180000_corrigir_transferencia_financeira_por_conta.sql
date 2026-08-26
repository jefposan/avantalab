-- Corrige a adoção do vínculo financeiro por conta.
--
-- Garantias:
-- 1. a base (recebidos/vendidos) é gravada junto com o vínculo;
-- 2. todos os lançamentos da conta são reclassificados, inclusive os que
--    herdaram empresa_id do vínculo legado por usuário;
-- 3. o usuário decide se o histórico anterior permanece na Gestão ou é
--    removido, sem apagar pedidos, pagamentos ou qualquer dado operacional;
-- 4. trocas agendadas aplicam a mesma regra quando entram em vigor.

create or replace function public.preservar_historico_legado_conta_vendas_mobile(
  p_conta_id uuid,
  p_user_id uuid,
  p_empresa_id uuid,
  p_base_receita text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mes record;
  v_entrada_id uuid;
  v_dia integer := extract(day from (now() at time zone 'America/Sao_Paulo'))::integer;
begin
  if p_conta_id is null or p_user_id is null or p_empresa_id is null then
    return;
  end if;

  p_base_receita := case when p_base_receita = 'vendidos' then 'vendidos' else 'recebidos' end;
  perform set_config('app.vendas_mobile_sync', '1', true);

  for v_mes in
    select
      extract(year from origem.referencia)::integer as ano,
      extract(month from origem.referencia)::integer as numero_mes,
      (array[
        'JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
        'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'
      ])[extract(month from origem.referencia)::integer] as mes,
      sum(origem.valor)::numeric(12, 2) as valor
    from (
      select pagamento.data_pagamento as referencia, pagamento.valor
      from public.vendas_mobile_pagamentos pagamento
      where p_base_receita = 'recebidos'
        and pagamento.conta_id = p_conta_id
        and pagamento.user_id = p_user_id
        and pagamento.empresa_id = p_empresa_id

      union all

      select (pedido.criado_em at time zone 'America/Sao_Paulo')::date, pedido.total
      from public.vendas_mobile_pedidos pedido
      where p_base_receita = 'vendidos'
        and pedido.conta_id = p_conta_id
        and pedido.user_id = p_user_id
        and pedido.empresa_id = p_empresa_id
        and coalesce(lower(pedido.status), '') not in ('cancelada', 'convertida')
        and coalesce(lower(pedido.forma_pagamento), '') not like '%consign%'
        and coalesce(pedido.total, 0) > 0
    ) origem
    where origem.referencia is not null
    group by extract(year from origem.referencia), extract(month from origem.referencia)
    having sum(origem.valor) > 0
  loop
    insert into public.faturamentos_entradas (
      empresa_id, ano, mes, dia, origem, valor, status, tipo_obs, criado_por
    )
    values (
      p_empresa_id,
      v_mes.ano,
      v_mes.mes,
      least(
        v_dia,
        extract(day from (
          make_date(v_mes.ano, v_mes.numero_mes, 1) + interval '1 month - 1 day'
        ))::integer
      ),
      'Vendas Mobile — histórico mantido',
      v_mes.valor,
      null,
      'vendas_mobile_desvinculado',
      p_user_id
    )
    returning id into v_entrada_id;

    insert into public.faturamentos (empresa_id, ano, mes, valor)
    values (p_empresa_id, v_mes.ano, v_mes.mes, v_mes.valor)
    on conflict (empresa_id, ano, mes) do update
      set valor = public.faturamentos.valor + excluded.valor;
  end loop;
end;
$$;

create or replace function public.aplicar_troca_financeira_pendente_conta_vendas_mobile(
  p_conta_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_destino public.vendas_mobile_contas_perfis_financeiros;
begin
  select *
    into v_destino
  from public.vendas_mobile_contas_perfis_financeiros
  where conta_id = p_conta_id
  for update;

  if v_destino.conta_id is null
    or v_destino.empresa_anterior_id is null
    or v_destino.vigente_desde > current_date
  then
    return;
  end if;

  perform public.desvincular_receitas_vendas_mobile_conta(
    p_conta_id,
    v_destino.empresa_anterior_id,
    v_destino.acao_historico_anterior = 'apagar'
  );

  perform set_config('app.vendas_mobile_transferencia', '1', true);

  update public.vendas_mobile_pedidos
  set empresa_id = null
  where conta_id = p_conta_id
    and empresa_id = v_destino.empresa_anterior_id;

  update public.vendas_mobile_pagamentos
  set empresa_id = null
  where conta_id = p_conta_id
    and empresa_id = v_destino.empresa_anterior_id;

  update public.vendas_mobile_pedidos
  set empresa_id = v_destino.empresa_id
  where conta_id = p_conta_id
    and empresa_id is null
    and (criado_em at time zone 'America/Sao_Paulo')::date >= v_destino.vigente_desde;

  update public.vendas_mobile_pagamentos
  set empresa_id = v_destino.empresa_id
  where conta_id = p_conta_id
    and empresa_id is null
    and data_pagamento >= v_destino.vigente_desde;

  perform set_config('app.vendas_mobile_transferencia', '0', true);
  perform public.sincronizar_receita_vendas_mobile_conta(p_conta_id, v_destino.empresa_id);

  update public.vendas_mobile_contas_perfis_financeiros
  set empresa_anterior_id = null,
      acao_historico_anterior = 'manter',
      atualizado_em = now()
  where conta_id = p_conta_id;
end;
$$;

create or replace function public.definir_perfil_financeiro_vendas_mobile_rpc(
  p_conta_id uuid,
  p_empresa_id uuid,
  p_periodo text,
  p_historico_anterior text,
  p_base_receita text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_atual uuid;
  v_inicio date;
  v_pendente boolean := false;
  v_explicito boolean := false;
  v_origem record;
  v_usuario_id uuid;
  v_usuarios_legado uuid[];
  v_base_anterior text;
  v_processar_origem boolean;
  v_total numeric(14, 2) := 0;
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada.';
  end if;

  if p_conta_id is null or not public.vendas_mobile_pode_gerir_conta(p_conta_id) then
    raise exception 'Somente o proprietário ou administrador pode definir o destino financeiro desta conta.';
  end if;

  if p_periodo not in ('todo_historico', 'mes_atual', 'mes_seguinte')
    or p_historico_anterior not in ('manter', 'apagar')
    or p_base_receita not in ('recebidos', 'vendidos')
  then
    raise exception 'Opção financeira inválida.';
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

  perform pg_advisory_xact_lock(hashtextextended('vendas-vinculo:' || p_conta_id::text, 0));
  perform public.aplicar_troca_financeira_pendente_conta_vendas_mobile(p_conta_id);

  select exists (
    select 1 from public.vendas_mobile_contas_perfis_financeiros destino
    where destino.conta_id = p_conta_id
  ) into v_explicito;

  v_atual := public.empresa_financeira_conta_vendas_mobile(p_conta_id, current_date);
  if v_atual is null then
    v_atual := public.empresa_financeira_efetiva_conta_vendas_mobile(
      p_conta_id,
      auth.uid(),
      current_date
    );
  end if;

  v_inicio := case p_periodo
    when 'mes_atual' then date_trunc('month', current_date)::date
    when 'mes_seguinte' then (date_trunc('month', current_date) + interval '1 month')::date
    else date '0001-01-01'
  end;

  insert into public.vendas_mobile_contas_integracao_gestao (
    conta_id, base_receita, atualizado_por
  )
  values (p_conta_id, p_base_receita, auth.uid())
  on conflict (conta_id) do update set
    base_receita = excluded.base_receita,
    atualizado_por = excluded.atualizado_por,
    atualizado_em = now();

  if v_explicito and v_atual = p_empresa_id then
    perform public.sincronizar_receita_vendas_mobile_conta(p_conta_id, p_empresa_id);
    select case when p_base_receita = 'vendidos'
      then coalesce((
        select sum(pedido.total)
        from public.vendas_mobile_pedidos pedido
        where pedido.conta_id = p_conta_id
          and pedido.empresa_id = p_empresa_id
          and coalesce(lower(pedido.status), '') not in ('cancelada', 'convertida')
          and coalesce(lower(pedido.forma_pagamento), '') not like '%consign%'
          and coalesce(pedido.total, 0) > 0
      ), 0)
      else coalesce((
        select sum(pagamento.valor)
        from public.vendas_mobile_pagamentos pagamento
        where pagamento.conta_id = p_conta_id
          and pagamento.empresa_id = p_empresa_id
      ), 0)
    end into v_total;

    return jsonb_build_object(
      'empresa_id', p_empresa_id,
      'empresa_ativa_id', p_empresa_id,
      'vigente_desde', current_date,
      'troca_pendente', false,
      'base_receita', p_base_receita,
      'valor_sincronizado', v_total
    );
  end if;

  -- Uma troca futura entre dois vínculos próprios permanece agendada. A base
  -- escolhida já fica registrada e passa a valer para a conta inteira.
  if v_explicito and v_atual is not null and v_inicio > current_date then
    insert into public.vendas_mobile_contas_perfis_financeiros (
      conta_id, empresa_id, empresa_anterior_id, vigente_desde,
      acao_historico_anterior, atualizado_por
    )
    values (
      p_conta_id, p_empresa_id, v_atual, v_inicio,
      p_historico_anterior, auth.uid()
    )
    on conflict (conta_id) do update set
      empresa_id = excluded.empresa_id,
      empresa_anterior_id = excluded.empresa_anterior_id,
      vigente_desde = excluded.vigente_desde,
      acao_historico_anterior = excluded.acao_historico_anterior,
      atualizado_por = excluded.atualizado_por,
      atualizado_em = now();

    perform public.sincronizar_receita_vendas_mobile_conta(p_conta_id, v_atual);

    return jsonb_build_object(
      'empresa_id', v_atual,
      'empresa_ativa_id', v_atual,
      'proxima_empresa_id', p_empresa_id,
      'vigente_desde', v_inicio,
      'troca_pendente', true,
      'base_receita', p_base_receita
    );
  end if;

  perform set_config('app.vendas_mobile_transferencia', '1', true);

  for v_origem in
    select distinct origem.empresa_id
    from (
      select pedido.empresa_id
      from public.vendas_mobile_pedidos pedido
      where pedido.conta_id = p_conta_id
      union
      select pagamento.empresa_id
      from public.vendas_mobile_pagamentos pagamento
      where pagamento.conta_id = p_conta_id
    ) origem
    where origem.empresa_id is not null
  loop
    v_processar_origem := v_origem.empresa_id <> p_empresa_id
      or exists (
        select 1
        from public.vendas_mobile_receitas_gestao_conta mapa
        where mapa.conta_id = p_conta_id
          and mapa.empresa_id = v_origem.empresa_id
      )
      or exists (
        select 1
        from public.vendas_mobile_receitas_gestao_usuario mapa
        where mapa.empresa_id = v_origem.empresa_id
          and mapa.user_id in (
            select pedido.user_id
            from public.vendas_mobile_pedidos pedido
            where pedido.conta_id = p_conta_id
              and pedido.empresa_id = v_origem.empresa_id
            union
            select pagamento.user_id
            from public.vendas_mobile_pagamentos pagamento
            where pagamento.conta_id = p_conta_id
              and pagamento.empresa_id = v_origem.empresa_id
          )
      );

    if not v_processar_origem then
      continue;
    end if;

    if exists (
      select 1
      from public.vendas_mobile_receitas_gestao_conta mapa
      where mapa.conta_id = p_conta_id
        and mapa.empresa_id = v_origem.empresa_id
    ) then
      perform public.desvincular_receitas_vendas_mobile_conta(
        p_conta_id,
        v_origem.empresa_id,
        p_historico_anterior = 'apagar'
      );
    end if;

    select coalesce(array_agg(distinct usuario_id), array[]::uuid[])
      into v_usuarios_legado
    from (
      select pedido.user_id as usuario_id
      from public.vendas_mobile_pedidos pedido
      where pedido.conta_id = p_conta_id
        and pedido.empresa_id = v_origem.empresa_id
      union
      select pagamento.user_id
      from public.vendas_mobile_pagamentos pagamento
      where pagamento.conta_id = p_conta_id
        and pagamento.empresa_id = v_origem.empresa_id
    ) usuarios
    where exists (
      select 1
      from public.vendas_mobile_receitas_gestao_usuario mapa
      where mapa.user_id = usuarios.usuario_id
        and mapa.empresa_id = v_origem.empresa_id
    );

    foreach v_usuario_id in array v_usuarios_legado
    loop
      select coalesce(integracao.base_receita, 'recebidos')
        into v_base_anterior
      from public.vendas_mobile_integracao_gestao integracao
      where integracao.empresa_id = v_origem.empresa_id;
      v_base_anterior := coalesce(v_base_anterior, 'recebidos');

      if p_historico_anterior = 'manter' then
        perform public.preservar_historico_legado_conta_vendas_mobile(
          p_conta_id,
          v_usuario_id,
          v_origem.empresa_id,
          v_base_anterior
        );
      end if;

      -- O agregado legado reúne todas as contas do usuário. Ele é removido e,
      -- após a retirada desta conta, recriado apenas com as demais contas.
      perform public.desvincular_receitas_vendas_mobile_usuario(
        v_usuario_id,
        v_origem.empresa_id,
        true
      );
    end loop;

    update public.vendas_mobile_pedidos
    set empresa_id = null
    where conta_id = p_conta_id
      and empresa_id = v_origem.empresa_id;

    update public.vendas_mobile_pagamentos
    set empresa_id = null
    where conta_id = p_conta_id
      and empresa_id = v_origem.empresa_id;

    foreach v_usuario_id in array v_usuarios_legado
    loop
      perform public.sincronizar_receita_vendas_mobile_usuario(
        v_usuario_id,
        v_origem.empresa_id
      );
    end loop;
  end loop;

  update public.vendas_mobile_pedidos
  set empresa_id = p_empresa_id
  where conta_id = p_conta_id
    and empresa_id is null
    and (criado_em at time zone 'America/Sao_Paulo')::date >= v_inicio;

  update public.vendas_mobile_pagamentos
  set empresa_id = p_empresa_id
  where conta_id = p_conta_id
    and empresa_id is null
    and data_pagamento >= v_inicio;

  perform set_config('app.vendas_mobile_transferencia', '0', true);

  v_pendente := v_inicio > current_date;
  insert into public.vendas_mobile_contas_perfis_financeiros (
    conta_id, empresa_id, empresa_anterior_id, vigente_desde,
    acao_historico_anterior, atualizado_por
  )
  values (
    p_conta_id,
    p_empresa_id,
    case when v_pendente and v_atual is not null then v_atual else null end,
    v_inicio,
    case when v_pendente and v_atual is not null then p_historico_anterior else 'manter' end,
    auth.uid()
  )
  on conflict (conta_id) do update set
    empresa_id = excluded.empresa_id,
    empresa_anterior_id = excluded.empresa_anterior_id,
    vigente_desde = excluded.vigente_desde,
    acao_historico_anterior = excluded.acao_historico_anterior,
    atualizado_por = excluded.atualizado_por,
    atualizado_em = now();

  if not v_pendente then
    perform public.sincronizar_receita_vendas_mobile_conta(p_conta_id, p_empresa_id);
  end if;

  select case when p_base_receita = 'vendidos'
    then coalesce((
      select sum(pedido.total)
      from public.vendas_mobile_pedidos pedido
      where pedido.conta_id = p_conta_id
        and pedido.empresa_id = p_empresa_id
        and coalesce(lower(pedido.status), '') not in ('cancelada', 'convertida')
        and coalesce(lower(pedido.forma_pagamento), '') not like '%consign%'
        and coalesce(pedido.total, 0) > 0
    ), 0)
    else coalesce((
      select sum(pagamento.valor)
      from public.vendas_mobile_pagamentos pagamento
      where pagamento.conta_id = p_conta_id
        and pagamento.empresa_id = p_empresa_id
    ), 0)
  end into v_total;

  return jsonb_build_object(
    'empresa_id', case when v_pendente and v_atual is null then null else p_empresa_id end,
    'empresa_ativa_id', case when v_pendente then v_atual else p_empresa_id end,
    'proxima_empresa_id', case when v_pendente then p_empresa_id else null end,
    'vigente_desde', v_inicio,
    'troca_pendente', v_pendente,
    'base_receita', p_base_receita,
    'valor_sincronizado', v_total
  );
end;
$$;

-- Compatibilidade durante a atualização dos arquivos estáticos do PWA.
create or replace function public.definir_perfil_financeiro_vendas_mobile_rpc(
  p_conta_id uuid,
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
  v_base text;
begin
  select base_receita
    into v_base
  from public.vendas_mobile_contas_integracao_gestao
  where conta_id = p_conta_id;

  return public.definir_perfil_financeiro_vendas_mobile_rpc(
    p_conta_id,
    p_empresa_id,
    p_periodo,
    p_historico_anterior,
    coalesce(v_base, 'recebidos')
  );
end;
$$;

create or replace function public.obter_integracao_gestao_vendas_mobile_rpc(
  p_conta_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_destino public.vendas_mobile_contas_perfis_financeiros;
  v_empresa_id uuid;
  v_empresa_permissao_id uuid;
  v_base text;
  v_legado boolean := false;
  v_pendente boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada.';
  end if;

  if p_conta_id is null or not public.vendas_mobile_pode_ler_conta(p_conta_id) then
    raise exception 'Conta de vendas inválida ou sem permissão.';
  end if;

  perform public.aplicar_troca_financeira_pendente_conta_vendas_mobile(p_conta_id);
  select * into v_destino
  from public.vendas_mobile_contas_perfis_financeiros
  where conta_id = p_conta_id;

  v_empresa_id := public.empresa_financeira_conta_vendas_mobile(p_conta_id, current_date);
  v_pendente := v_destino.conta_id is not null and v_destino.vigente_desde > current_date;

  if v_empresa_id is null and v_destino.conta_id is null then
    v_empresa_id := public.empresa_financeira_efetiva_conta_vendas_mobile(
      p_conta_id,
      auth.uid(),
      current_date
    );
    v_legado := v_empresa_id is not null;
  end if;

  if v_empresa_id is null and v_destino.conta_id is null then
    return jsonb_build_object(
      'base_receita', 'recebidos',
      'pode_configurar', false,
      'vinculado', false,
      'troca_pendente', false
    );
  end if;

  if v_legado then
    select base_receita into v_base
    from public.vendas_mobile_integracao_gestao
    where empresa_id = v_empresa_id;
  else
    select base_receita into v_base
    from public.vendas_mobile_contas_integracao_gestao
    where conta_id = p_conta_id;
  end if;

  if v_empresa_id is not null and not v_legado then
    perform public.sincronizar_receita_vendas_mobile_conta(p_conta_id, v_empresa_id);
  end if;

  v_empresa_permissao_id := coalesce(v_destino.empresa_id, v_empresa_id);

  return jsonb_build_object(
    'base_receita', coalesce(v_base, 'recebidos'),
    'pode_configurar', exists (
      select 1
      from public.usuarios_empresa acesso
      where acesso.user_id = auth.uid()
        and acesso.empresa_id = v_empresa_permissao_id
        and acesso.status = 'ativo'
        and acesso.perfil in ('gestor_master', 'administrador')
    ),
    'vinculado', true,
    'empresa_id', v_empresa_id,
    'troca_pendente', v_pendente or v_destino.empresa_anterior_id is not null,
    'proxima_empresa_id', case
      when v_pendente or v_destino.empresa_anterior_id is not null
        then v_destino.empresa_id
      else null
    end,
    'vigente_desde', coalesce(v_destino.vigente_desde, date '0001-01-01'),
    'acao_historico_anterior', coalesce(v_destino.acao_historico_anterior, 'manter')
  );
end;
$$;

revoke all on function public.preservar_historico_legado_conta_vendas_mobile(uuid, uuid, uuid, text) from public;
revoke all on function public.definir_perfil_financeiro_vendas_mobile_rpc(uuid, uuid, text, text, text) from public;
revoke all on function public.definir_perfil_financeiro_vendas_mobile_rpc(uuid, uuid, text, text) from public;
grant execute on function public.definir_perfil_financeiro_vendas_mobile_rpc(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.definir_perfil_financeiro_vendas_mobile_rpc(uuid, uuid, text, text) to authenticated;
