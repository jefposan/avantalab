-- SKU manual opcional; mantém preços, identidades e históricos.
begin;
create or replace function public.salvar_produto_conteudo_vendas_mobile_rpc(
  p_empresa_id uuid,
  p_produto_id uuid default null,
  p_dados jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_catalogo_id uuid;
  v_produto_id uuid;
  v_sku text := nullif(upper(trim(coalesce(p_dados ->> 'sku', ''))), '');
  v_nome text := trim(coalesce(p_dados ->> 'nome', ''));
  v_preco numeric := nullif(p_dados ->> 'preco_divulgacao', '')::numeric;
  v_custo numeric := nullif(p_dados ->> 'preco_representante', '')::numeric;
  v_unidade text := coalesce(nullif(trim(p_dados ->> 'unidade'), ''), 'un');
  v_ativo boolean := coalesce((p_dados ->> 'ativo')::boolean, true);
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.vendas_mobile_pode_publicar_conteudo(p_empresa_id) then
    raise exception 'Você não tem permissão para administrar o catálogo deste perfil.';
  end if;
  -- Clientes antigos podem enviar o SKU técnico exibido anteriormente.
  if p_produto_id is not null and v_sku = 'LEGADO-' || upper(replace(p_produto_id::text, '-', '')) then
    v_sku := null;
  end if;
  if v_nome = '' or v_preco is null or v_preco <= 0 then
    raise exception 'Nome e preço sugerido de revenda são obrigatórios.';
  end if;
  if v_custo is not null and (v_custo < 0 or v_custo > 9999999999.99 or v_custo::text in ('NaN', 'Infinity', '-Infinity')) then
    raise exception 'Preço de custo inválido.';
  end if;
  if p_produto_id is null then
    select id into v_catalogo_id from public.vendas_mobile_catalogos
     where empresa_id = p_empresa_id and publicado_avantavendas
     order by padrao desc, criado_em, id limit 1;
    if v_catalogo_id is null then
      if exists (select 1 from public.vendas_mobile_catalogos where empresa_id = p_empresa_id) then
        raise exception 'Ative um catálogo no AvantaVendas antes de cadastrar produtos.';
      end if;
      insert into public.vendas_mobile_catalogos (
        empresa_id, nome, codigo, origem, ativo, padrao, publicado_avantavendas
      ) values (p_empresa_id, 'Catálogo principal', 'PRINCIPAL', 'externa', false, false, true)
      returning id into v_catalogo_id;
    end if;
    insert into public.vendas_mobile_catalogo_produtos (
      catalogo_id, sku, tipo_item, disponivel_catalogo, codigo_barras, marca,
      categoria, nome, descricao, preco_divulgacao, preco_representante, preco_custo, preco_venda,
      unidade, imagem_url, ncm, ativo, atualizado_em
    ) values (
      v_catalogo_id, v_sku, 'produto', true, nullif(trim(p_dados ->> 'codigo_barras'), ''),
      nullif(trim(p_dados ->> 'marca'), ''), nullif(trim(p_dados ->> 'categoria'), ''),
      v_nome, nullif(trim(p_dados ->> 'descricao'), ''), v_preco, v_custo, 0, 0, v_unidade,
      nullif(trim(p_dados ->> 'imagem_url'), ''), nullif(trim(p_dados ->> 'ncm'), ''), v_ativo, now()
    ) returning id into v_produto_id;
  else
    select produto.catalogo_id into v_catalogo_id
      from public.vendas_mobile_catalogo_produtos produto
      join public.vendas_mobile_catalogos catalogo on catalogo.id = produto.catalogo_id
     where produto.id = p_produto_id and catalogo.empresa_id = p_empresa_id
       and catalogo.publicado_avantavendas;
    if v_catalogo_id is null then raise exception 'Produto não localizado em catálogo ativo no AvantaVendas.'; end if;
    update public.vendas_mobile_catalogo_produtos set
      sku = v_sku, tipo_item = 'produto', disponivel_catalogo = true,
      codigo_barras = nullif(trim(p_dados ->> 'codigo_barras'), ''),
      marca = nullif(trim(p_dados ->> 'marca'), ''), categoria = nullif(trim(p_dados ->> 'categoria'), ''),
      nome = v_nome, descricao = nullif(trim(p_dados ->> 'descricao'), ''),
      preco_divulgacao = v_preco,
      preco_representante = case when p_dados ? 'preco_representante' then v_custo else preco_representante end,
      unidade = v_unidade,
      imagem_url = nullif(trim(p_dados ->> 'imagem_url'), ''), ncm = nullif(trim(p_dados ->> 'ncm'), ''),
      ativo = v_ativo, atualizado_em = now()
     where id = p_produto_id and catalogo_id = v_catalogo_id
     returning id into v_produto_id;
    if v_produto_id is null then raise exception 'Produto não localizado em catálogo ativo no AvantaVendas.'; end if;
  end if;
  return jsonb_build_object('id', v_produto_id);
end;
$$;

-- A limpeza de dados solicitada refere-se somente ao perfil TRIDIUM COSMETICOS.
-- Nunca alterar códigos reais, cadastros já excluídos ou snapshots de pedidos.
create temporary table sku_legado_limpeza on commit drop as
select produto.id, produto.sku
  from public.vendas_mobile_catalogo_produtos produto
  join public.vendas_mobile_catalogos catalogo on catalogo.id = produto.catalogo_id
 where catalogo.empresa_id = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e'::uuid
   and produto.excluido_em is null
   and produto.sku = 'LEGADO-' || upper(replace(produto.id::text, '-', ''));
update public.vendas_mobile_catalogo_produtos produto
   set sku = null, atualizado_em = now()
  from sku_legado_limpeza alvo
 where produto.id = alvo.id and produto.sku = alvo.sku;
update public.vendas_mobile_produtos copia
   set sku = null, atualizado_em = now()
  from sku_legado_limpeza alvo
 where copia.catalogo_produto_origem_id = alvo.id and copia.sku = alvo.sku;

revoke all on function public.salvar_produto_conteudo_vendas_mobile_rpc(uuid, uuid, jsonb) from public, anon;
grant execute on function public.salvar_produto_conteudo_vendas_mobile_rpc(uuid, uuid, jsonb) to authenticated;
commit;
