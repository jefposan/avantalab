begin;

-- Atualização parcial: cada ID permanece no catálogo ao qual já pertence.
-- A RPC anterior continua disponível para criação/importação de novos catálogos.
create or replace function public.custos_importar_produtos_precos_seletivo_rpc(
  p_empresa_id uuid, p_catalogo_id uuid, p_arquivo_nome text,
  p_exportado_em timestamptz, p_produtos jsonb, p_precos jsonb,
  p_aplicar boolean default false
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  linha jsonb;
  item jsonb;
  produto public.vendas_mobile_catalogo_produtos;
  novo public.vendas_mobile_catalogo_produtos;
  tabela public.custos_tabelas_preco;
  campos text[];
  atribuicoes text;
  anterior numeric;
  valor numeric;
  atualizados integer := 0;
  precos_atualizados integer := 0;
  permitidos constant text[] := array[
    'nome','tipo_item','marca','categoria','descricao','preco_custo','preco_venda',
    'unidade','codigo_barras','ativo','disponivel_catalogo','ncm','cest','origem_mercadoria',
    'unidade_tributavel','cfop_padrao','cst','csosn','cst_pis','cst_cofins','cst_ibs_cbs',
    'classificacao_ibs_cbs','codigo_tributacao_nacional','codigo_tributacao_municipal',
    'nbs','item_lc116','municipio_prestacao','aliquota_iss'];
begin
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para importar o cadastro.' using errcode='42501';
  end if;
  if auth.uid() is not null and not public.usuario_area_rpc_restricao('custos', jsonb_build_object('p_empresa_id',p_empresa_id)) then
    raise exception 'Esta área não foi liberada.' using errcode='42501';
  end if;
  if jsonb_typeof(p_produtos) is distinct from 'array' or jsonb_typeof(p_precos) is distinct from 'array' then
    raise exception 'A estrutura da planilha é inválida.';
  end if;
  if jsonb_array_length(p_produtos) = 0 then raise exception 'A planilha não contém produtos.'; end if;
  if exists(select 1 from jsonb_array_elements(p_produtos) x
    where jsonb_typeof(x) is distinct from 'object' or coalesce(x->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    raise exception 'Mantenha os IDs internos dos produtos exportados.';
  end if;
  if p_exportado_em is null then raise exception 'Mantenha a data de exportação da planilha.'; end if;
  if exists(select 1 from jsonb_array_elements(p_produtos) x group by x->>'id' having count(*)>1) then
    raise exception 'A planilha possui IDs de produto repetidos.';
  end if;
  if exists(select 1 from jsonb_array_elements(p_precos) x group by x->>'produto_id',upper(trim(x->>'tabela_codigo')) having count(*)>1) then
    raise exception 'A planilha possui o mesmo produto repetido na mesma tabela de preço.';
  end if;
  -- Mesma ordem de bloqueios do reajuste: tabelas antes dos produtos.
  perform 1 from public.custos_tabelas_preco t where t.empresa_id=p_empresa_id order by t.id for update;
  perform 1 from public.vendas_mobile_catalogo_produtos p
    join public.vendas_mobile_catalogos c on c.id=p.catalogo_id
    where c.empresa_id=p_empresa_id and p.id in (select (x->>'id')::uuid from jsonb_array_elements(p_produtos) x)
    order by p.id for update of p;

  for linha in select value from jsonb_array_elements(p_produtos) loop
    select p.* into produto from public.vendas_mobile_catalogo_produtos p
      join public.vendas_mobile_catalogos c on c.id=p.catalogo_id
      where p.id=(linha->>'id')::uuid and c.empresa_id=p_empresa_id
        and c.excluido_em is null and p.excluido_em is null;
    if not found then raise exception 'Produto % não localizado nos catálogos desta empresa. Exporte novamente.', coalesce(linha->>'sku','sem código'); end if;
    if upper(trim(coalesce(linha->>'sku',''))) <> upper(produto.sku) then
      raise exception 'O código do produto % foi alterado. Mantenha o código exportado.', produto.sku;
    end if;
    if nullif(linha->>'atualizado_em','') is null then raise exception 'Mantenha a data de atualização do produto %.',produto.sku; end if;
    if produto.atualizado_em > (linha->>'atualizado_em')::timestamptz then
      raise exception 'O produto % foi alterado no sistema depois da exportação. Exporte uma nova planilha.',produto.sku;
    end if;
    if exists(select 1 from jsonb_object_keys(linha) k where not(k=any(permitidos || array['id','sku','atualizado_em']))) then
      raise exception 'A planilha contém campos de cadastro não permitidos.';
    end if;
    select * into novo from jsonb_populate_record(produto,linha - array['id','sku','atualizado_em']);
    if trim(coalesce(novo.nome,''))='' or novo.tipo_item not in ('produto','servico') or novo.tipo_item is null then
      raise exception 'Confira nome e tipo do produto %.',produto.sku;
    end if;
    if novo.preco_custo is null or novo.preco_venda is null or novo.preco_custo<0 or novo.preco_venda<0
      or novo.aliquota_iss is null or novo.aliquota_iss<0 or novo.aliquota_iss>100
      or novo.preco_custo::text in ('NaN','Infinity','-Infinity') or novo.preco_venda::text in ('NaN','Infinity','-Infinity')
      or novo.aliquota_iss::text in ('NaN','Infinity','-Infinity') or novo.ativo is null or novo.disponivel_catalogo is null then
      raise exception 'Confira valores, percentuais e situação do produto %.',produto.sku;
    end if;
    select array_agg(k order by k) into campos from jsonb_object_keys(linha) k
      where k=any(permitidos) and (to_jsonb(novo)->k) is distinct from (to_jsonb(produto)->k);
    if cardinality(campos)>0 then
      atualizados:=atualizados+1;
      if p_aplicar then
        select string_agg(format('%I = ($1).%I', k,k),', ') into atribuicoes from unnest(campos) k;
        execute format('update public.vendas_mobile_catalogo_produtos set %s, atualizado_em=now() where id=$2',atribuicoes) using novo,produto.id;
        if 'preco_venda'=any(campos) then
          select * into tabela from public.custos_tabelas_preco where empresa_id=p_empresa_id and padrao;
          if tabela.id is null then raise exception 'A tabela padrão não foi preparada.'; end if;
          insert into public.custos_tabela_preco_historico(empresa_id,tabela_preco_id,produto_id,preco_anterior,preco_novo,origem)
            values(p_empresa_id,tabela.id,produto.id,produto.preco_venda,novo.preco_venda,'importacao');
        end if;
      end if;
    end if;
  end loop;

  for item in select value from jsonb_array_elements(p_precos) loop
    if not exists(select 1 from jsonb_array_elements(p_produtos) x where x->>'id'=item->>'produto_id') then
      raise exception 'Preço sem produto correspondente na planilha.';
    end if;
    select p.* into produto from public.vendas_mobile_catalogo_produtos p
      join public.vendas_mobile_catalogos c on c.id=p.catalogo_id
      where p.id=(item->>'produto_id')::uuid and c.empresa_id=p_empresa_id and c.excluido_em is null and p.excluido_em is null;
    if not found or upper(produto.sku) <> upper(trim(coalesce(item->>'sku',''))) then raise exception 'Produto do preço não pertence a esta empresa.'; end if;
    select * into tabela from public.custos_tabelas_preco
      where empresa_id=p_empresa_id and codigo=upper(trim(item->>'tabela_codigo'));
    if not found then raise exception 'Tabela de preço % não localizada nesta empresa.',item->>'tabela_codigo'; end if;
    -- A tabela padrão é representada exclusivamente por preco_venda no cadastro.
    if tabela.padrao then raise exception 'Use a coluna Preço padrão para alterar a tabela padrão.'; end if;
    valor := (item->>'preco')::numeric;
    if valor is null or valor<0 or valor::text in ('NaN','Infinity','-Infinity') then raise exception 'Preço inválido para o produto %.',produto.sku; end if;
    if exists(select 1 from public.custos_tabela_preco_itens i where i.tabela_preco_id=tabela.id and i.produto_id=produto.id and i.atualizado_em > p_exportado_em) then
      raise exception 'O preço de % em % foi alterado após a exportação. Exporte novamente.',produto.sku,tabela.nome;
    end if;
    select preco into anterior from public.custos_tabela_preco_itens where tabela_preco_id=tabela.id and produto_id=produto.id;
    -- Na prévia, o preço padrão selecionado ainda não foi gravado.
    select value into linha from jsonb_array_elements(p_produtos) where value->>'id'=item->>'produto_id';
    anterior:=coalesce(anterior,(linha->>'preco_venda')::numeric,produto.preco_venda);
    if anterior is distinct from round(valor,2) then
      precos_atualizados:=precos_atualizados+1;
      if p_aplicar then
        insert into public.custos_tabela_preco_itens(tabela_preco_id,produto_id,preco)
          values(tabela.id,produto.id,round(valor,2))
          on conflict(tabela_preco_id,produto_id) do update set preco=excluded.preco,atualizado_em=now();
        insert into public.custos_tabela_preco_historico(empresa_id,tabela_preco_id,produto_id,preco_anterior,preco_novo,origem)
          values(p_empresa_id,tabela.id,produto.id,anterior,round(valor,2),'importacao');
      end if;
    end if;
  end loop;
  if p_aplicar then
    insert into public.custos_importacoes_produtos_precos(empresa_id,arquivo_nome,exportado_em,produtos_criados,produtos_atualizados,precos_atualizados)
      values(p_empresa_id,coalesce(nullif(trim(p_arquivo_nome),''),'planilha.xlsx'),p_exportado_em,0,atualizados,precos_atualizados);
  end if;
  return jsonb_build_object('produtos_criados',0,'produtos_atualizados',atualizados,'precos_atualizados',precos_atualizados,'aplicado',p_aplicar);
end;
$$;
revoke all on function public.custos_importar_produtos_precos_seletivo_rpc(uuid,uuid,text,timestamptz,jsonb,jsonb,boolean) from public,anon;
grant execute on function public.custos_importar_produtos_precos_seletivo_rpc(uuid,uuid,text,timestamptz,jsonb,jsonb,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
