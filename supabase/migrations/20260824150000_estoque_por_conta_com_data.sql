-- Mantém simultaneamente o isolamento por conta e a data escolhida pelo usuário.
-- A assinatura anterior com conta, publicada às 14:30, continua disponível
-- temporariamente para navegadores antigos; a versão atual usa esta assinatura.

create or replace function public.movimentar_estoque_vendas_mobile_rpc(
  p_conta_id uuid,
  p_produto_id uuid,
  p_tipo text,
  p_quantidade numeric,
  p_observacao text,
  p_data date
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_produto public.vendas_mobile_produtos;
  v_anterior numeric(12,3);
  v_final numeric(12,3);
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if p_conta_id is null or not public.vendas_mobile_pode_operar_conta(p_conta_id) then
    raise exception 'Conta de vendas inválida ou sem permissão.';
  end if;
  if p_data is null then raise exception 'Informe a data da movimentação.'; end if;
  if p_data > v_hoje then raise exception 'A data da movimentação não pode estar no futuro.'; end if;

  select * into v_produto
    from public.vendas_mobile_produtos
   where id = p_produto_id
     and conta_id = p_conta_id
   for update;

  if v_produto.id is null then raise exception 'Produto não encontrado nesta conta.'; end if;
  if not v_produto.estoque_controlado then
    raise exception 'Ative o controle de estoque deste produto antes de movimentá-lo.';
  end if;

  v_anterior := coalesce(v_produto.estoque, 0);
  if p_tipo = 'entrada' then
    if coalesce(p_quantidade, 0) <= 0 then raise exception 'Informe uma entrada maior que zero.'; end if;
    v_final := v_anterior + p_quantidade;
  elsif p_tipo = 'ajuste' then
    if p_quantidade is null or p_quantidade < 0 then raise exception 'Informe o saldo final do ajuste.'; end if;
    v_final := p_quantidade;
  else
    raise exception 'Movimentação de estoque inválida.';
  end if;

  update public.vendas_mobile_produtos
     set estoque = v_final,
         atualizado_em = now()
   where id = v_produto.id
     and conta_id = p_conta_id;

  insert into public.vendas_mobile_estoque_movimentos
    (user_id, conta_id, produto_id, tipo, quantidade, saldo_anterior, saldo_final, observacao, data_movimentacao)
  values
    (auth.uid(), p_conta_id, v_produto.id, p_tipo,
     case when p_tipo = 'ajuste' then v_final - v_anterior else p_quantidade end,
     v_anterior, v_final, nullif(trim(p_observacao), ''), p_data);

  return jsonb_build_object(
    'produto_id', v_produto.id,
    'conta_id', p_conta_id,
    'saldo_anterior', v_anterior,
    'saldo_final', v_final,
    'tipo', p_tipo,
    'data_movimentacao', p_data
  );
end;
$$;

revoke all on function public.movimentar_estoque_vendas_mobile_rpc(uuid, uuid, text, numeric, text, date) from public, anon;
grant execute on function public.movimentar_estoque_vendas_mobile_rpc(uuid, uuid, text, numeric, text, date) to authenticated;

notify pgrst, 'reload schema';
