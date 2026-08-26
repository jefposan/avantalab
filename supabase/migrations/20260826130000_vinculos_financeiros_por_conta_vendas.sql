-- O destino financeiro pertence à conta operacional do AvantaVendas, nunca ao
-- login. A migração preserva integralmente o histórico e o vínculo legado da
-- conta inicial; contas adicionais começam sem destino até uma escolha manual.

create table if not exists public.vendas_mobile_contas_perfis_financeiros (
  conta_id uuid primary key references public.vendas_mobile_contas(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  empresa_anterior_id uuid references public.empresas(id) on delete set null,
  vigente_desde date not null default current_date,
  acao_historico_anterior text not null default 'manter'
    check (acao_historico_anterior in ('manter', 'apagar')),
  atualizado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.vendas_mobile_contas_integracao_gestao (
  conta_id uuid primary key references public.vendas_mobile_contas(id) on delete cascade,
  base_receita text not null default 'recebidos'
    check (base_receita in ('recebidos', 'vendidos')),
  atualizado_por uuid references auth.users(id) on delete set null,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.vendas_mobile_receitas_gestao_conta (
  conta_id uuid not null references public.vendas_mobile_contas(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  competencia date not null,
  faturamento_entrada_id uuid not null unique references public.faturamentos_entradas(id) on delete cascade,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (conta_id, empresa_id, competencia)
);

create index if not exists vendas_contas_perfis_financeiros_empresa_idx
  on public.vendas_mobile_contas_perfis_financeiros (empresa_id);
create index if not exists vendas_receitas_gestao_conta_empresa_idx
  on public.vendas_mobile_receitas_gestao_conta (empresa_id, competencia);

alter table public.vendas_mobile_contas_perfis_financeiros enable row level security;
alter table public.vendas_mobile_contas_integracao_gestao enable row level security;
alter table public.vendas_mobile_receitas_gestao_conta enable row level security;

drop policy if exists vendas_contas_perfis_financeiros_leitura on public.vendas_mobile_contas_perfis_financeiros;
create policy vendas_contas_perfis_financeiros_leitura on public.vendas_mobile_contas_perfis_financeiros
  for select to authenticated using (public.vendas_mobile_pode_ler_conta(conta_id));
drop policy if exists vendas_contas_integracao_gestao_leitura on public.vendas_mobile_contas_integracao_gestao;
create policy vendas_contas_integracao_gestao_leitura on public.vendas_mobile_contas_integracao_gestao
  for select to authenticated using (public.vendas_mobile_pode_ler_conta(conta_id));
drop policy if exists vendas_receitas_gestao_conta_leitura on public.vendas_mobile_receitas_gestao_conta;
create policy vendas_receitas_gestao_conta_leitura on public.vendas_mobile_receitas_gestao_conta
  for select to authenticated using (public.vendas_mobile_pode_ler_conta(conta_id));

-- A conta inicial continua reconhecendo o vínculo legado apenas para preservar
-- os lançamentos já consolidados. Nenhuma conta adicional herda esse destino.
create or replace function public.vendas_mobile_conta_inicial_do_usuario(
  p_conta_id uuid,
  p_user_id uuid
)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.vendas_mobile_contas conta
    where conta.id = p_conta_id
      and conta.criado_por = p_user_id
      and conta.id = (
        select inicial.id
        from public.vendas_mobile_contas inicial
        where inicial.criado_por = p_user_id
        order by inicial.criado_em, inicial.id
        limit 1
      )
  )
$$;

create or replace function public.empresa_financeira_conta_vendas_mobile(
  p_conta_id uuid,
  p_data date default current_date
)
returns uuid language sql stable security definer set search_path = public as $$
  select case
    when destino.empresa_anterior_id is not null
      and destino.vigente_desde > coalesce(p_data, current_date)
      then destino.empresa_anterior_id
    when destino.empresa_anterior_id is null
      and coalesce(p_data, current_date) < destino.vigente_desde
      then null
    else destino.empresa_id
  end
  from public.vendas_mobile_contas_perfis_financeiros destino
  where destino.conta_id = p_conta_id
$$;

create or replace function public.empresa_financeira_efetiva_conta_vendas_mobile(
  p_conta_id uuid,
  p_user_id uuid,
  p_data date default current_date
)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v_empresa_id uuid;
begin
  v_empresa_id := public.empresa_financeira_conta_vendas_mobile(p_conta_id, p_data);
  if v_empresa_id is not null then return v_empresa_id; end if;
  if public.vendas_mobile_conta_inicial_do_usuario(p_conta_id, p_user_id) then
    return public.empresa_financeira_vendas_mobile(p_user_id, p_data);
  end if;
  return null;
end;
$$;

create or replace function public.sincronizar_receita_vendas_mobile_conta(
  p_conta_id uuid,
  p_empresa_id uuid
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_base text;
  v_entrada record;
  v_mes record;
  v_entrada_id uuid;
  v_dia integer := extract(day from (now() at time zone 'America/Sao_Paulo'))::integer;
begin
  if p_conta_id is null or p_empresa_id is null then return; end if;
  perform pg_advisory_xact_lock(hashtextextended('vendas-conta:' || p_conta_id::text || ':' || p_empresa_id::text, 0));
  select base_receita into v_base from public.vendas_mobile_contas_integracao_gestao where conta_id = p_conta_id;
  v_base := coalesce(v_base, 'recebidos');
  perform set_config('app.vendas_mobile_sync', '1', true);

  for v_entrada in
    select mapa.faturamento_entrada_id, entrada.ano, entrada.mes, entrada.valor
    from public.vendas_mobile_receitas_gestao_conta mapa
    join public.faturamentos_entradas entrada on entrada.id = mapa.faturamento_entrada_id
    where mapa.conta_id = p_conta_id and mapa.empresa_id = p_empresa_id
  loop
    delete from public.faturamentos_entradas where id = v_entrada.faturamento_entrada_id;
    insert into public.faturamentos (empresa_id, ano, mes, valor)
    values (p_empresa_id, v_entrada.ano, v_entrada.mes, greatest(0, -coalesce(v_entrada.valor, 0)))
    on conflict (empresa_id, ano, mes) do update set valor = greatest(0, public.faturamentos.valor - coalesce(v_entrada.valor, 0));
  end loop;
  delete from public.vendas_mobile_receitas_gestao_conta where conta_id = p_conta_id and empresa_id = p_empresa_id;

  for v_mes in
    select date_trunc('month', origem.referencia)::date as competencia,
      extract(year from origem.referencia)::integer as ano,
      extract(month from origem.referencia)::integer as numero_mes,
      (array['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'])[extract(month from origem.referencia)::integer] as mes,
      sum(origem.valor)::numeric(12,2) as valor
    from (
      select pagamento.data_pagamento as referencia, pagamento.valor
      from public.vendas_mobile_pagamentos pagamento
      where v_base = 'recebidos' and pagamento.conta_id = p_conta_id and pagamento.empresa_id = p_empresa_id
      union all
      select (pedido.criado_em at time zone 'America/Sao_Paulo')::date, pedido.total
      from public.vendas_mobile_pedidos pedido
      where v_base = 'vendidos' and pedido.conta_id = p_conta_id and pedido.empresa_id = p_empresa_id
        and coalesce(lower(pedido.status), '') not in ('cancelada','convertida')
        and coalesce(lower(pedido.forma_pagamento), '') not like '%consign%'
        and coalesce(pedido.total, 0) > 0
    ) origem
    where origem.referencia is not null
    group by date_trunc('month', origem.referencia), extract(year from origem.referencia), extract(month from origem.referencia)
    having sum(origem.valor) > 0
  loop
    insert into public.faturamentos_entradas(empresa_id, ano, mes, dia, origem, valor, status, tipo_obs, criado_por)
    values (p_empresa_id, v_mes.ano, v_mes.mes,
      least(v_dia, extract(day from (make_date(v_mes.ano, v_mes.numero_mes, 1) + interval '1 month - 1 day'))::integer),
      'Vendas Mobile', v_mes.valor, null, 'vendas_mobile_sistema', auth.uid())
    returning id into v_entrada_id;
    insert into public.vendas_mobile_receitas_gestao_conta(conta_id, empresa_id, competencia, faturamento_entrada_id)
    values (p_conta_id, p_empresa_id, v_mes.competencia, v_entrada_id);
    insert into public.faturamentos(empresa_id, ano, mes, valor) values (p_empresa_id, v_mes.ano, v_mes.mes, v_mes.valor)
    on conflict (empresa_id, ano, mes) do update set valor = public.faturamentos.valor + v_mes.valor;
  end loop;
end;
$$;

create or replace function public.desvincular_receitas_vendas_mobile_conta(
  p_conta_id uuid, p_empresa_id uuid, p_apagar boolean
)
returns void language plpgsql security definer set search_path = public as $$
declare v_entrada record;
begin
  if p_conta_id is null or p_empresa_id is null then return; end if;
  perform set_config('app.vendas_mobile_sync', '1', true);
  for v_entrada in
    select mapa.faturamento_entrada_id, entrada.ano, entrada.mes, entrada.valor
    from public.vendas_mobile_receitas_gestao_conta mapa
    join public.faturamentos_entradas entrada on entrada.id = mapa.faturamento_entrada_id
    where mapa.conta_id = p_conta_id and mapa.empresa_id = p_empresa_id
  loop
    if p_apagar then
      delete from public.faturamentos_entradas where id = v_entrada.faturamento_entrada_id;
      insert into public.faturamentos(empresa_id, ano, mes, valor)
      values(p_empresa_id, v_entrada.ano, v_entrada.mes, greatest(0, -coalesce(v_entrada.valor,0)))
      on conflict (empresa_id, ano, mes) do update set valor = greatest(0, public.faturamentos.valor - coalesce(v_entrada.valor,0));
    else
      update public.faturamentos_entradas set tipo_obs = 'vendas_mobile_desvinculado', origem = 'Vendas Mobile — histórico desvinculado'
      where id = v_entrada.faturamento_entrada_id;
    end if;
  end loop;
  delete from public.vendas_mobile_receitas_gestao_conta where conta_id = p_conta_id and empresa_id = p_empresa_id;
end;
$$;

create or replace function public.aplicar_troca_financeira_pendente_conta_vendas_mobile(p_conta_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_destino public.vendas_mobile_contas_perfis_financeiros;
begin
  select * into v_destino from public.vendas_mobile_contas_perfis_financeiros where conta_id = p_conta_id for update;
  if v_destino.conta_id is null or v_destino.empresa_anterior_id is null or v_destino.vigente_desde > current_date then return; end if;
  update public.vendas_mobile_pedidos set empresa_id = v_destino.empresa_id
    where conta_id = p_conta_id and empresa_id is null and (criado_em at time zone 'America/Sao_Paulo')::date >= v_destino.vigente_desde;
  update public.vendas_mobile_pagamentos set empresa_id = v_destino.empresa_id
    where conta_id = p_conta_id and empresa_id is null and data_pagamento >= v_destino.vigente_desde;
  perform public.sincronizar_receita_vendas_mobile_conta(p_conta_id, v_destino.empresa_id);
  update public.vendas_mobile_contas_perfis_financeiros set empresa_anterior_id = null, acao_historico_anterior = 'manter', atualizado_em = now() where conta_id = p_conta_id;
end;
$$;

create or replace function public.preencher_empresa_lancamento_vendas_mobile()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_data date;
begin
  perform public.aplicar_troca_financeira_pendente_conta_vendas_mobile(new.conta_id);
  v_data := case when tg_table_name = 'vendas_mobile_pagamentos' then coalesce(new.data_pagamento, current_date)
                 else coalesce((new.criado_em at time zone 'America/Sao_Paulo')::date, current_date) end;
  if new.empresa_id is null then
    new.empresa_id := public.empresa_financeira_efetiva_conta_vendas_mobile(new.conta_id, new.user_id, v_data);
  end if;
  return new;
end;
$$;

create or replace function public.disparar_sincronizacao_receita_vendas_mobile()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_conta uuid; v_usuario uuid; v_empresa uuid;
begin
  if current_setting('app.vendas_mobile_transferencia', true) = '1' then return coalesce(new, old); end if;
  for v_conta, v_usuario, v_empresa in
    select distinct origem.conta_id, origem.user_id, origem.empresa_id
    from (values
      (case when tg_op = 'INSERT' then null else old.conta_id end, case when tg_op = 'INSERT' then null else old.user_id end, case when tg_op = 'INSERT' then null else old.empresa_id end),
      (case when tg_op = 'DELETE' then null else new.conta_id end, case when tg_op = 'DELETE' then null else new.user_id end, case when tg_op = 'DELETE' then null else new.empresa_id end)
    ) as origem(conta_id, user_id, empresa_id)
    where origem.empresa_id is not null
  loop
    if exists (select 1 from public.vendas_mobile_contas_perfis_financeiros p where p.conta_id = v_conta and (p.empresa_id = v_empresa or p.empresa_anterior_id = v_empresa)) then
      perform public.sincronizar_receita_vendas_mobile_conta(v_conta, v_empresa);
    elsif public.vendas_mobile_conta_inicial_do_usuario(v_conta, v_usuario) then
      perform public.sincronizar_receita_vendas_mobile_usuario(v_usuario, v_empresa);
    end if;
  end loop;
  return coalesce(new, old);
end;
$$;

create or replace function public.definir_perfil_financeiro_vendas_mobile_rpc(
  p_conta_id uuid, p_empresa_id uuid, p_periodo text default 'todo_historico', p_historico_anterior text default 'manter'
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_atual uuid; v_inicio date; v_pendente boolean := false; v_legado boolean := false;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if p_conta_id is null or not public.vendas_mobile_pode_gerir_conta(p_conta_id) then raise exception 'Somente o proprietário ou administrador pode definir o destino financeiro desta conta.'; end if;
  if p_periodo not in ('todo_historico','mes_atual','mes_seguinte') or p_historico_anterior not in ('manter','apagar') then raise exception 'Opção financeira inválida.'; end if;
  if not exists (select 1 from public.usuarios_empresa a where a.user_id = auth.uid() and a.empresa_id = p_empresa_id and a.status = 'ativo' and a.perfil in ('gestor_master','administrador')) then raise exception 'Você não possui permissão financeira neste perfil.'; end if;
  perform public.aplicar_troca_financeira_pendente_conta_vendas_mobile(p_conta_id);
  v_atual := public.empresa_financeira_conta_vendas_mobile(p_conta_id, current_date);
  if v_atual is null then
    v_atual := public.empresa_financeira_efetiva_conta_vendas_mobile(p_conta_id, auth.uid(), current_date);
    v_legado := v_atual is not null;
  end if;
  if v_atual = p_empresa_id and v_legado then
    return jsonb_build_object('empresa_id', p_empresa_id, 'empresa_ativa_id', p_empresa_id, 'vigente_desde', date '0001-01-01', 'troca_pendente', false);
  end if;
  v_inicio := case when v_atual is null or p_periodo = 'todo_historico' then date '0001-01-01'
                    when p_periodo = 'mes_atual' then date_trunc('month', current_date)::date
                    else (date_trunc('month', current_date) + interval '1 month')::date end;
  if v_atual is not null and v_inicio > current_date then
    insert into public.vendas_mobile_contas_perfis_financeiros(conta_id,empresa_id,empresa_anterior_id,vigente_desde,acao_historico_anterior,atualizado_por)
    values(p_conta_id,p_empresa_id,v_atual,v_inicio,p_historico_anterior,auth.uid())
    on conflict(conta_id) do update set empresa_id=excluded.empresa_id,empresa_anterior_id=excluded.empresa_anterior_id,vigente_desde=excluded.vigente_desde,acao_historico_anterior=excluded.acao_historico_anterior,atualizado_por=excluded.atualizado_por,atualizado_em=now();
    v_pendente := true;
  else
    if v_atual is not null then
      perform set_config('app.vendas_mobile_transferencia','1',true);
      perform public.desvincular_receitas_vendas_mobile_conta(p_conta_id,v_atual,p_historico_anterior='apagar');
      update public.vendas_mobile_pedidos set empresa_id=null where conta_id=p_conta_id and empresa_id=v_atual;
      update public.vendas_mobile_pagamentos set empresa_id=null where conta_id=p_conta_id and empresa_id=v_atual;
      perform set_config('app.vendas_mobile_transferencia','0',true);
      if v_legado then perform public.sincronizar_receita_vendas_mobile_usuario(auth.uid(),v_atual); end if;
    end if;
    update public.vendas_mobile_pedidos set empresa_id=p_empresa_id where conta_id=p_conta_id and empresa_id is null and (criado_em at time zone 'America/Sao_Paulo')::date >= v_inicio;
    update public.vendas_mobile_pagamentos set empresa_id=p_empresa_id where conta_id=p_conta_id and empresa_id is null and data_pagamento >= v_inicio;
    insert into public.vendas_mobile_contas_perfis_financeiros(conta_id,empresa_id,vigente_desde,acao_historico_anterior,atualizado_por)
    values(p_conta_id,p_empresa_id,v_inicio,'manter',auth.uid())
    on conflict(conta_id) do update set empresa_id=excluded.empresa_id,empresa_anterior_id=null,vigente_desde=excluded.vigente_desde,acao_historico_anterior='manter',atualizado_por=excluded.atualizado_por,atualizado_em=now();
    perform public.sincronizar_receita_vendas_mobile_conta(p_conta_id,p_empresa_id);
  end if;
  return jsonb_build_object('empresa_id',p_empresa_id,'empresa_ativa_id',case when v_pendente then v_atual else p_empresa_id end,'vigente_desde',v_inicio,'troca_pendente',v_pendente);
end;
$$;

create or replace function public.obter_integracao_gestao_vendas_mobile_rpc(p_conta_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_destino public.vendas_mobile_contas_perfis_financeiros; v_empresa_id uuid; v_base text; v_legado boolean := false;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if p_conta_id is null or not public.vendas_mobile_pode_ler_conta(p_conta_id) then raise exception 'Conta de vendas inválida ou sem permissão.'; end if;
  perform public.aplicar_troca_financeira_pendente_conta_vendas_mobile(p_conta_id);
  select * into v_destino from public.vendas_mobile_contas_perfis_financeiros where conta_id=p_conta_id;
  v_empresa_id := public.empresa_financeira_conta_vendas_mobile(p_conta_id,current_date);
  if v_empresa_id is null then v_empresa_id:=public.empresa_financeira_efetiva_conta_vendas_mobile(p_conta_id,auth.uid(),current_date); v_legado:=v_empresa_id is not null; end if;
  if v_empresa_id is null then return jsonb_build_object('base_receita','recebidos','pode_configurar',false,'vinculado',false,'troca_pendente',false); end if;
  if not v_legado then perform public.sincronizar_receita_vendas_mobile_conta(p_conta_id,v_empresa_id); end if;
  if v_legado then select base_receita into v_base from public.vendas_mobile_integracao_gestao where empresa_id=v_empresa_id;
  else select base_receita into v_base from public.vendas_mobile_contas_integracao_gestao where conta_id=p_conta_id; end if;
  return jsonb_build_object('base_receita',coalesce(v_base,'recebidos'),'pode_configurar',exists(select 1 from public.usuarios_empresa a where a.user_id=auth.uid() and a.empresa_id=v_empresa_id and a.status='ativo' and a.perfil in ('gestor_master','administrador')),'vinculado',true,'empresa_id',v_empresa_id,'troca_pendente',coalesce(v_destino.empresa_anterior_id is not null,false),'proxima_empresa_id',case when v_destino.empresa_anterior_id is not null then v_destino.empresa_id else null end,'vigente_desde',coalesce(v_destino.vigente_desde,date '0001-01-01'),'acao_historico_anterior',coalesce(v_destino.acao_historico_anterior,'manter'));
end;
$$;

create or replace function public.configurar_integracao_gestao_vendas_mobile_rpc(p_conta_id uuid, p_base_receita text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_empresa_id uuid; v_legado boolean := false;
begin
  if auth.uid() is null or p_conta_id is null or not public.vendas_mobile_pode_gerir_conta(p_conta_id) then raise exception 'Sem permissão para configurar esta conta.'; end if;
  if p_base_receita not in ('recebidos','vendidos') then raise exception 'Base de receita inválida.'; end if;
  v_empresa_id:=public.empresa_financeira_conta_vendas_mobile(p_conta_id,current_date);
  if v_empresa_id is null then
    v_empresa_id:=public.empresa_financeira_efetiva_conta_vendas_mobile(p_conta_id,auth.uid(),current_date);
    v_legado:=v_empresa_id is not null;
  end if;
  if v_empresa_id is null then raise exception 'Defina um perfil financeiro desta conta antes de ativar a integração.'; end if;
  if v_legado then
    insert into public.vendas_mobile_integracao_gestao(empresa_id,base_receita,atualizado_por) values(v_empresa_id,p_base_receita,auth.uid())
    on conflict(empresa_id) do update set base_receita=excluded.base_receita,atualizado_por=excluded.atualizado_por,atualizado_em=now();
    perform public.sincronizar_receita_vendas_mobile_usuario(auth.uid(),v_empresa_id);
    return jsonb_build_object('base_receita',p_base_receita,'pode_configurar',true,'vinculado',true,'empresa_id',v_empresa_id);
  end if;
  insert into public.vendas_mobile_contas_integracao_gestao(conta_id,base_receita,atualizado_por) values(p_conta_id,p_base_receita,auth.uid())
  on conflict(conta_id) do update set base_receita=excluded.base_receita,atualizado_por=excluded.atualizado_por,atualizado_em=now();
  perform public.sincronizar_receita_vendas_mobile_conta(p_conta_id,v_empresa_id);
  return jsonb_build_object('base_receita',p_base_receita,'pode_configurar',true,'vinculado',true,'empresa_id',v_empresa_id);
end;
$$;

create or replace function public.desvincular_perfil_financeiro_vendas_mobile_rpc(p_conta_id uuid, p_historico_anterior text default 'manter')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_empresa_id uuid;
begin
  if auth.uid() is null or p_conta_id is null or not public.vendas_mobile_pode_gerir_conta(p_conta_id) then raise exception 'Sem permissão para desvincular esta conta.'; end if;
  if p_historico_anterior not in ('manter','apagar') then raise exception 'Destino do histórico anterior inválido.'; end if;
  v_empresa_id:=public.empresa_financeira_conta_vendas_mobile(p_conta_id,current_date);
  if v_empresa_id is null then raise exception 'Esta conta ainda não possui um vínculo financeiro próprio.'; end if;
  perform public.desvincular_receitas_vendas_mobile_conta(p_conta_id,v_empresa_id,p_historico_anterior='apagar');
  perform set_config('app.vendas_mobile_transferencia','1',true);
  update public.vendas_mobile_pedidos set empresa_id=null where conta_id=p_conta_id and empresa_id=v_empresa_id;
  update public.vendas_mobile_pagamentos set empresa_id=null where conta_id=p_conta_id and empresa_id=v_empresa_id;
  delete from public.vendas_mobile_contas_perfis_financeiros where conta_id=p_conta_id;
  delete from public.vendas_mobile_contas_integracao_gestao where conta_id=p_conta_id;
  perform set_config('app.vendas_mobile_transferencia','0',true);
  return jsonb_build_object('desvinculado',true);
end;
$$;

revoke all on function public.definir_perfil_financeiro_vendas_mobile_rpc(uuid,uuid,text,text) from public;
revoke all on function public.obter_integracao_gestao_vendas_mobile_rpc(uuid) from public;
revoke all on function public.configurar_integracao_gestao_vendas_mobile_rpc(uuid,text) from public;
revoke all on function public.desvincular_perfil_financeiro_vendas_mobile_rpc(uuid,text) from public;
grant execute on function public.definir_perfil_financeiro_vendas_mobile_rpc(uuid,uuid,text,text) to authenticated;
grant execute on function public.obter_integracao_gestao_vendas_mobile_rpc(uuid) to authenticated;
grant execute on function public.configurar_integracao_gestao_vendas_mobile_rpc(uuid,text) to authenticated;
grant execute on function public.desvincular_perfil_financeiro_vendas_mobile_rpc(uuid,text) to authenticated;
