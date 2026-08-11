-- O primeiro acesso ao AvantaVendas prepara silenciosamente a conta técnica
-- usada para separar dados e permissões. O bloqueio transacional impede que
-- duas abas ou dois aparelhos criem contas iniciais duplicadas.

create or replace function public.garantir_conta_vendas_mobile_rpc()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_conta public.vendas_mobile_contas;
  v_papel text;
begin
  if v_user_id is null then
    raise exception 'Sessão expirada.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('avantalab-vendas:' || v_user_id::text, 0));

  select c.*
    into v_conta
  from public.vendas_mobile_contas_usuarios m
  join public.vendas_mobile_contas c on c.id = m.conta_id
  where m.user_id = v_user_id
    and m.status = 'ativo'
    and c.arquivada_em is null
  order by (m.papel = 'proprietario') desc, c.criado_em
  limit 1;

  if v_conta.id is not null then
    select m.papel
      into v_papel
    from public.vendas_mobile_contas_usuarios m
    where m.conta_id = v_conta.id
      and m.user_id = v_user_id
      and m.status = 'ativo';
  end if;

  if v_conta.id is null then
    insert into public.vendas_mobile_contas (nome, criado_por)
    values ('Minha conta de vendas', v_user_id)
    returning * into v_conta;

    insert into public.vendas_mobile_contas_usuarios (conta_id, user_id, papel)
    values (v_conta.id, v_user_id, 'proprietario');
    v_papel := 'proprietario';
  end if;

  return jsonb_build_object(
    'id', v_conta.id,
    'nome', v_conta.nome,
    'empresa_id', v_conta.empresa_id,
    'papel', v_papel,
    'criado_por', v_conta.criado_por
  );
end;
$$;

revoke all on function public.garantir_conta_vendas_mobile_rpc() from public;
grant execute on function public.garantir_conta_vendas_mobile_rpc() to authenticated;
