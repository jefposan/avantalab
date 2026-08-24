-- O saldo do estoque deve acompanhar o ciclo completo do pedido. A diferença
-- entre a versão anterior e a nova é aplicada na mesma transação da gravação,
-- evitando abatimento duplicado em reenvios, edições e conversões de consignado.

create or replace function public.aplicar_delta_estoque_pedido_vendas_mobile(
  p_conta_id uuid,
  p_pedido_id uuid,
  p_quantidades_anteriores jsonb,
  p_quantidades_novas jsonb,
  p_data date,
  p_consignado boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_produto public.vendas_mobile_produtos%rowtype;
  v_anterior numeric(12,3);
  v_final numeric(12,3);
  v_tipo text;
  v_atualizados jsonb := '[]'::jsonb;
begin
  for v_item in
    with quantidades as (
      select chave, sum(quantidade_anterior) as quantidade_anterior, sum(quantidade_nova) as quantidade_nova
      from (
        select key as chave, value::numeric as quantidade_anterior, 0::numeric as quantidade_nova
          from jsonb_each_text(coalesce(p_quantidades_anteriores, '{}'::jsonb))
        union all
        select key as chave, 0::numeric as quantidade_anterior, value::numeric as quantidade_nova
          from jsonb_each_text(coalesce(p_quantidades_novas, '{}'::jsonb))
      ) origem
      group by chave
    )
    select chave::uuid as produto_id,
           quantidade_nova - quantidade_anterior as quantidade_consumida
      from quantidades
     where abs(quantidade_nova - quantidade_anterior) > 0.0005
     order by chave
  loop
    select * into v_produto
      from public.vendas_mobile_produtos
     where id = v_item.produto_id
       and conta_id = p_conta_id
     for update;

    -- Produtos sem controle continuam vendáveis, mas não aparecem como saldo
    -- acompanhado. Itens antigos sem produto_id também são preservados.
    if v_produto.id is null or not v_produto.estoque_controlado then
      continue;
    end if;

    v_anterior := coalesce(v_produto.estoque, 0);
    v_final := v_anterior - v_item.quantidade_consumida;
    v_tipo := case
      when v_item.quantidade_consumida > 0 and p_consignado then 'consignacao'
      when v_item.quantidade_consumida > 0 then 'venda'
      when p_consignado then 'retorno_consignacao'
      else 'cancelamento'
    end;

    update public.vendas_mobile_produtos
       set estoque = v_final,
           atualizado_em = now()
     where id = v_produto.id
       and conta_id = p_conta_id;

    insert into public.vendas_mobile_estoque_movimentos (
      user_id, conta_id, produto_id, tipo, quantidade, saldo_anterior,
      saldo_final, observacao, data_movimentacao
    ) values (
      auth.uid(), p_conta_id, v_produto.id, v_tipo,
      -v_item.quantidade_consumida, v_anterior, v_final,
      concat('Movimentação automática do pedido ', p_pedido_id::text),
      coalesce(p_data, (now() at time zone 'America/Sao_Paulo')::date)
    );

    v_atualizados := v_atualizados || jsonb_build_array(jsonb_build_object(
      'produto_id', v_produto.id,
      'estoque', v_final
    ));
  end loop;

  return v_atualizados;
end;
$$;

revoke all on function public.aplicar_delta_estoque_pedido_vendas_mobile(uuid, uuid, jsonb, jsonb, date, boolean) from public, anon, authenticated;

create or replace function public.salvar_pedido_vendas_mobile_rpc(
  p_pedido jsonb,
  p_itens jsonb,
  p_novo boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_conta_id uuid;
  v_cliente_id uuid;
  v_pedido_id uuid;
  v_pedido public.vendas_mobile_pedidos%rowtype;
  v_encontrado boolean := false;
  v_quantidades_anteriores jsonb := '{}'::jsonb;
  v_quantidades_novas jsonb := '{}'::jsonb;
  v_estoques_atualizados jsonb := '[]'::jsonb;
  v_uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
begin
  if v_user_id is null then raise exception 'Sessão expirada.'; end if;
  if jsonb_typeof(coalesce(p_itens, '[]'::jsonb)) <> 'array' then
    raise exception 'A lista de itens do pedido é inválida.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) item
     where coalesce((item ->> 'quantidade')::numeric, 0) <= 0
  ) then
    raise exception 'Todos os itens do pedido precisam ter quantidade maior que zero.';
  end if;
  if coalesce(p_pedido ->> 'conta_id', '') !~* v_uuid_pattern then
    raise exception 'Selecione uma conta de vendas válida.';
  end if;
  v_conta_id := (p_pedido ->> 'conta_id')::uuid;
  if not public.vendas_mobile_pode_operar_conta(v_conta_id) then
    raise exception 'Você não possui permissão para lançar pedidos nesta conta.';
  end if;

  if coalesce(p_pedido ->> 'cliente_id', '') ~* v_uuid_pattern then
    v_cliente_id := (p_pedido ->> 'cliente_id')::uuid;
    if not exists (
      select 1 from public.vendas_mobile_clientes cliente
       where cliente.id = v_cliente_id and cliente.conta_id = v_conta_id
    ) then
      raise exception 'A cliente selecionada não pertence à conta de vendas ativa.';
    end if;
  end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) item
     where coalesce(item ->> 'produto_id', '') ~* v_uuid_pattern
       and not exists (
         select 1 from public.vendas_mobile_produtos produto
          where produto.id = (item ->> 'produto_id')::uuid
            and produto.conta_id = v_conta_id
       )
  ) then
    raise exception 'Um produto do pedido não pertence à conta de vendas ativa.';
  end if;

  if coalesce(p_pedido ->> 'id', '') ~* v_uuid_pattern then
    v_pedido_id := (p_pedido ->> 'id')::uuid;
  elsif p_novo then
    v_pedido_id := gen_random_uuid();
  else
    raise exception 'O identificador do pedido é inválido.';
  end if;

  select * into v_pedido
    from public.vendas_mobile_pedidos
   where id = v_pedido_id and conta_id = v_conta_id
   for update;
  v_encontrado := found;

  if v_encontrado and lower(coalesce(v_pedido.status, '')) <> 'cancelada' then
    select coalesce(jsonb_object_agg(resumo.produto_id::text, resumo.quantidade), '{}'::jsonb)
      into v_quantidades_anteriores
      from (
        select produto_id, sum(quantidade) as quantidade
          from public.vendas_mobile_pedido_itens
         where pedido_id = v_pedido.id and produto_id is not null
         group by produto_id
      ) resumo;
  end if;

  if v_encontrado then
    update public.vendas_mobile_pedidos
       set cliente_id = v_cliente_id,
           status = coalesce(nullif(p_pedido ->> 'status', ''), 'concluida'),
           subtotal = coalesce((p_pedido ->> 'subtotal')::numeric, 0),
           desconto = coalesce((p_pedido ->> 'desconto')::numeric, 0),
           total = coalesce((p_pedido ->> 'total')::numeric, 0),
           forma_pagamento = nullif(p_pedido ->> 'forma_pagamento', ''),
           observacoes = nullif(p_pedido ->> 'observacoes', ''),
           criado_em = coalesce((p_pedido ->> 'criado_em')::timestamptz, criado_em),
           atualizado_em = now()
     where id = v_pedido_id and conta_id = v_conta_id
    returning * into v_pedido;
    delete from public.vendas_mobile_pedido_itens where pedido_id = v_pedido.id;
  elsif p_novo then
    insert into public.vendas_mobile_pedidos (
      id, user_id, conta_id, cliente_id, status, subtotal, desconto, total,
      forma_pagamento, observacoes, criado_em, atualizado_em
    ) values (
      v_pedido_id, v_user_id, v_conta_id, v_cliente_id,
      coalesce(nullif(p_pedido ->> 'status', ''), 'concluida'),
      coalesce((p_pedido ->> 'subtotal')::numeric, 0),
      coalesce((p_pedido ->> 'desconto')::numeric, 0),
      coalesce((p_pedido ->> 'total')::numeric, 0),
      nullif(p_pedido ->> 'forma_pagamento', ''),
      nullif(p_pedido ->> 'observacoes', ''),
      coalesce((p_pedido ->> 'criado_em')::timestamptz, now()), now()
    ) returning * into v_pedido;
  else
    raise exception 'Pedido não encontrado nesta conta ou sem permissão para alteração.';
  end if;

  insert into public.vendas_mobile_pedido_itens (
    pedido_id, produto_id, produto_nome, produto_sku, quantidade,
    preco_unitario, preco_custo, desconto, total
  )
  select
    v_pedido.id,
    case when coalesce(item ->> 'produto_id', '') ~* v_uuid_pattern then (item ->> 'produto_id')::uuid else null end,
    coalesce(nullif(item ->> 'produto_nome', ''), 'Produto'),
    nullif(item ->> 'produto_sku', ''),
    coalesce((item ->> 'quantidade')::numeric, 1),
    coalesce((item ->> 'preco_unitario')::numeric, 0),
    case when item ? 'preco_custo' and item ->> 'preco_custo' is not null then (item ->> 'preco_custo')::numeric else null end,
    coalesce((item ->> 'desconto')::numeric, 0),
    coalesce((item ->> 'total')::numeric, 0)
  from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) item;

  if lower(coalesce(v_pedido.status, '')) <> 'cancelada' then
    select coalesce(jsonb_object_agg(resumo.produto_id::text, resumo.quantidade), '{}'::jsonb)
      into v_quantidades_novas
      from (
        select produto_id, sum(quantidade) as quantidade
          from public.vendas_mobile_pedido_itens
         where pedido_id = v_pedido.id and produto_id is not null
         group by produto_id
      ) resumo;
  end if;

  v_estoques_atualizados := public.aplicar_delta_estoque_pedido_vendas_mobile(
    v_conta_id,
    v_pedido.id,
    v_quantidades_anteriores,
    v_quantidades_novas,
    (v_pedido.criado_em at time zone 'America/Sao_Paulo')::date,
    lower(coalesce(v_pedido.forma_pagamento, '')) like '%consign%'
  );

  -- Em um reenvio idempotente a diferença é zero, mas o aparelho ainda recebe
  -- o saldo corrente para sair de um eventual estado local desatualizado.
  select coalesce(jsonb_agg(jsonb_build_object(
    'produto_id', produto.id,
    'estoque', coalesce(produto.estoque, 0)
  ) order by produto.id), '[]'::jsonb)
    into v_estoques_atualizados
    from public.vendas_mobile_produtos produto
   where produto.conta_id = v_conta_id
     and produto.estoque_controlado = true
     and produto.id in (
       select key::uuid from jsonb_each_text(v_quantidades_anteriores)
       union
       select key::uuid from jsonb_each_text(v_quantidades_novas)
     );

  return to_jsonb(v_pedido) || jsonb_build_object(
    'itens', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.criado_em, item.id)
        from public.vendas_mobile_pedido_itens item
       where item.pedido_id = v_pedido.id
    ), '[]'::jsonb),
    'estoques_atualizados', v_estoques_atualizados
  );
