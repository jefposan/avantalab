-- Aditiva: não modifica lançamentos, parcelas ou totais já registrados.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Correlação permite conciliar uma resposta perdida com uma leitura/Realtime,
-- sem apresentar a mesma inclusão como registro local e remoto simultaneamente.
alter table public.lancamentos add column operacao_mobile_id uuid, add column operacao_mobile_indice integer;
alter table public.faturamentos_entradas add column operacao_mobile_id uuid, add column operacao_mobile_indice integer;
create unique index lancamentos_operacao_mobile_uidx on public.lancamentos(operacao_mobile_id,operacao_mobile_indice) where operacao_mobile_id is not null;
create unique index entradas_operacao_mobile_uidx on public.faturamentos_entradas(operacao_mobile_id,operacao_mobile_indice) where operacao_mobile_id is not null;

create function public.aplicar_movimento_financeiro_mobile_rpc(
  p_operacao_id uuid,p_empresa_id uuid,p_tipo text,p_acao text,p_dados jsonb,p_usuario_id uuid
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_recibo public.edicoes_financeiras_mobile%rowtype;
  v_pedido jsonb;
  v_despesa public.lancamentos%rowtype;
  v_receita public.faturamentos_entradas%rowtype;
  v_registros jsonb := '[]';
  v_originais jsonb := '[]';
  v_item jsonb;
  v_ano integer;
  v_indice integer;
  v_dia integer;
  v_data date;
  v_valor numeric;
  v_total integer;
  v_p integer;
  v_meses text[] := array['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
  v_nome text;
  v_descricao text;
  v_futuro boolean;
begin
  if auth.uid() is null or auth.uid() is distinct from p_usuario_id
    or not public.usuario_area_liberada(p_empresa_id,'dashboard')
    or not public.avantalab_sessao_perfil_permitida(p_empresa_id)
    or not exists(select 1 from public.usuarios_empresa where empresa_id=p_empresa_id and user_id=auth.uid()
      and status='ativo' and perfil is distinct from 'funcionario_ponto') then
    raise exception using errcode='42501',message='Acesso financeiro não autorizado.';
  end if;
  if p_operacao_id is null or p_tipo is null or p_tipo not in ('despesa','receita')
    or p_acao is null or p_acao not in ('incluir','excluir') or p_dados is null then
    raise exception using errcode='22023',message='Operação inválida.';
  end if;
  if p_tipo='despesa' and p_acao='incluir' and public.usuario_pode_inserir_lancamento(p_empresa_id) is distinct from true then
    raise exception using errcode='42501',message='Seu papel não permite incluir despesas.';
  end if;
  v_pedido := jsonb_build_object('acao',p_acao,'tipo',p_tipo,'dados',p_dados);
  insert into public.edicoes_financeiras_mobile(operacao_id,user_id,empresa_id,pedido)
    values(p_operacao_id,auth.uid(),p_empresa_id,v_pedido) on conflict do nothing;
  select * into v_recibo from public.edicoes_financeiras_mobile where operacao_id=p_operacao_id for update;
  if v_recibo.user_id<>auth.uid() or v_recibo.empresa_id<>p_empresa_id or v_recibo.pedido<>v_pedido then
    raise exception using errcode='22023',message='Identificador de envio já utilizado.';
  end if;
  if v_recibo.resultado is not null then return v_recibo.resultado; end if;
  -- Mesmo lock usado pelas edições: receita e total pertencem à mesma transação.
  perform pg_advisory_xact_lock(hashtextextended('edicao-financeira:'||p_empresa_id::text,0));
  if p_acao='incluir' then
    v_ano := (p_dados->>'ano')::integer;
    v_indice := array_position(v_meses,p_dados->>'mes');
    v_dia := (p_dados->>'dia')::integer;
    v_valor := (p_dados->>'valor')::numeric;
    v_total := coalesce((p_dados->>'parcelas')::integer,1);
    v_nome := btrim(case when p_tipo='receita' then p_dados->>'origem' else p_dados->>'despesa_nome' end);
    if v_ano is null or v_ano not between 1 and 9990 or v_indice is null or v_dia is null
      or v_valor is null or v_valor<=0 or v_valor<>round(v_valor,2) or v_valor>999999999999.99
      or v_nome is null or length(v_nome) not between 1 and 500
      or v_total not between 1 and 120 or (p_tipo='receita' and v_total<>1) then
      raise exception using errcode='22023',message='Dados do lançamento inválidos.';
    end if;
    perform make_date(v_ano,v_indice,v_dia);
    for v_p in 0..v_total-1 loop
      v_data := (make_date(v_ano,v_indice,1)+make_interval(months=>v_p))::date;
      v_data := v_data+least(v_dia,extract(day from (v_data+interval '1 month - 1 day'))::integer)-1;
      -- A situação escolhida no aparelho não é recalculada durante uma retomada
      -- offline no dia seguinte; o pedido inteiro é imutável/idempotente.
      v_futuro := coalesce((p_dados->>'prevista')::boolean,false) and v_total=1;
      if p_tipo='receita' then
        insert into public.faturamentos_entradas(empresa_id,ano,mes,dia,origem,valor,status,tipo_obs,criado_por,centro_custo_id,operacao_mobile_id,operacao_mobile_indice)
          values(p_empresa_id,extract(year from v_data)::integer,v_meses[extract(month from v_data)::integer],extract(day from v_data)::integer,
            v_nome,v_valor,case when v_futuro then 'prevista' end,case when v_futuro then 'previsto' end,auth.uid(),
            nullif(p_dados->>'centro_custo_id','')::uuid,p_operacao_id,v_p) returning * into v_receita;
        -- O trigger preenche o centro Principal quando ativo e recalcula o total.
        if v_receita.centro_custo_id is null and not v_futuro then
          insert into public.faturamentos(empresa_id,ano,mes,valor,referencia_total_mensal)
            values(p_empresa_id,v_receita.ano,v_receita.mes,v_valor,false)
            on conflict(empresa_id,ano,mes) do update set valor=faturamentos.valor+v_valor,referencia_total_mensal=false;
        end if;
        v_registros := v_registros||jsonb_build_array(to_jsonb(v_receita));
      else
        v_descricao := coalesce(p_dados->>'descricao','');
        if v_total>1 then v_descricao := concat(nullif(v_descricao,''),case when v_descricao<>'' then ' ' else '' end,'(',v_p+1,'/',v_total,')'); end if;
        insert into public.lancamentos(empresa_id,ano,mes,dia,despesa_nome,descricao,valor,status,tipo_obs,centro_custo_id,operacao_mobile_id,operacao_mobile_indice)
          values(p_empresa_id,extract(year from v_data)::integer,v_meses[extract(month from v_data)::integer],extract(day from v_data)::integer,
            v_nome,v_descricao,v_valor,case when v_futuro then 'prevista' end,
            case when v_total>1 then 'parcela' when v_futuro then 'previsto' end,
            nullif(p_dados->>'centro_custo_id','')::uuid,p_operacao_id,v_p) returning * into v_despesa;
        v_registros := v_registros||jsonb_build_array(to_jsonb(v_despesa));
      end if;
    end loop;
  else
    if jsonb_typeof(p_dados->'registros') is distinct from 'array' then
      raise exception using errcode='22023',message='Selecione os lançamentos para excluir.';
    end if;
    if jsonb_array_length(p_dados->'registros') not between 1 and 120
      or (select count(distinct r->>'id') from jsonb_array_elements(p_dados->'registros') r)<>jsonb_array_length(p_dados->'registros') then
      raise exception using errcode='22023',message='Seleção de exclusão inválida.';
    end if;
    -- Trava/valida TODOS antes de excluir qualquer um; um conflito desfaz o grupo.
    for v_item in select r from jsonb_array_elements(p_dados->'registros') r order by r->>'id' loop
      if p_tipo='receita' then
        select * into v_receita from public.faturamentos_entradas where empresa_id=p_empresa_id and id=(v_item->>'id')::uuid for update;
        if not found then raise exception using errcode='P0002',message='Receita não encontrada.'; end if;
        if v_receita.revisao is distinct from (v_item->>'revisao')::integer then raise exception using errcode='40001',message='Receita alterada em outro dispositivo.'; end if;
        if v_receita.tipo_obs like 'vendas_mobile%' or v_receita.tipo_obs like 'recebimentos%' then raise exception using errcode='42501',message='Receita sincronizada não permite exclusão manual.'; end if;
        v_originais := v_originais||jsonb_build_array(to_jsonb(v_receita));
      else
        select * into v_despesa from public.lancamentos where empresa_id=p_empresa_id and id=(v_item->>'id')::bigint for update;
        if not found then raise exception using errcode='P0002',message='Despesa não encontrada.'; end if;
        if v_despesa.revisao is distinct from (v_item->>'revisao')::integer then raise exception using errcode='40001',message='Despesa alterada em outro dispositivo.'; end if;
        if (case when v_despesa.tipo_obs='fixa' or v_despesa.recorrencia_id is not null
          then public.usuario_pode_editar_lancamento(p_empresa_id)
          else public.usuario_pode_excluir_lancamento(p_empresa_id) end) is distinct from true then
          raise exception using errcode='42501',message='Seu papel não permite excluir esta despesa.';
        end if;
        -- Aportes pertencem ao fluxo da Caixinha; não deixar movimentos órfãos.
        if exists(select 1 from public.caixinhas_movimentos where empresa_id=p_empresa_id and lancamento_id=v_despesa.id) then
          raise exception using errcode='22023',message='Exclua este aporte pela Caixinha.';
        end if;
        v_originais := v_originais||jsonb_build_array(to_jsonb(v_despesa));
      end if;
    end loop;
    for v_item in select r from jsonb_array_elements(v_originais) r loop
      if p_tipo='receita' then
        delete from public.faturamentos_entradas where empresa_id=p_empresa_id and id=(v_item->>'id')::uuid;
        if v_item->>'centro_custo_id' is null and v_item->>'status' is distinct from 'prevista' then
          update public.faturamentos set valor=greatest(0,valor-(v_item->>'valor')::numeric),referencia_total_mensal=false
            where empresa_id=p_empresa_id and ano=(v_item->>'ano')::integer and mes=v_item->>'mes';
        end if;
      elsif v_item->>'tipo_obs'='fixa' or v_item->>'recorrencia_id' is not null then
        update public.lancamentos set status='cancelada',nota_arquivo_path=null,updated_at=now()
          where empresa_id=p_empresa_id and id=(v_item->>'id')::bigint;
      else
        delete from public.lancamentos where empresa_id=p_empresa_id and id=(v_item->>'id')::bigint;
      end if;
    end loop;
  end if;
  v_pedido := jsonb_build_object('acao',p_acao,'tipo',p_tipo,'registros',v_registros,'originais',v_originais);
  update public.edicoes_financeiras_mobile set resultado=v_pedido where operacao_id=p_operacao_id;
  return v_pedido;
end;
$$;
revoke all on function public.aplicar_movimento_financeiro_mobile_rpc(uuid,uuid,text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.aplicar_movimento_financeiro_mobile_rpc(uuid,uuid,text,text,jsonb,uuid) to authenticated;

-- A fila de edição anterior também deve conservar a regra de papel usada
-- pelo UPDATE direto. Encapsula a implementação já instalada sem duplicá-la.
alter function public.aplicar_edicao_financeira_mobile_rpc(uuid,uuid,text,text,integer,jsonb,uuid)
  rename to aplicar_edicao_financeira_mobile_interna;
revoke all on function public.aplicar_edicao_financeira_mobile_interna(uuid,uuid,text,text,integer,jsonb,uuid) from public,anon,authenticated,service_role;
create function public.aplicar_edicao_financeira_mobile_rpc(
  p_operacao_id uuid,p_empresa_id uuid,p_tipo text,p_registro_id text,p_revisao integer,p_dados jsonb,p_usuario_id uuid
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_tipo in ('despesa','parcelamento') and public.usuario_pode_editar_lancamento(p_empresa_id) is distinct from true then
    raise exception using errcode='42501',message='Seu papel não permite editar despesas.';
  end if;
  return public.aplicar_edicao_financeira_mobile_interna(p_operacao_id,p_empresa_id,p_tipo,p_registro_id,p_revisao,p_dados,p_usuario_id);
end;
$$;
revoke all on function public.aplicar_edicao_financeira_mobile_rpc(uuid,uuid,text,text,integer,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.aplicar_edicao_financeira_mobile_rpc(uuid,uuid,text,text,integer,jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
