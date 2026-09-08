-- Produtos importados antes da exigência de SKU continuam editáveis no
-- Conteúdo AvantaVendas. O código é determinístico a partir do próprio UUID.

begin;

create or replace function public.salvar_produto_conteudo_vendas_mobile_rpc(
  p_empresa_id uuid,
  p_produto_id uuid default null,
  p_dados jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_catalogo_id uuid;
  v_produto_id uuid;
  v_sku text := upper(trim(coalesce(p_dados ->> 'sku', '')));
  v_nome text := trim(coalesce(p_dados ->> 'nome', ''));
  v_preco numeric := nullif(p_dados ->> 'preco_divulgacao', '')::numeric;
  v_unidade text := coalesce(nullif(trim(p_dados ->> 'unidade'), ''), 'un');
  v_ativo boolean := coalesce((p_dados ->> 'ativo')::boolean, true);
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.vendas_mobile_pode_publicar_conteudo(p_empresa_id) then
    raise exception 'Você não tem permissão para administrar o catálogo deste perfil.';
  end if;

  if p_produto_id is not null and v_sku = '' then
    v_sku := 'LEGADO-' || upper(replace(p_produto_id::text, '-', ''));
  end if;

  if v_sku = '' or v_nome = '' or v_preco is null or v_preco <= 0 then
    raise exception 'Código, nome e preço sugerido de revenda são obrigatórios.';
  end if;

  select id into v_catalogo_id
    from public.vendas_mobile_catalogos
   where empresa_id = p_empresa_id and ativo = true
   order by criado_em
   limit 1;
  if v_catalogo_id is null then
    insert into public.vendas_mobile_catalogos (empresa_id, nome, codigo)
    values (p_empresa_id, 'Catálogo principal', 'PRINCIPAL')
    returning id into v_catalogo_id;
  end if;

  if p_produto_id is null then
    insert into public.vendas_mobile_catalogo_produtos (
      catalogo_id, sku, tipo_item, disponivel_catalogo, codigo_barras, marca,
      categoria, nome, descricao, preco_divulgacao, preco_custo, preco_venda,
      unidade, imagem_url, ncm, ativo, atualizado_em
    ) values (
      v_catalogo_id, v_sku, 'produto', true,
      nullif(trim(p_dados ->> 'codigo_barras'), ''),
      nullif(trim(p_dados ->> 'marca'), ''),
      nullif(trim(p_dados ->> 'categoria'), ''), v_nome,
      nullif(trim(p_dados ->> 'descricao'), ''), v_preco, 0, 0, v_unidade,
      nullif(trim(p_dados ->> 'imagem_url'), ''),
      nullif(trim(p_dados ->> 'ncm'), ''), v_ativo, now()
    ) returning id into v_produto_id;
  else
    update public.vendas_mobile_catalogo_produtos
       set sku = v_sku,
           tipo_item = 'produto',
           disponivel_catalogo = true,
           codigo_barras = nullif(trim(p_dados ->> 'codigo_barras'), ''),
           marca = nullif(trim(p_dados ->> 'marca'), ''),
           categoria = nullif(trim(p_dados ->> 'categoria'), ''),
           nome = v_nome,
           descricao = nullif(trim(p_dados ->> 'descricao'), ''),
           preco_divulgacao = v_preco,
           unidade = v_unidade,
           imagem_url = nullif(trim(p_dados ->> 'imagem_url'), ''),
           ncm = nullif(trim(p_dados ->> 'ncm'), ''),
           ativo = v_ativo,
           atualizado_em = now()
     where id = p_produto_id
       and catalogo_id = v_catalogo_id
     returning id into v_produto_id;

    if v_produto_id is null then
      raise exception 'Produto não localizado no catálogo deste perfil.';
    end if;
  end if;

  return jsonb_build_object('id', v_produto_id);
end;
$$;

commit;
