-- Criação de catálogo manual e importação de seus produtos na mesma transação.
-- Reutiliza o importador de cadastro mestre sem tocar em composições/insumos.
begin;

create or replace function public.custos_criar_catalogo_com_produtos_rpc(
  p_empresa_id uuid,
  p_nome text,
  p_codigo text,
  p_produtos jsonb
)
returns public.vendas_mobile_catalogos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_catalogo public.vendas_mobile_catalogos;
  v_item jsonb;
  v_fornecedor_id uuid;
  v_linha integer := 0;
  v_sku text;
  v_sequencia integer := 0;
  v_produtos_prontos jsonb := '[]'::jsonb;
  v_preco_custo numeric;
  v_preco_venda numeric;
  v_disponivel boolean;
  v_fiscal boolean;
begin
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para criar catálogos nesta empresa.';
  end if;
  if jsonb_typeof(p_produtos) is distinct from 'array' then
    raise exception 'A estrutura da planilha é inválida.';
  end if;
  if jsonb_array_length(p_produtos) not between 1 and 1000 then
    raise exception 'A planilha deve conter de 1 a 1.000 produtos.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_produtos) item
    where nullif(trim(coalesce(item ->> 'sku', '')), '') is not null
    group by upper(trim(item ->> 'sku')) having count(*) > 1
  ) then raise exception 'A planilha possui códigos de produto repetidos.'; end if;

  for v_item in select value from jsonb_array_elements(p_produtos) loop
    v_linha := v_linha + 1;
    v_sku := upper(trim(coalesce(v_item ->> 'sku', '')));
    if length(v_sku) > 80 or trim(coalesce(v_item ->> 'nome', '')) = ''
      or length(trim(v_item ->> 'nome')) > 250 or coalesce(v_item ->> 'tipo_item', 'produto') <> 'produto' then
      raise exception 'Produto %: código, nome ou tipo inválido.', v_linha;
    end if;
    if coalesce(v_item ->> 'id', '') <> '' then raise exception 'A planilha de novo catálogo não aceita IDs existentes.'; end if;
    if (v_item ? 'ativo' and jsonb_typeof(v_item -> 'ativo') <> 'boolean')
      or (v_item ? 'disponivel_catalogo' and jsonb_typeof(v_item -> 'disponivel_catalogo') <> 'boolean')
      or (v_item ? 'habilitado_fiscal' and jsonb_typeof(v_item -> 'habilitado_fiscal') <> 'boolean') then
      raise exception 'Produto % (%): indicadores devem ser Sim ou Não.', v_linha, v_sku;
    end if;
    if coalesce(v_item ->> 'ncm', '') <> '' and (v_item ->> 'ncm') !~ '^[0-9]{8}$' then
      raise exception 'Produto % (%): NCM informado deve ter 8 dígitos.', v_linha, v_sku;
    end if;
    if coalesce(v_item ->> 'cest', '') <> '' and (v_item ->> 'cest') !~ '^[0-9]{7}$' then
      raise exception 'Produto % (%): CEST inválido.', v_linha, v_sku;
    end if;
    if coalesce(v_item ->> 'cfop_padrao', '') <> '' and (v_item ->> 'cfop_padrao') !~ '^[0-9]{4}$' then
      raise exception 'Produto % (%): CFOP inválido.', v_linha, v_sku;
    end if;
    if coalesce(v_item ->> 'codigo_barras', '') <> '' and (v_item ->> 'codigo_barras') !~ '^[0-9]{8,14}$' then
      raise exception 'Produto % (%): código de barras inválido.', v_linha, v_sku;
    end if;
    if coalesce(v_item ->> 'imagem_url', '') <> '' and (v_item ->> 'imagem_url') !~* '^https://' then
      raise exception 'Produto % (%): URL da imagem deve usar HTTPS.', v_linha, v_sku;
    end if;
    if (coalesce(v_item ->> 'preco_custo', '') <> '' and (v_item ->> 'preco_custo') !~ '^[0-9]+(\.[0-9]{1,2})?$')
      or (coalesce(v_item ->> 'preco_venda', '') <> '' and (v_item ->> 'preco_venda') !~ '^[0-9]+(\.[0-9]{1,2})?$') then
      raise exception 'Produto % (%): custo ou preço inválido.', v_linha, v_sku;
    end if;
    v_preco_custo := coalesce(nullif(v_item ->> 'preco_custo', '')::numeric, 0);
    v_preco_venda := coalesce(nullif(v_item ->> 'preco_venda', '')::numeric, 0);
    if v_preco_custo > 9999999999.99 or v_preco_venda > 9999999999.99 then
      raise exception 'Produto % (%): custo ou preço inválido.', v_linha, v_sku;
    end if;
    if coalesce(v_item ->> 'fornecedor_codigo', '') <> '' and (v_item ->> 'fornecedor_codigo') !~ '^[0-9]+$' then
      raise exception 'Produto % (%): código de fornecedor inválido.', v_linha, v_sku;
    end if;
    if coalesce(v_item ->> 'fornecedor_codigo', '') <> '' and not exists (
      select 1 from public.vendas_fornecedores fornecedor
       where fornecedor.empresa_id = p_empresa_id and fornecedor.codigo::text = trim(v_item ->> 'fornecedor_codigo')
         and fornecedor.situacao = 'ativo'
    ) then raise exception 'Produto % (%): fornecedor não encontrado pelo código.', v_linha, v_sku; end if;
  end loop;

  v_catalogo := public.custos_salvar_catalogo_empresa_rpc(p_empresa_id, null, p_nome, p_codigo);
  for v_item in select value from jsonb_array_elements(p_produtos) loop
    v_sku := upper(trim(coalesce(v_item ->> 'sku', '')));
    if v_sku = '' then
      loop
        v_sequencia := v_sequencia + 1;
        v_sku := upper(v_catalogo.codigo) || '-' || lpad(v_sequencia::text, greatest(5, length(v_sequencia::text)), '0');
        exit when not exists (
          select 1 from public.vendas_mobile_catalogo_produtos produto
          join public.vendas_mobile_catalogos catalogo on catalogo.id = produto.catalogo_id
          where catalogo.empresa_id = p_empresa_id and upper(trim(produto.sku)) = v_sku
        ) and not exists (
          select 1 from jsonb_array_elements(p_produtos) item
          where upper(trim(coalesce(item ->> 'sku', ''))) = v_sku
        ) and not exists (
          select 1 from jsonb_array_elements(v_produtos_prontos) item
          where item ->> 'sku' = v_sku
        );
      end loop;
    end if;
    v_preco_custo := coalesce(nullif(v_item ->> 'preco_custo', '')::numeric, 0);
    v_preco_venda := coalesce(nullif(v_item ->> 'preco_venda', '')::numeric, 0);
    v_disponivel := coalesce((v_item ->> 'disponivel_catalogo')::boolean, false) and v_preco_venda > 0;
    v_fiscal := coalesce((v_item ->> 'habilitado_fiscal')::boolean, false)
      and coalesce(v_item ->> 'ncm', '') <> ''
      and nullif(trim(coalesce(v_item ->> 'unidade_tributavel', '')), '') is not null;
    v_produtos_prontos := v_produtos_prontos || jsonb_build_array(v_item || jsonb_build_object(
      'sku', v_sku, 'tipo_item', 'produto', 'preco_custo', v_preco_custo,
      'preco_venda', v_preco_venda, 'ativo', coalesce((v_item ->> 'ativo')::boolean, true),
      'disponivel_catalogo', v_disponivel, 'habilitado_fiscal', v_fiscal
    ));
  end loop;
  perform public.custos_importar_produtos_precos_rpc(
    p_empresa_id, v_catalogo.id, 'importacao-novo-catalogo.xlsx', null,
    v_produtos_prontos, '[]'::jsonb, true
  );

  for v_item in select value from jsonb_array_elements(v_produtos_prontos) loop
    v_fornecedor_id := null;
    if coalesce(v_item ->> 'fornecedor_codigo', '') <> '' then
      select fornecedor.id into v_fornecedor_id
        from public.vendas_fornecedores fornecedor
       where fornecedor.empresa_id = p_empresa_id and fornecedor.codigo::text = trim(v_item ->> 'fornecedor_codigo')
         and fornecedor.situacao = 'ativo';
    end if;
    update public.vendas_mobile_catalogo_produtos produto
       set fornecedor_id = v_fornecedor_id,
           imagem_url = nullif(trim(coalesce(v_item ->> 'imagem_url', '')), ''),
           habilitado_fiscal = coalesce((v_item ->> 'habilitado_fiscal')::boolean, false)
     where produto.catalogo_id = v_catalogo.id
       and produto.sku = upper(trim(v_item ->> 'sku'));
  end loop;
  return v_catalogo;
end;
$$;

revoke all on function public.custos_criar_catalogo_com_produtos_rpc(uuid, text, text, jsonb) from public, anon;
grant execute on function public.custos_criar_catalogo_com_produtos_rpc(uuid, text, text, jsonb) to authenticated;

commit;
