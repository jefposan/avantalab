-- Disponibilidade interna padrão; preserva escolhas explícitas e publicação dos catálogos.
-- Funções preservadas da definição remota vigente; somente defaults de disponibilidade alterados.
begin;
set local lock_timeout='5s';
alter table public.vendas_mobile_catalogo_produtos alter column disponivel_catalogo set default true;
CREATE OR REPLACE FUNCTION public.custos_criar_catalogo_com_produtos_rpc(p_empresa_id uuid, p_nome text, p_codigo text, p_produtos jsonb)
 RETURNS vendas_mobile_catalogos
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
BEGIN IF auth.uid() IS NOT NULL AND NOT public.usuario_area_rpc_restricao('custos',jsonb_build_object('p_empresa_id',p_empresa_id)) THEN RAISE EXCEPTION 'Esta área não foi liberada.' USING ERRCODE='42501'; END IF;
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
    v_disponivel := coalesce((v_item ->> 'disponivel_catalogo')::boolean, true);
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
$function$;

CREATE OR REPLACE FUNCTION public.custos_importar_produtos_precos_rpc(p_empresa_id uuid, p_catalogo_id uuid, p_arquivo_nome text, p_exportado_em timestamp with time zone, p_produtos jsonb, p_precos jsonb, p_aplicar boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_linha jsonb;
  v_preco jsonb;
  v_produto public.vendas_mobile_catalogo_produtos;
  v_tabela public.custos_tabelas_preco;
  v_produto_id uuid;
  v_criados integer := 0;
  v_atualizados integer := 0;
  v_precos integer := 0;
  v_anterior numeric(12,2);
  v_uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
BEGIN IF auth.uid() IS NOT NULL AND NOT public.usuario_area_rpc_restricao('custos',jsonb_build_object('p_empresa_id',p_empresa_id,'p_catalogo_id',p_catalogo_id)) THEN RAISE EXCEPTION 'Esta área não foi liberada.' USING ERRCODE='42501'; END IF;
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then raise exception 'Sem permissão para importar o cadastro.'; end if;
  if not exists (select 1 from public.vendas_mobile_catalogos where id = p_catalogo_id and empresa_id = p_empresa_id) then
    raise exception 'O catálogo informado não pertence a esta empresa.';
  end if;
  if jsonb_typeof(coalesce(p_produtos, '[]'::jsonb)) <> 'array' or jsonb_typeof(coalesce(p_precos, '[]'::jsonb)) <> 'array' then
    raise exception 'A estrutura da planilha é inválida.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_produtos, '[]'::jsonb)) item
    group by upper(trim(item ->> 'sku')) having count(*) > 1
  ) then raise exception 'A planilha possui códigos de produto repetidos.'; end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_precos, '[]'::jsonb)) item
    group by upper(trim(item ->> 'sku')), upper(trim(item ->> 'tabela_codigo')) having count(*) > 1
  ) then raise exception 'A planilha possui o mesmo produto repetido na mesma tabela de preço.'; end if;

  for v_linha in select value from jsonb_array_elements(coalesce(p_produtos, '[]'::jsonb)) loop
    if trim(coalesce(v_linha ->> 'sku', '')) = '' then raise exception 'Todo produto precisa de um código.'; end if;
    if trim(coalesce(v_linha ->> 'nome', '')) = '' then raise exception 'Todo produto precisa de um nome.'; end if;
    if coalesce(v_linha ->> 'tipo_item', 'produto') not in ('produto', 'servico') then raise exception 'Use Produto ou Serviço no campo Tipo.'; end if;
    if coalesce((v_linha ->> 'preco_custo')::numeric, 0) < 0 or coalesce((v_linha ->> 'preco_venda')::numeric, 0) < 0 then
      raise exception 'Custos e preços não podem ser negativos.';
    end if;

    v_produto := null;
    if coalesce(v_linha ->> 'id', '') ~* v_uuid_pattern then
      select produto.* into v_produto from public.vendas_mobile_catalogo_produtos produto
       where produto.id = (v_linha ->> 'id')::uuid and produto.catalogo_id = p_catalogo_id;
      if not found then raise exception 'Um ID de produto da planilha não pertence a este catálogo.'; end if;
    else
      select produto.* into v_produto from public.vendas_mobile_catalogo_produtos produto
       where produto.catalogo_id = p_catalogo_id and upper(produto.sku) = upper(trim(v_linha ->> 'sku')) limit 1;
    end if;

    if v_produto.id is not null and nullif(v_linha ->> 'atualizado_em', '') is not null
       and v_produto.atualizado_em > (v_linha ->> 'atualizado_em')::timestamptz + interval '1 second' then
      raise exception 'O produto % foi alterado no sistema depois da exportação. Exporte uma nova planilha.', v_produto.sku;
    end if;

    if v_produto.id is null then v_criados := v_criados + 1; else v_atualizados := v_atualizados + 1; end if;
    if p_aplicar then
      if v_produto.id is null then
        insert into public.vendas_mobile_catalogo_produtos (
          catalogo_id, sku, tipo_item, nome, marca, categoria, descricao, preco_custo, preco_venda,
          unidade, codigo_barras, ativo, disponivel_catalogo, ncm, cest, origem_mercadoria,
          unidade_tributavel, cfop_padrao, cst, csosn, cst_pis, cst_cofins, cst_ibs_cbs,
          classificacao_ibs_cbs, codigo_tributacao_nacional, codigo_tributacao_municipal,
          nbs, item_lc116, municipio_prestacao, aliquota_iss, atualizado_em
        ) values (
          p_catalogo_id, upper(trim(v_linha ->> 'sku')), coalesce(v_linha ->> 'tipo_item', 'produto'), trim(v_linha ->> 'nome'),
          nullif(trim(v_linha ->> 'marca'), ''), nullif(trim(v_linha ->> 'categoria'), ''), nullif(trim(v_linha ->> 'descricao'), ''),
          coalesce((v_linha ->> 'preco_custo')::numeric, 0), coalesce((v_linha ->> 'preco_venda')::numeric, 0),
          coalesce(nullif(trim(v_linha ->> 'unidade'), ''), 'un'), nullif(trim(v_linha ->> 'codigo_barras'), ''),
          coalesce((v_linha ->> 'ativo')::boolean, true), coalesce((v_linha ->> 'disponivel_catalogo')::boolean, true),
          nullif(trim(v_linha ->> 'ncm'), ''), nullif(trim(v_linha ->> 'cest'), ''), nullif(trim(v_linha ->> 'origem_mercadoria'), ''),
          nullif(trim(v_linha ->> 'unidade_tributavel'), ''), nullif(trim(v_linha ->> 'cfop_padrao'), ''), nullif(trim(v_linha ->> 'cst'), ''),
          nullif(trim(v_linha ->> 'csosn'), ''), nullif(trim(v_linha ->> 'cst_pis'), ''), nullif(trim(v_linha ->> 'cst_cofins'), ''),
          nullif(trim(v_linha ->> 'cst_ibs_cbs'), ''), nullif(trim(v_linha ->> 'classificacao_ibs_cbs'), ''),
          nullif(trim(v_linha ->> 'codigo_tributacao_nacional'), ''), nullif(trim(v_linha ->> 'codigo_tributacao_municipal'), ''),
          nullif(trim(v_linha ->> 'nbs'), ''), nullif(trim(v_linha ->> 'item_lc116'), ''), nullif(trim(v_linha ->> 'municipio_prestacao'), ''),
          coalesce((v_linha ->> 'aliquota_iss')::numeric, 0), now()
        ) returning id into v_produto_id;
      else
        v_produto_id := v_produto.id;
        update public.vendas_mobile_catalogo_produtos set
          sku = upper(trim(v_linha ->> 'sku')), tipo_item = coalesce(v_linha ->> 'tipo_item', 'produto'), nome = trim(v_linha ->> 'nome'),
          marca = nullif(trim(v_linha ->> 'marca'), ''), categoria = nullif(trim(v_linha ->> 'categoria'), ''), descricao = nullif(trim(v_linha ->> 'descricao'), ''),
          preco_custo = coalesce((v_linha ->> 'preco_custo')::numeric, 0), preco_venda = coalesce((v_linha ->> 'preco_venda')::numeric, 0),
          unidade = coalesce(nullif(trim(v_linha ->> 'unidade'), ''), 'un'), codigo_barras = nullif(trim(v_linha ->> 'codigo_barras'), ''),
          ativo = coalesce((v_linha ->> 'ativo')::boolean, true), disponivel_catalogo = coalesce((v_linha ->> 'disponivel_catalogo')::boolean, v_produto.disponivel_catalogo),
          ncm = nullif(trim(v_linha ->> 'ncm'), ''), cest = nullif(trim(v_linha ->> 'cest'), ''), origem_mercadoria = nullif(trim(v_linha ->> 'origem_mercadoria'), ''),
          unidade_tributavel = nullif(trim(v_linha ->> 'unidade_tributavel'), ''), cfop_padrao = nullif(trim(v_linha ->> 'cfop_padrao'), ''),
          cst = nullif(trim(v_linha ->> 'cst'), ''), csosn = nullif(trim(v_linha ->> 'csosn'), ''), cst_pis = nullif(trim(v_linha ->> 'cst_pis'), ''),
          cst_cofins = nullif(trim(v_linha ->> 'cst_cofins'), ''), cst_ibs_cbs = nullif(trim(v_linha ->> 'cst_ibs_cbs'), ''),
          classificacao_ibs_cbs = nullif(trim(v_linha ->> 'classificacao_ibs_cbs'), ''), codigo_tributacao_nacional = nullif(trim(v_linha ->> 'codigo_tributacao_nacional'), ''),
          codigo_tributacao_municipal = nullif(trim(v_linha ->> 'codigo_tributacao_municipal'), ''), nbs = nullif(trim(v_linha ->> 'nbs'), ''),
          item_lc116 = nullif(trim(v_linha ->> 'item_lc116'), ''), municipio_prestacao = nullif(trim(v_linha ->> 'municipio_prestacao'), ''),
          aliquota_iss = coalesce((v_linha ->> 'aliquota_iss')::numeric, 0), atualizado_em = now()
         where id = v_produto.id;
      end if;
    end if;
  end loop;

  for v_preco in select value from jsonb_array_elements(coalesce(p_precos, '[]'::jsonb)) loop
    if trim(coalesce(v_preco ->> 'sku', '')) = '' or trim(coalesce(v_preco ->> 'tabela_codigo', '')) = '' then
      raise exception 'Todo preço precisa do código do produto e do código da tabela.';
    end if;
    if (v_preco ->> 'preco') is null or (v_preco ->> 'preco')::numeric < 0 then raise exception 'Informe preços iguais ou maiores que zero.'; end if;
    select * into v_tabela from public.custos_tabelas_preco
     where empresa_id = p_empresa_id and upper(codigo) = upper(trim(v_preco ->> 'tabela_codigo'));
    if not found then raise exception 'A tabela de preço % não existe.', v_preco ->> 'tabela_codigo'; end if;
    select produto.* into v_produto from public.vendas_mobile_catalogo_produtos produto
     where produto.catalogo_id = p_catalogo_id and upper(produto.sku) = upper(trim(v_preco ->> 'sku')) limit 1;
    if not found and p_aplicar then raise exception 'O produto % não foi localizado após a importação.', v_preco ->> 'sku'; end if;
    v_precos := v_precos + 1;
    if p_aplicar then
      if v_tabela.padrao then
        v_anterior := v_produto.preco_venda;
        update public.vendas_mobile_catalogo_produtos set preco_venda = round((v_preco ->> 'preco')::numeric, 2), atualizado_em = now() where id = v_produto.id;
      else
        select preco into v_anterior from public.custos_tabela_preco_itens where tabela_preco_id = v_tabela.id and produto_id = v_produto.id;
        if not found then v_anterior := v_produto.preco_venda; end if;
        insert into public.custos_tabela_preco_itens (tabela_preco_id, produto_id, preco)
        values (v_tabela.id, v_produto.id, round((v_preco ->> 'preco')::numeric, 2))
        on conflict (tabela_preco_id, produto_id) do update set preco = excluded.preco;
      end if;
      if v_anterior is distinct from round((v_preco ->> 'preco')::numeric, 2) then
        insert into public.custos_tabela_preco_historico
          (empresa_id, tabela_preco_id, produto_id, preco_anterior, preco_novo, origem)
        values (p_empresa_id, v_tabela.id, v_produto.id, v_anterior, round((v_preco ->> 'preco')::numeric, 2), 'importacao');
      end if;
    end if;
  end loop;

  if p_aplicar then
    insert into public.custos_importacoes_produtos_precos
      (empresa_id, arquivo_nome, exportado_em, produtos_criados, produtos_atualizados, precos_atualizados)
    values (p_empresa_id, coalesce(nullif(trim(p_arquivo_nome), ''), 'planilha.xlsx'), p_exportado_em, v_criados, v_atualizados, v_precos);
  end if;
  return jsonb_build_object('produtos_criados', v_criados, 'produtos_atualizados', v_atualizados, 'precos_atualizados', v_precos, 'aplicado', p_aplicar);
exception when unique_violation then
  raise exception 'Um código de produto da planilha já está em uso.';
end;
$function$;
commit;
