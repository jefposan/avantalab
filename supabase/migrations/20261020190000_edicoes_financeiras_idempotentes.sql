-- Somente estrutura/função: não altera lançamentos nem parcelas existentes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Recibo de entrega, não uma segunda fonte dos dados financeiros.
create table public.edicoes_financeiras_mobile (
  operacao_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  pedido jsonb not null,
  resultado jsonb,
  criado_em timestamptz not null default now()
);
alter table public.edicoes_financeiras_mobile enable row level security;
revoke all on public.edicoes_financeiras_mobile from public, anon, authenticated;
grant all on public.edicoes_financeiras_mobile to service_role;

create function public.aplicar_edicao_financeira_mobile_rpc(
  p_operacao_id uuid, p_empresa_id uuid, p_tipo text, p_registro_id text,
  p_revisao integer, p_dados jsonb, p_usuario_id uuid
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_pedido jsonb;
  v_recibo public.edicoes_financeiras_mobile%rowtype;
  v_despesa public.lancamentos%rowtype;
  v_receita public.faturamentos_entradas%rowtype;
  v_resultado jsonb;
  v_ano integer := (p_dados->>'ano')::integer;
  v_mes text := p_dados->>'mes';
  v_dia integer := (p_dados->>'dia')::integer;
  v_valor numeric := (p_dados->>'valor')::numeric;
  v_indice integer;
  v_diferenca numeric;
begin
  if auth.uid() is null or auth.uid() is distinct from p_usuario_id or not public.usuario_area_liberada(p_empresa_id, 'dashboard')
    or not public.avantalab_sessao_perfil_permitida(p_empresa_id)
    or not exists(select 1 from public.usuarios_empresa where empresa_id=p_empresa_id
      and user_id=auth.uid() and status='ativo' and perfil is distinct from 'funcionario_ponto') then
    raise exception using errcode='42501', message='Acesso financeiro não autorizado. Sua edição permanece pendente.';
  end if;
  if p_operacao_id is null or p_revisao is null or p_revisao < 1
    or p_tipo is null or p_tipo not in ('despesa','receita','parcelamento')
    or p_registro_id is null or v_ano is null or v_ano not between 1 and 9998
    or v_dia is null or v_dia not between 1 and 31 or v_valor is null or v_valor <= 0 then
    raise exception using errcode='22023', message='Dados da edição inválidos.';
  end if;
  v_indice := array_position(array['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'],v_mes);
  if v_indice is null then raise exception using errcode='22023', message='Mês inválido.'; end if;
  perform make_date(v_ano,v_indice,v_dia);
  if nullif(btrim(case when p_tipo='receita' then p_dados->>'origem' else p_dados->>'despesa_nome' end),'') is null then
    raise exception using errcode='22023', message='Informe o nome do lançamento.';
  end if;
  if p_dados->>'status' is not null and p_dados->>'status' not in ('prevista','confirmada','cancelada') then
    raise exception using errcode='22023', message='Situação inválida.';
  end if;
  v_pedido := jsonb_build_object('tipo',p_tipo,'registro',p_registro_id,'revisao',p_revisao,'dados',p_dados);
  insert into public.edicoes_financeiras_mobile(operacao_id,user_id,empresa_id,pedido)
    values(p_operacao_id,auth.uid(),p_empresa_id,v_pedido) on conflict do nothing;
  select * into v_recibo from public.edicoes_financeiras_mobile where operacao_id=p_operacao_id for update;
  if v_recibo.user_id <> auth.uid() or v_recibo.empresa_id <> p_empresa_id or v_recibo.pedido <> v_pedido then
    raise exception using errcode='22023', message='Identificador de envio já utilizado.';
  end if;
  if v_recibo.resultado is not null then return v_recibo.resultado; end if;

  -- Serializa também os totais de receitas sem centro de custo. Registro e
  -- total pertencem à mesma transação, inclusive na retomada após perda de rede.
  perform pg_advisory_xact_lock(hashtextextended('edicao-financeira:' || p_empresa_id::text,0));
  if p_tipo='receita' then
    select * into v_receita from public.faturamentos_entradas where empresa_id=p_empresa_id and id=p_registro_id::uuid for update;
    if not found then raise exception using errcode='P0002', message='Receita não encontrada.'; end if;
    if v_receita.revisao <> p_revisao then raise exception using errcode='40001', message='A receita foi alterada em outro dispositivo. Revise antes de reenviar.'; end if;
    if v_receita.tipo_obs like 'vendas_mobile%' or v_receita.tipo_obs like 'recebimentos%' then
      raise exception using errcode='42501', message='Receita sincronizada não permite edição manual.';
    end if;
    -- Edição comum permanece no período; confirmar previsão pode movê-la para hoje.
    if v_receita.status is distinct from 'prevista' and (v_receita.ano<>v_ano or v_receita.mes<>v_mes) then
      raise exception using errcode='22023', message='Esta edição não permite mudar o período da receita.';
    end if;
    if v_receita.centro_custo_id is null then
      v_diferenca := case when p_dados->>'status' is distinct from 'prevista' then v_valor else 0 end
        - case when v_receita.status is distinct from 'prevista' then v_receita.valor else 0 end;
      insert into public.faturamentos(empresa_id,ano,mes,valor) values(p_empresa_id,v_ano,v_mes,greatest(0,v_diferenca))
        on conflict(empresa_id,ano,mes) do update set valor=greatest(0,faturamentos.valor+v_diferenca);
    end if;
    update public.faturamentos_entradas set ano=v_ano,mes=v_mes,dia=v_dia,valor=v_valor,
      origem=p_dados->>'origem',status=p_dados->>'status',tipo_obs=p_dados->>'tipo_obs',updated_at=now()
      where id=v_receita.id and empresa_id=p_empresa_id returning * into v_receita;
    v_resultado := jsonb_build_object('registro',to_jsonb(v_receita));
  else
    select * into v_despesa from public.lancamentos where empresa_id=p_empresa_id and id=p_registro_id::bigint for update;
    if not found then raise exception using errcode='P0002', message='Despesa não encontrada.'; end if;
    if v_despesa.revisao <> p_revisao then raise exception using errcode='40001', message='A despesa foi alterada em outro dispositivo. Revise antes de reenviar.'; end if;
    if p_tipo='parcelamento' then
      perform public.reorganizar_parcelamento_despesa_rpc(p_empresa_id,v_despesa.id,v_ano,v_mes,v_dia,
        p_dados->>'despesa_nome',p_dados->>'descricao_base',v_valor,(p_dados->>'parcela_atual')::integer,(p_dados->>'total_parcelas')::integer);
      select * into v_despesa from public.lancamentos where id=v_despesa.id and empresa_id=p_empresa_id;
    else
      update public.lancamentos set ano=v_ano,mes=v_mes,dia=v_dia,valor=v_valor,
        despesa_nome=p_dados->>'despesa_nome',descricao=p_dados->>'descricao',
        status=p_dados->>'status',tipo_obs=p_dados->>'tipo_obs',updated_at=now()
        where id=v_despesa.id and empresa_id=p_empresa_id returning * into v_despesa;
    end if;
    v_resultado := jsonb_build_object('registro',to_jsonb(v_despesa));
  end if;
  update public.edicoes_financeiras_mobile set resultado=v_resultado where operacao_id=p_operacao_id;
  return v_resultado;
end;
$$;
revoke all on function public.aplicar_edicao_financeira_mobile_rpc(uuid,uuid,text,text,integer,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.aplicar_edicao_financeira_mobile_rpc(uuid,uuid,text,text,integer,jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
