-- Permite exportar um catálogo específico no Conteúdo AvantaVendas sem trocar
-- o catálogo atual usado pela equipe comercial.

begin;

create or replace function public.listar_produtos_catalogo_conteudo_vendas_mobile_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_catalogo public.vendas_mobile_catalogos;
  v_produtos jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.vendas_mobile_pode_publicar_conteudo(p_empresa_id) then
    raise exception 'Você não tem permissão para exportar o catálogo deste perfil.';
  end if;
  select * into v_catalogo from public.vendas_mobile_catalogos
   where id = p_catalogo_id and empresa_id = p_empresa_id;
  if not found then raise exception 'Catálogo não localizado neste perfil.'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', produto.id, 'sku', produto.sku, 'nome', produto.nome, 'marca', produto.marca,
    'categoria', produto.categoria, 'descricao', produto.descricao,
    'preco_divulgacao', produto.preco_divulgacao, 'unidade', produto.unidade,
    'imagem_url', produto.imagem_url, 'ncm', produto.ncm, 'codigo_barras', produto.codigo_barras,
    'ativo', produto.ativo, 'atualizado_em', produto.atualizado_em
  ) order by produto.nome), '[]'::jsonb) into v_produtos
    from public.vendas_mobile_catalogo_produtos produto
   where produto.catalogo_id = v_catalogo.id
     and produto.disponivel_catalogo = true;

  return jsonb_build_object(
    'catalogo', jsonb_build_object('id', v_catalogo.id, 'nome', v_catalogo.nome, 'codigo', v_catalogo.codigo),
    'produtos', v_produtos
  );
end;
$$;

revoke all on function public.listar_produtos_catalogo_conteudo_vendas_mobile_rpc(uuid, uuid) from public;
grant execute on function public.listar_produtos_catalogo_conteudo_vendas_mobile_rpc(uuid, uuid) to authenticated;

commit;