end;
$$;

revoke all on function public.salvar_pedido_vendas_mobile_rpc(jsonb, jsonb, boolean) from public, anon;
grant execute on function public.salvar_pedido_vendas_mobile_rpc(jsonb, jsonb, boolean) to authenticated;

create or replace function public.excluir_pedido_vendas_mobile_rpc(
  p_conta_id uuid,
  p_pedido_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.vendas_mobile_pedidos%rowtype;
  v_quantidades jsonb := '{}'::jsonb;
  v_estoques_atualizados jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if p_conta_id is null or not public.vendas_mobile_pode_operar_conta(p_conta_id) then
    raise exception 'Conta de vendas inválida ou sem permissão.';
  end if;

  select * into v_pedido
    from public.vendas_mobile_pedidos
   where id = p_pedido_id and conta_id = p_conta_id
   for update;

  -- Exclusão idempotente: um reenvio confirmado não altera o estoque de novo.
  if not found then
    return jsonb_build_object('pedido_id', p_pedido_id, 'estoques_atualizados', '[]'::jsonb);
  end if;

  if lower(coalesce(v_pedido.status, '')) <> 'cancelada' then
    select coalesce(jsonb_object_agg(resumo.produto_id::text, resumo.quantidade), '{}'::jsonb)
      into v_quantidades
      from (
        select produto_id, sum(quantidade) as quantidade
          from public.vendas_mobile_pedido_itens
         where pedido_id = v_pedido.id and produto_id is not null
         group by produto_id
      ) resumo;
  end if;

  v_estoques_atualizados := public.aplicar_delta_estoque_pedido_vendas_mobile(
    p_conta_id,
    v_pedido.id,
    v_quantidades,
    '{}'::jsonb,
    (now() at time zone 'America/Sao_Paulo')::date,
    lower(coalesce(v_pedido.forma_pagamento, '')) like '%consign%'
  );

  delete from public.vendas_mobile_pedidos
   where id = v_pedido.id and conta_id = p_conta_id;

  return jsonb_build_object(
    'pedido_id', v_pedido.id,
    'estoques_atualizados', v_estoques_atualizados
  );
end;
$$;

revoke all on function public.excluir_pedido_vendas_mobile_rpc(uuid, uuid) from public, anon;
grant execute on function public.excluir_pedido_vendas_mobile_rpc(uuid, uuid) to authenticated;

-- Corrige uma única vez as saídas já registradas depois do início do controle
-- de cada produto. Um ajuste físico posterior funciona como novo marco e evita
-- descontar novamente vendas que já estavam contempladas naquela contagem.
create temporary table vendas_mobile_estoque_reconciliacao on commit drop as
with referencias as (
  select
    produto.id as produto_id,
    produto.user_id,
    produto.conta_id,
    coalesce(
      max(movimento.criado_em) filter (where movimento.tipo = 'ajuste'),
      min(movimento.criado_em) filter (where movimento.tipo = 'entrada'),
      produto.criado_em
    ) as iniciado_em
  from public.vendas_mobile_produtos produto
  left join public.vendas_mobile_estoque_movimentos movimento
    on movimento.produto_id = produto.id
   and movimento.tipo in ('entrada', 'ajuste')
  where produto.estoque_controlado = true
  group by produto.id, produto.user_id, produto.conta_id, produto.criado_em
), consumos as (
  select
    referencia.produto_id,
    referencia.user_id,
    referencia.conta_id,
    sum(item.quantidade)::numeric(12,3) as quantidade
  from referencias referencia
  join public.vendas_mobile_pedido_itens item
    on item.produto_id = referencia.produto_id
  join public.vendas_mobile_pedidos pedido
    on pedido.id = item.pedido_id
   and pedido.conta_id = referencia.conta_id
  where lower(coalesce(pedido.status, '')) <> 'cancelada'
    and (
      (pedido.criado_em at time zone 'America/Sao_Paulo')::date
        > (referencia.iniciado_em at time zone 'America/Sao_Paulo')::date
      or (
        (pedido.criado_em at time zone 'America/Sao_Paulo')::date
          = (referencia.iniciado_em at time zone 'America/Sao_Paulo')::date
        and pedido.atualizado_em > referencia.iniciado_em
      )
    )
  group by referencia.produto_id, referencia.user_id, referencia.conta_id
)
select
  consumo.produto_id,
  consumo.user_id,
  consumo.conta_id,
  consumo.quantidade,
  coalesce(produto.estoque, 0)::numeric(12,3) as saldo_anterior,
  (coalesce(produto.estoque, 0) - consumo.quantidade)::numeric(12,3) as saldo_final
from consumos consumo
join public.vendas_mobile_produtos produto on produto.id = consumo.produto_id
where consumo.quantidade > 0;

update public.vendas_mobile_produtos produto
   set estoque = reconciliacao.saldo_final,
       atualizado_em = now()
  from vendas_mobile_estoque_reconciliacao reconciliacao
 where produto.id = reconciliacao.produto_id
   and produto.conta_id = reconciliacao.conta_id;

insert into public.vendas_mobile_estoque_movimentos (
  user_id, conta_id, produto_id, tipo, quantidade, saldo_anterior,
  saldo_final, observacao, data_movimentacao
)
select
  user_id, conta_id, produto_id, 'venda', -quantidade, saldo_anterior,
  saldo_final, 'Reconciliação automática das saídas registradas após o início do controle de estoque.',
  (now() at time zone 'America/Sao_Paulo')::date
from vendas_mobile_estoque_reconciliacao;

notify pgrst, 'reload schema';
