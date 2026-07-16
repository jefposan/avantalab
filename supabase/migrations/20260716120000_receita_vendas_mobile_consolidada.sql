-- Mantém uma única entrada consolidada do Vendas Mobile por perfil financeiro.
-- A entrada é recalculada com o total atual e recebe a data do dia da atualização.
create or replace function public.sincronizar_receita_vendas_mobile_gestao(
  p_empresa_id uuid,
  p_data date default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_base text;
  v_valor numeric(12,2) := 0;
  v_data_atual date := (now() at time zone 'America/Sao_Paulo')::date;
  v_ano integer;
  v_mes text;
  v_entrada record;
  v_nova_entrada_id uuid;
begin
  if p_empresa_id is null then return; end if;

  select base_receita into v_base
  from public.vendas_mobile_integracao_gestao
  where empresa_id = p_empresa_id;
  v_base := coalesce(v_base, 'recebidos');

  if v_base = 'recebidos' then
    select coalesce(sum(p.valor), 0) into v_valor
    from public.vendas_mobile_pagamentos p
    where p.empresa_id = p_empresa_id;
  else
    select coalesce(sum(p.total), 0) into v_valor
    from public.vendas_mobile_pedidos p
    where p.empresa_id = p_empresa_id
      and coalesce(lower(p.status), '') not in ('cancelada', 'convertida')
      and coalesce(lower(p.forma_pagamento), '') not like '%consign%'
      and coalesce(p.total, 0) > 0;
  end if;

  perform set_config('app.vendas_mobile_sync', '1', true);

  -- Remove as entradas diárias anteriores e desconta cada uma de seu mês de origem.
  for v_entrada in
    select e.id, e.ano, e.mes, e.valor
    from public.vendas_mobile_receitas_gestao r
    join public.faturamentos_entradas e on e.id = r.faturamento_entrada_id
    where r.empresa_id = p_empresa_id
  loop
    delete from public.faturamentos_entradas where id = v_entrada.id;
    insert into public.faturamentos (empresa_id, ano, mes, valor)
    values (p_empresa_id, v_entrada.ano, v_entrada.mes, greatest(0, -coalesce(v_entrada.valor, 0)))
    on conflict (empresa_id, ano, mes) do update
      set valor = greatest(0, public.faturamentos.valor - coalesce(v_entrada.valor, 0));
  end loop;

  if v_valor <= 0 then return; end if;

  v_ano := extract(year from v_data_atual);
  v_mes := (array['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'])[extract(month from v_data_atual)::integer];

  insert into public.faturamentos_entradas (empresa_id, ano, mes, dia, origem, valor, status, tipo_obs, criado_por)
  values (p_empresa_id, v_ano, v_mes, extract(day from v_data_atual)::integer, 'Vendas Mobile', v_valor, null, 'vendas_mobile_sistema', null)
  returning id into v_nova_entrada_id;

  insert into public.vendas_mobile_receitas_gestao (empresa_id, data_referencia, faturamento_entrada_id)
  values (p_empresa_id, v_data_atual, v_nova_entrada_id);

  insert into public.faturamentos (empresa_id, ano, mes, valor)
  values (p_empresa_id, v_ano, v_mes, v_valor)
  on conflict (empresa_id, ano, mes) do update
    set valor = public.faturamentos.valor + v_valor;
end;
$$;

create or replace function public.atualizar_receita_vendas_mobile_gestao_rpc(p_empresa_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not exists (
    select 1 from public.usuarios_empresa
    where user_id = auth.uid() and empresa_id = p_empresa_id and status = 'ativo'
  ) then
    raise exception 'Você não possui acesso a este perfil.';
  end if;
  perform public.sincronizar_receita_vendas_mobile_gestao(p_empresa_id, null);
  return jsonb_build_object('atualizado', true);
end;
$$;

create or replace function public.configurar_integracao_gestao_vendas_mobile_rpc(p_base_receita text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_empresa_id uuid;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if p_base_receita not in ('recebidos','vendidos') then raise exception 'Base de receita inválida.'; end if;
  v_empresa_id := public.empresa_financeira_vendas_mobile(auth.uid());
  if v_empresa_id is null or not public.vendas_mobile_pode_gerir_catalogo(v_empresa_id) then
    raise exception 'Defina um perfil financeiro que você gerencia.';
  end if;
  insert into public.vendas_mobile_integracao_gestao (empresa_id, base_receita, atualizado_por)
  values (v_empresa_id, p_base_receita, auth.uid())
  on conflict (empresa_id) do update set base_receita = excluded.base_receita, atualizado_em = now(), atualizado_por = excluded.atualizado_por;
  perform public.sincronizar_receita_vendas_mobile_gestao(v_empresa_id, null);
  return jsonb_build_object('base_receita', p_base_receita, 'pode_configurar', true);
end;
$$;

create or replace function public.obter_integracao_gestao_vendas_mobile_rpc()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_empresa_id uuid; v_base text; v_pode boolean;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  v_empresa_id := public.empresa_financeira_vendas_mobile(auth.uid());
  if v_empresa_id is null then return jsonb_build_object('base_receita','recebidos','pode_configurar',false); end if;
  perform public.sincronizar_receita_vendas_mobile_gestao(v_empresa_id, null);
  select base_receita into v_base from public.vendas_mobile_integracao_gestao where empresa_id = v_empresa_id;
  v_pode := public.vendas_mobile_pode_gerir_catalogo(v_empresa_id);
  return jsonb_build_object('base_receita', coalesce(v_base,'recebidos'), 'pode_configurar', coalesce(v_pode,false), 'empresa_id',v_empresa_id);
end;
$$;

revoke all on function public.atualizar_receita_vendas_mobile_gestao_rpc(uuid) from public;
grant execute on function public.atualizar_receita_vendas_mobile_gestao_rpc(uuid) to authenticated;

-- Converte o histórico diário de todas as empresas para a entrada única atual.
do $$
declare r record;
begin
  for r in select distinct empresa_id from public.vendas_mobile_receitas_gestao loop
    perform public.sincronizar_receita_vendas_mobile_gestao(r.empresa_id, null);
  end loop;
end;
$$;
