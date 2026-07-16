-- Protege os dados operacionais do Vendas Mobile contra salvamentos parciais.
-- A edição de um pedido e de seus itens passa a ocorrer em uma única transação.

alter table public.vendas_mobile_pagamentos
  add column if not exists atualizado_em timestamptz not null default now();

create or replace function public.atualizar_data_operacional_vendas_mobile()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists vendas_mobile_clientes_atualizado_em on public.vendas_mobile_clientes;
create trigger vendas_mobile_clientes_atualizado_em
before update on public.vendas_mobile_clientes
for each row execute function public.atualizar_data_operacional_vendas_mobile();

drop trigger if exists vendas_mobile_pedidos_atualizado_em on public.vendas_mobile_pedidos;
create trigger vendas_mobile_pedidos_atualizado_em
before update on public.vendas_mobile_pedidos
for each row execute function public.atualizar_data_operacional_vendas_mobile();

drop trigger if exists vendas_mobile_pagamentos_atualizado_em on public.vendas_mobile_pagamentos;
create trigger vendas_mobile_pagamentos_atualizado_em
before update on public.vendas_mobile_pagamentos
for each row execute function public.atualizar_data_operacional_vendas_mobile();

create or replace function public.salvar_pedido_vendas_mobile_rpc(
  p_pedido jsonb,
  p_itens jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pedido_id uuid;
  v_pedido public.vendas_mobile_pedidos%rowtype;
  v_uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
begin
  if v_user_id is null then
    raise exception 'Sessão expirada.';
  end if;

  if not public.vendas_mobile_modulo_ativo() then
    raise exception 'O módulo Vendas Mobile não está ativo.';
  end if;

  if jsonb_typeof(coalesce(p_itens, '[]'::jsonb)) <> 'array' then
    raise exception 'A lista de itens do pedido é inválida.';
  end if;

  if coalesce(p_pedido->>'id', '') ~* v_uuid_pattern then
    v_pedido_id := (p_pedido->>'id')::uuid;
  end if;

  if v_pedido_id is null then
    insert into public.vendas_mobile_pedidos (
      user_id,
      cliente_id,
      status,
      subtotal,
      desconto,
      total,
      forma_pagamento,
      observacoes,
      criado_em,
      atualizado_em
    )
    values (
      v_user_id,
      case
        when coalesce(p_pedido->>'cliente_id', '') ~* v_uuid_pattern
          then (p_pedido->>'cliente_id')::uuid
        else null
      end,
      coalesce(nullif(p_pedido->>'status', ''), 'concluida'),
      coalesce((p_pedido->>'subtotal')::numeric, 0),
      coalesce((p_pedido->>'desconto')::numeric, 0),
      coalesce((p_pedido->>'total')::numeric, 0),
      nullif(p_pedido->>'forma_pagamento', ''),
      nullif(p_pedido->>'observacoes', ''),
      coalesce((p_pedido->>'criado_em')::timestamptz, now()),
      now()
    )
    returning * into v_pedido;
  else
    update public.vendas_mobile_pedidos
       set cliente_id = case
             when coalesce(p_pedido->>'cliente_id', '') ~* v_uuid_pattern
               then (p_pedido->>'cliente_id')::uuid
             else null
           end,
           status = coalesce(nullif(p_pedido->>'status', ''), 'concluida'),
           subtotal = coalesce((p_pedido->>'subtotal')::numeric, 0),
           desconto = coalesce((p_pedido->>'desconto')::numeric, 0),
           total = coalesce((p_pedido->>'total')::numeric, 0),
           forma_pagamento = nullif(p_pedido->>'forma_pagamento', ''),
           observacoes = nullif(p_pedido->>'observacoes', ''),
           criado_em = coalesce((p_pedido->>'criado_em')::timestamptz, criado_em),
           atualizado_em = now()
     where id = v_pedido_id
       and user_id = v_user_id
    returning * into v_pedido;

    if not found then
      raise exception 'Pedido não encontrado ou sem permissão para alteração.';
    end if;

    delete from public.vendas_mobile_pedido_itens
     where pedido_id = v_pedido.id;
  end if;

  insert into public.vendas_mobile_pedido_itens (
    pedido_id,
    produto_id,
    produto_nome,
    produto_sku,
    quantidade,
    preco_unitario,
    preco_custo,
    desconto,
    total
  )
  select
    v_pedido.id,
    case
      when coalesce(item->>'produto_id', '') ~* v_uuid_pattern
        then (item->>'produto_id')::uuid
      else null
    end,
    coalesce(nullif(item->>'produto_nome', ''), 'Produto'),
    nullif(item->>'produto_sku', ''),
    coalesce((item->>'quantidade')::numeric, 1),
    coalesce((item->>'preco_unitario')::numeric, 0),
    case
      when item ? 'preco_custo' and item->>'preco_custo' is not null
        then (item->>'preco_custo')::numeric
      else null
    end,
    coalesce((item->>'desconto')::numeric, 0),
    coalesce((item->>'total')::numeric, 0)
  from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) as item;

  return to_jsonb(v_pedido) || jsonb_build_object(
    'itens',
    coalesce(
      (
        select jsonb_agg(to_jsonb(item) order by item.criado_em, item.id)
          from public.vendas_mobile_pedido_itens item
         where item.pedido_id = v_pedido.id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.salvar_pedido_vendas_mobile_rpc(jsonb, jsonb) from public;
grant execute on function public.salvar_pedido_vendas_mobile_rpc(jsonb, jsonb) to authenticated;
