-- Ações em lote do cadastro mestre: atuam apenas nos itens selecionados,
-- confirmam o pertencimento à empresa e nunca modificam preço, imagem ou estoque.
begin;

create or replace function public.custos_aplicar_acao_produtos_lote_rpc(
  p_empresa_id uuid,
  p_produto_ids uuid[],
  p_acao text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acao text := lower(trim(coalesce(p_acao, '')));
  v_atualizados integer := 0;
begin
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para alterar os produtos desta empresa.';
  end if;

  if coalesce(array_length(p_produto_ids, 1), 0) = 0 then
    raise exception 'Selecione ao menos um produto ou serviço.';
  end if;

  if v_acao not in ('publicar_catalogo', 'retirar_catalogo', 'ativar', 'inativar') then
    raise exception 'Ação em lote inválida.';
  end if;

  update public.vendas_mobile_catalogo_produtos produto
     set disponivel_catalogo = case
           when v_acao = 'publicar_catalogo' then true
           when v_acao = 'retirar_catalogo' then false
           else produto.disponivel_catalogo
         end,
         ativo = case
           when v_acao = 'ativar' then true
           when v_acao = 'inativar' then false
           else produto.ativo
         end,
         atualizado_em = now()
    from public.vendas_mobile_catalogos catalogo
   where produto.id = any(p_produto_ids)
     and produto.catalogo_id = catalogo.id
     and catalogo.empresa_id = p_empresa_id
     and catalogo.origem = 'custos_local';

  get diagnostics v_atualizados = row_count;
  return v_atualizados;
end;
$$;

revoke all on function public.custos_aplicar_acao_produtos_lote_rpc(uuid, uuid[], text) from public, anon;
grant execute on function public.custos_aplicar_acao_produtos_lote_rpc(uuid, uuid[], text) to authenticated;

commit;
