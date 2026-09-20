-- Importação integral e substituição protegida do cadastro mestre.
-- O procedimento preserva um retrato recuperável antes de limpar catálogos de teste.
begin;

alter table public.vendas_fornecedores
  add column if not exists codigo_externo text;
create unique index if not exists vendas_fornecedores_empresa_codigo_externo_uidx
  on public.vendas_fornecedores (empresa_id, codigo_externo)
  where codigo_externo is not null;

alter table public.vendas_mobile_catalogo_produtos
  add column if not exists fornecedor_id uuid references public.vendas_fornecedores(id) on delete set null,
  add column if not exists estoque_maximo numeric(14,3) check (estoque_maximo is null or estoque_maximo >= 0);
create index if not exists vendas_catalogo_produtos_fornecedor_idx
  on public.vendas_mobile_catalogo_produtos (fornecedor_id) where fornecedor_id is not null;

create table if not exists public.custos_importacoes_catalogo_backups (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  catalogo_id uuid not null references public.vendas_mobile_catalogos(id) on delete cascade,
  origem text not null,
  retrato jsonb not null check (jsonb_typeof(retrato) = 'object'),
  criado_por uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now()
);
alter table public.custos_importacoes_catalogo_backups enable row level security;
create policy custos_importacoes_catalogo_backups_leitura on public.custos_importacoes_catalogo_backups for select to authenticated
  using (public.custos_pode_acessar_empresa(empresa_id, false));
revoke all on public.custos_importacoes_catalogo_backups from public, anon;
grant select on public.custos_importacoes_catalogo_backups to authenticated;

create or replace function public.custos_substituir_catalogo_completo_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid,
  p_origem text,
  p_produtos jsonb,
  p_tabelas jsonb,
  p_precos jsonb,
  p_aplicar boolean default false
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_produto jsonb;
  v_tabela jsonb;
  v_preco jsonb;
  v_catalogo public.vendas_mobile_catalogos;
  v_backup_id uuid;
  v_produto_id uuid;
  v_fornecedor_id uuid;
  v_tabela_id uuid;
  v_local_id uuid;
  v_saldo_id uuid;
  v_criados integer := 0;
  v_precos integer := 0;
  v_estoques integer := 0;
  v_fornecedores integer := 0;
  v_codigo_fornecedor bigint;
  v_sku text;
  v_nome_fornecedor text;
  v_codigo_fornecedor_externo text;
  v_estoque_atual numeric;
  v_estoque_minimo numeric;
  v_estoque_maximo numeric;
