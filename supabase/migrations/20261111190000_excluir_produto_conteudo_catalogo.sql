-- Conteúdo AvantaVendas: mesma exclusão lógica do cadastro mestre de Custos.
-- Preserva identidade, custos históricos, pedidos, estoque e documentos emitidos.
begin;
create or replace function public.excluir_produto_conteudo_vendas_mobile_rpc(
  p_empresa_id uuid, p_produto_id uuid, p_confirmado boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_produto public.vendas_mobile_catalogo_produtos;
  v_quando timestamptz := clock_timestamp();
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.vendas_mobile_pode_publicar_conteudo(p_empresa_id) then
    raise exception 'Você não tem permissão para excluir produtos deste perfil.';
  end if;
  if p_confirmado is distinct from true then
    raise exception 'Confirme a exclusão do produto e de seus vínculos operacionais.';
  end if;
  select produto.* into v_produto
    from public.vendas_mobile_catalogo_produtos produto
    join public.vendas_mobile_catalogos catalogo on catalogo.id = produto.catalogo_id
   where produto.id = p_produto_id and catalogo.empresa_id = p_empresa_id
     and catalogo.publicado_avantavendas
   for update of produto;
  if not found then raise exception 'Produto não localizado no catálogo deste perfil.'; end if;
  if v_produto.excluido_em is not null then
    return jsonb_build_object('id', v_produto.id, 'excluido', true);
  end if;
  -- Os mesmos campos da exclusão central de Custos; o gatilho existente
  -- despublica as cópias. Nenhuma tabela de pedidos/histórico é modificada.
  update public.vendas_mobile_catalogo_produtos
     set ativo = false, disponivel_catalogo = false,
         excluido_em = v_quando, excluido_por = auth.uid(), atualizado_em = v_quando
   where id = v_produto.id;
  -- Protege também cópias com vínculo comercial atualmente desligado.
  update public.vendas_mobile_produtos
     set ativo = false, atualizado_em = v_quando
   where catalogo_produto_origem_id = v_produto.id and ativo;
  return jsonb_build_object('id', v_produto.id, 'excluido', true);
end;
$$;
revoke all on function public.excluir_produto_conteudo_vendas_mobile_rpc(uuid, uuid, boolean) from public, anon;
grant execute on function public.excluir_produto_conteudo_vendas_mobile_rpc(uuid, uuid, boolean) to authenticated;
commit;
