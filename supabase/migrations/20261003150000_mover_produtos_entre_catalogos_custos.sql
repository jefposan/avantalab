-- Produtos e serviços podem trocar de catálogo sem recriar o cadastro.
-- A operação preserva a mesma linha (e, portanto, preços, imagens, estoque,
-- composição e histórico vinculados ao produto) e só aceita catálogos ativos
-- da mesma empresa.
begin;

create or replace function public.custos_mover_produtos_catalogo_rpc(
  p_empresa_id uuid,
  p_produto_ids uuid[],
  p_catalogo_destino_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_catalogo_destino public.vendas_mobile_catalogos;
  v_total_origem integer := 0;
  v_codigo_duplicado text;
  v_atualizados integer := 0;
begin
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para alterar os produtos desta empresa.';
  end if;

  select array_agg(distinct item_id)
    into v_ids
    from unnest(coalesce(p_produto_ids, '{}'::uuid[])) as itens(item_id);

  if coalesce(array_length(v_ids, 1), 0) = 0 then
    raise exception 'Selecione ao menos um produto ou serviço.';
  end if;

  select catalogo.*
    into v_catalogo_destino
    from public.vendas_mobile_catalogos catalogo
   where catalogo.id = p_catalogo_destino_id
     and catalogo.empresa_id = p_empresa_id
     and catalogo.ativo = true
   for update;

  if not found then
    raise exception 'Selecione um catálogo ativo desta empresa como destino.';
  end if;

  select count(*)
    into v_total_origem
    from public.vendas_mobile_catalogo_produtos produto
    join public.vendas_mobile_catalogos catalogo_origem on catalogo_origem.id = produto.catalogo_id
   where produto.id = any(v_ids)
     and catalogo_origem.empresa_id = p_empresa_id;

  if v_total_origem <> array_length(v_ids, 1) then
    raise exception 'Um ou mais produtos selecionados não pertencem a esta empresa.';
  end if;

  -- A própria seleção não pode carregar o mesmo código duas vezes para o mesmo destino.
  select upper(trim(produto.sku))
    into v_codigo_duplicado
    from public.vendas_mobile_catalogo_produtos produto
   where produto.id = any(v_ids)
     and produto.catalogo_id <> p_catalogo_destino_id
     and nullif(trim(produto.sku), '') is not null
   group by upper(trim(produto.sku))
  having count(*) > 1
   limit 1;

  if v_codigo_duplicado is not null then
    raise exception 'O código % aparece mais de uma vez na seleção. Ajuste os códigos antes de mover.', v_codigo_duplicado;
  end if;

  -- E o destino não pode ter um código que já pertence a outro produto.
  select upper(trim(origem.sku))
    into v_codigo_duplicado
    from public.vendas_mobile_catalogo_produtos origem
    join public.vendas_mobile_catalogo_produtos destino
      on destino.catalogo_id = p_catalogo_destino_id
     and destino.id <> origem.id
     and upper(trim(destino.sku)) = upper(trim(origem.sku))
   where origem.id = any(v_ids)
     and origem.catalogo_id <> p_catalogo_destino_id
     and nullif(trim(origem.sku), '') is not null
   limit 1;

  if v_codigo_duplicado is not null then
    raise exception 'O catálogo de destino já usa o código % em outro cadastro. Ajuste o código antes de mover.', v_codigo_duplicado;
  end if;

  update public.vendas_mobile_catalogo_produtos produto
     set catalogo_id = p_catalogo_destino_id,
         atualizado_em = now()
   where produto.id = any(v_ids)
     and produto.catalogo_id <> p_catalogo_destino_id;

  get diagnostics v_atualizados = row_count;
  return v_atualizados;
end;
$$;

revoke all on function public.custos_mover_produtos_catalogo_rpc(uuid, uuid[], uuid) from public, anon;
grant execute on function public.custos_mover_produtos_catalogo_rpc(uuid, uuid[], uuid) to authenticated;

commit;