begin
  if auth.uid() is not null and not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para substituir o cadastro.';
  end if;
  select * into v_catalogo from public.vendas_mobile_catalogos
   where id = p_catalogo_id and empresa_id = p_empresa_id for update;
  if not found then raise exception 'O catálogo informado não pertence a esta empresa.'; end if;
  if jsonb_typeof(coalesce(p_produtos, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_tabelas, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_precos, '[]'::jsonb)) <> 'array' then
    raise exception 'A estrutura da importação é inválida.';
  end if;
  if jsonb_array_length(coalesce(p_produtos, '[]'::jsonb)) = 0 then raise exception 'Não há produtos para importar.'; end if;
  if exists (select 1 from jsonb_array_elements(p_produtos) item group by upper(trim(item->>'sku')) having count(*) > 1)
     or exists (select 1 from jsonb_array_elements(p_produtos) item where nullif(trim(item->>'sku'),'') is null) then
    raise exception 'A importação possui códigos de produto ausentes ou repetidos.';
  end if;
  if exists (select 1 from jsonb_array_elements(p_tabelas) item group by upper(trim(item->>'codigo')) having count(*) > 1)
     or exists (select 1 from jsonb_array_elements(p_precos) item group by upper(trim(item->>'sku')), upper(trim(item->>'tabela_codigo')) having count(*) > 1) then
    raise exception 'A importação possui uma tabela ou preço repetido.';
  end if;
  if exists (select 1 from jsonb_array_elements(p_precos) item where coalesce((item->>'preco')::numeric, -1) < 0) then
    raise exception 'Os preços precisam ser iguais ou maiores que zero.';
  end if;
  if exists (
    select 1 from public.vendas_estoque_movimentos movimento
    join public.vendas_estoque_saldos saldo on saldo.id = movimento.saldo_id
    where saldo.produto_id in (select id from public.vendas_mobile_catalogo_produtos where catalogo_id = p_catalogo_id)
  ) or exists (
    select 1 from public.vendas_operacao_itens item
    where item.produto_id in (select id from public.vendas_mobile_catalogo_produtos where catalogo_id = p_catalogo_id)
  ) or exists (
    select 1 from public.vendas_os_materiais material
    where material.produto_id in (select id from public.vendas_mobile_catalogo_produtos where catalogo_id = p_catalogo_id)
  ) then
    raise exception 'Este catálogo já possui movimentações comerciais e não pode ser substituído automaticamente.';
  end if;

  select local.id into v_local_id from public.vendas_estoque_locais local
   where local.empresa_id = p_empresa_id and local.padrao and local.ativo limit 1;

  if not p_aplicar then
    return jsonb_build_object('produtos_criados', jsonb_array_length(p_produtos), 'precos_atualizados', jsonb_array_length(p_precos),
      'fornecedores', (select count(distinct nullif(trim(item->>'fornecedor_nome'),'')) from jsonb_array_elements(p_produtos) item),
      'estoques', (select count(*) from jsonb_array_elements(p_produtos) item where coalesce((item->>'estoque_atual')::numeric,0) <> 0),
      'aplicado', false);
  end if;

  insert into public.custos_importacoes_catalogo_backups (empresa_id, catalogo_id, origem, retrato)
  values (p_empresa_id, p_catalogo_id, coalesce(nullif(trim(p_origem),''),'importacao'), jsonb_build_object(
    'produtos', coalesce((select jsonb_agg(to_jsonb(produto)) from public.vendas_mobile_catalogo_produtos produto where produto.catalogo_id=p_catalogo_id),'[]'::jsonb),
    'tabelas', coalesce((select jsonb_agg(to_jsonb(tabela)) from public.custos_tabelas_preco tabela where tabela.empresa_id=p_empresa_id),'[]'::jsonb),
    'precos', coalesce((select jsonb_agg(to_jsonb(item)) from public.custos_tabela_preco_itens item join public.custos_tabelas_preco tabela on tabela.id=item.tabela_preco_id where tabela.empresa_id=p_empresa_id),'[]'::jsonb),
    'saldos', coalesce((select jsonb_agg(to_jsonb(saldo)) from public.vendas_estoque_saldos saldo where saldo.produto_id in (select id from public.vendas_mobile_catalogo_produtos where catalogo_id=p_catalogo_id)),'[]'::jsonb),
    'documento_custos', (select documento from public.custos_documentos where empresa_id=p_empresa_id)
  )) returning id into v_backup_id;

  delete from public.vendas_estoque_saldos where produto_id in (select id from public.vendas_mobile_catalogo_produtos where catalogo_id=p_catalogo_id);
  delete from public.custos_tabelas_preco where empresa_id=p_empresa_id and not padrao;
  delete from public.vendas_mobile_catalogo_produtos where catalogo_id=p_catalogo_id;
  update public.custos_documentos set documento='{"version":1,"recursos":[],"composicoes":{},"cenarios":[],"historico":[]}'::jsonb where empresa_id=p_empresa_id;
  perform public.custos_garantir_tabela_padrao_rpc(p_empresa_id);

  for v_tabela in select value from jsonb_array_elements(p_tabelas) loop
    if upper(trim(v_tabela->>'codigo')) = 'PADRAO' then continue; end if;
    insert into public.custos_tabelas_preco(empresa_id,codigo,nome,descricao,padrao,ativo)
    values(p_empresa_id,upper(trim(v_tabela->>'codigo')),trim(v_tabela->>'nome'),nullif(trim(v_tabela->>'descricao'),''),false,true);
  end loop;

  for v_produto in select value from jsonb_array_elements(p_produtos) loop
    v_sku := upper(trim(v_produto->>'sku'));
    v_nome_fornecedor := nullif(trim(v_produto->>'fornecedor_nome'),'');
    v_codigo_fornecedor_externo := nullif(trim(v_produto->>'fornecedor_codigo_externo'),'');
    v_fornecedor_id := null;
    if v_nome_fornecedor is not null then
      select id into v_fornecedor_id from public.vendas_fornecedores
       where empresa_id=p_empresa_id and (codigo_externo=v_codigo_fornecedor_externo or (v_codigo_fornecedor_externo is null and lower(razao_social)=lower(v_nome_fornecedor))) limit 1;
      if v_fornecedor_id is null then
        select coalesce(max(codigo),0)+1 into v_codigo_fornecedor from public.vendas_fornecedores where empresa_id=p_empresa_id;
        insert into public.vendas_fornecedores(empresa_id,codigo,codigo_externo,razao_social,situacao)
        values(p_empresa_id,v_codigo_fornecedor,v_codigo_fornecedor_externo,v_nome_fornecedor,'ativo') returning id into v_fornecedor_id;
        v_fornecedores := v_fornecedores + 1;
      end if;
    end if;
    insert into public.vendas_mobile_catalogo_produtos(
      catalogo_id,sku,tipo_item,nome,marca,categoria,descricao,preco_custo,preco_venda,unidade,codigo_barras,ativo,disponivel_catalogo,
      ncm,cest,origem_mercadoria,unidade_tributavel,peso_liquido,peso_bruto,cst,csosn,aliquota_icms,aliquota_ipi,aliquota_pis,aliquota_cofins,observacoes_fiscais,fornecedor_id,estoque_maximo,atualizado_em
    ) values (
      p_catalogo_id,v_sku,coalesce(nullif(trim(v_produto->>'tipo_item'),''),'produto'),trim(v_produto->>'nome'),nullif(trim(v_produto->>'marca'),''),nullif(trim(v_produto->>'categoria'),''),nullif(trim(v_produto->>'descricao'),''),
      coalesce((v_produto->>'preco_custo')::numeric,0),coalesce((v_produto->>'preco_venda')::numeric,0),coalesce(nullif(trim(v_produto->>'unidade'),''),'un'),nullif(trim(v_produto->>'codigo_barras'),''),
      coalesce((v_produto->>'ativo')::boolean,true),coalesce((v_produto->>'disponivel_catalogo')::boolean,false),nullif(trim(v_produto->>'ncm'),''),nullif(trim(v_produto->>'cest'),''),nullif(trim(v_produto->>'origem_mercadoria'),''),nullif(trim(v_produto->>'unidade_tributavel'),''),
      nullif(v_produto->>'peso_liquido','')::numeric,nullif(v_produto->>'peso_bruto','')::numeric,nullif(trim(v_produto->>'cst'),''),nullif(trim(v_produto->>'csosn'),''),nullif(v_produto->>'aliquota_icms','')::numeric,nullif(v_produto->>'aliquota_ipi','')::numeric,nullif(v_produto->>'aliquota_pis','')::numeric,nullif(v_produto->>'aliquota_cofins','')::numeric,nullif(trim(v_produto->>'observacoes_fiscais'),''),v_fornecedor_id,nullif(v_produto->>'estoque_maximo','')::numeric,now()
    ) returning id into v_produto_id;
    v_criados := v_criados + 1;
    v_estoque_atual := coalesce((v_produto->>'estoque_atual')::numeric,0);
    v_estoque_minimo := coalesce((v_produto->>'estoque_minimo')::numeric,0);
    v_estoque_maximo := nullif(v_produto->>'estoque_maximo','')::numeric;
    if v_local_id is not null then
      insert into public.vendas_estoque_saldos(empresa_id,local_id,produto_id,saldo_fisico,saldo_reservado,estoque_minimo,permite_negativo)
      values(p_empresa_id,v_local_id,v_produto_id,v_estoque_atual,0,v_estoque_minimo,v_estoque_atual<0) returning id into v_saldo_id;
      if v_estoque_atual <> 0 then
        insert into public.vendas_estoque_movimentos(empresa_id,saldo_id,tipo,quantidade,saldo_fisico_anterior,saldo_fisico_final,saldo_reservado_anterior,saldo_reservado_final,parceiro_retrato,observacoes,chave_idempotencia,data_movimentacao)
        values(p_empresa_id,v_saldo_id,'inventario',v_estoque_atual,0,v_estoque_atual,0,0,jsonb_build_object('origem','Importação de cadastro'),'Saldo inicial importado do cadastro Tridium.',concat('importacao-catalogo-',v_backup_id,'-',v_sku),current_date);
      end if;
      v_estoques := v_estoques + 1;
    end if;
  end loop;

  for v_preco in select value from jsonb_array_elements(p_precos) loop
    select id into v_produto_id from public.vendas_mobile_catalogo_produtos where catalogo_id=p_catalogo_id and sku=upper(trim(v_preco->>'sku'));
    select id into v_tabela_id from public.custos_tabelas_preco where empresa_id=p_empresa_id and codigo=upper(trim(v_preco->>'tabela_codigo'));
    if v_produto_id is null or v_tabela_id is null then raise exception 'Preço aponta para produto ou tabela inexistente.'; end if;
    if exists(select 1 from public.custos_tabelas_preco where id=v_tabela_id and padrao) then
      update public.vendas_mobile_catalogo_produtos set preco_venda=round((v_preco->>'preco')::numeric,2), atualizado_em=now() where id=v_produto_id;
    else
      insert into public.custos_tabela_preco_itens(tabela_preco_id,produto_id,preco) values(v_tabela_id,v_produto_id,round((v_preco->>'preco')::numeric,2));
    end if;
    v_precos := v_precos + 1;
  end loop;
  insert into public.custos_importacoes_produtos_precos(empresa_id,arquivo_nome,produtos_criados,produtos_atualizados,precos_atualizados)
  values(p_empresa_id,coalesce(nullif(trim(p_origem),''),'importacao'),v_criados,0,v_precos);
  return jsonb_build_object('backup_id',v_backup_id,'produtos_criados',v_criados,'precos_atualizados',v_precos,'fornecedores',v_fornecedores,'estoques',v_estoques,'aplicado',true);
end $$;

revoke all on function public.custos_substituir_catalogo_completo_rpc(uuid,uuid,text,jsonb,jsonb,jsonb,boolean) from public, anon;
grant execute on function public.custos_substituir_catalogo_completo_rpc(uuid,uuid,text,jsonb,jsonb,jsonb,boolean) to authenticated;

commit;
