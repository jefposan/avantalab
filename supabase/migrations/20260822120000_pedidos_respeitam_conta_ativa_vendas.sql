-- Pedidos do AvantaVendas pertencem sempre à conta ativa que os enviou.
-- A rotina idempotente anterior continuava inserindo sem conta_id e o gatilho
-- de compatibilidade escolhia a primeira conta criada pelo usuário.

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
  v_uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
begin
  if v_user_id is null then
    raise exception 'Sessão expirada.';
  end if;
  if jsonb_typeof(coalesce(p_itens, '[]'::jsonb)) <> 'array' then
    raise exception 'A lista de itens do pedido é inválida.';
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
    select 1 from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) as item
    where coalesce(item ->> 'produto_id', '') ~* v_uuid_pattern
      and not exists (
        select 1 from public.vendas_mobile_produtos produto
        where produto.id = (item ->> 'produto_id')::uuid and produto.conta_id = v_conta_id
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
   where id = v_pedido_id and conta_id = v_conta_id;

  if found then
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
  from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) as item;

  return to_jsonb(v_pedido) || jsonb_build_object(
    'itens', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.criado_em, item.id)
      from public.vendas_mobile_pedido_itens item where item.pedido_id = v_pedido.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.salvar_pedido_vendas_mobile_rpc(jsonb, jsonb, boolean) from public;
grant execute on function public.salvar_pedido_vendas_mobile_rpc(jsonb, jsonb, boolean) to authenticated;

-- Repara somente lançamentos estruturalmente incorretos, em que cliente e
-- lançamento ficaram vinculados a contas diferentes. Sem recalcular receitas.
select set_config('app.vendas_mobile_transferencia', '1', true);

update public.vendas_mobile_pedidos pedido
   set conta_id = cliente.conta_id, atualizado_em = now()
  from public.vendas_mobile_clientes cliente
 where pedido.cliente_id = cliente.id
   and pedido.conta_id is distinct from cliente.conta_id;

update public.vendas_mobile_pagamentos pagamento
   set conta_id = cliente.conta_id, atualizado_em = now()
  from public.vendas_mobile_clientes cliente
 where pagamento.cliente_id = cliente.id
   and pagamento.conta_id is distinct from cliente.conta_id;

select set_config('app.vendas_mobile_transferencia', '0', true);
