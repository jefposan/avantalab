-- Tabelas de preços e importação segura do cadastro mestre para a Gestão.
-- Esta precificação é interna da empresa e não se conecta ao catálogo de
-- divulgação nem aos clientes e pedidos do AvantaVendas.
begin;

create table if not exists public.custos_tabelas_preco (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo text not null,
  nome text not null,
  descricao text,
  padrao boolean not null default false,
  ativo boolean not null default true,
  criado_por uuid references auth.users(id) on delete set null default auth.uid(),
  atualizado_por uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint custos_tabelas_preco_codigo_check check (codigo = upper(codigo) and codigo ~ '^[A-Z0-9_-]{2,30}$'),
  constraint custos_tabelas_preco_nome_check check (length(trim(nome)) between 2 and 80)
);
create unique index if not exists custos_tabelas_preco_empresa_codigo_uidx
  on public.custos_tabelas_preco (empresa_id, upper(codigo));
create unique index if not exists custos_tabelas_preco_empresa_padrao_uidx
  on public.custos_tabelas_preco (empresa_id) where padrao;
create index if not exists custos_tabelas_preco_empresa_idx
  on public.custos_tabelas_preco (empresa_id, ativo, nome);

create table if not exists public.custos_tabela_preco_itens (
  tabela_preco_id uuid not null references public.custos_tabelas_preco(id) on delete cascade,
  produto_id uuid not null references public.vendas_mobile_catalogo_produtos(id) on delete cascade,
  preco numeric(12,2) not null check (preco >= 0),
  atualizado_por uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (tabela_preco_id, produto_id)
);
create index if not exists custos_tabela_preco_itens_produto_idx
  on public.custos_tabela_preco_itens (produto_id, tabela_preco_id);

create table if not exists public.custos_tabela_preco_historico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  tabela_preco_id uuid references public.custos_tabelas_preco(id) on delete set null,
  produto_id uuid references public.vendas_mobile_catalogo_produtos(id) on delete set null,
  preco_anterior numeric(12,2),
  preco_novo numeric(12,2) not null check (preco_novo >= 0),
  origem text not null default 'manual' check (origem in ('manual', 'importacao')),
  alterado_por uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now()
);
create index if not exists custos_tabela_preco_historico_empresa_idx
  on public.custos_tabela_preco_historico (empresa_id, criado_em desc);

create table if not exists public.custos_importacoes_produtos_precos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  arquivo_nome text not null,
  exportado_em timestamptz,
  produtos_criados integer not null default 0,
  produtos_atualizados integer not null default 0,
  precos_atualizados integer not null default 0,
  importado_por uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now()
);

insert into public.custos_tabelas_preco (empresa_id, codigo, nome, descricao, padrao, ativo)
select distinct catalogo.empresa_id, 'PADRAO', 'Tabela padrão',
       'Preço de venda principal do cadastro de produtos.', true, true
  from public.vendas_mobile_catalogos catalogo
on conflict (empresa_id) where padrao do nothing;

create or replace function public.custos_tabelas_preco_metadados()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.empresa_id := old.empresa_id;
    new.padrao := old.padrao;
    if old.padrao then
      new.codigo := old.codigo;
      new.nome := old.nome;
      new.ativo := true;
    end if;
  end if;
  new.codigo := upper(trim(new.codigo));
  new.nome := trim(new.nome);
  new.descricao := nullif(trim(new.descricao), '');
  new.atualizado_por := auth.uid();
  new.atualizado_em := now();
  return new;
end;
$$;
drop trigger if exists custos_tabelas_preco_metadados on public.custos_tabelas_preco;
create trigger custos_tabelas_preco_metadados before insert or update on public.custos_tabelas_preco
for each row execute function public.custos_tabelas_preco_metadados();

create or replace function public.custos_tabela_preco_itens_metadados()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1
      from public.custos_tabelas_preco tabela
      join public.vendas_mobile_catalogos catalogo on catalogo.empresa_id = tabela.empresa_id
      join public.vendas_mobile_catalogo_produtos produto on produto.catalogo_id = catalogo.id
     where tabela.id = new.tabela_preco_id and produto.id = new.produto_id
  ) then raise exception 'O produto e a tabela de preço precisam pertencer à mesma empresa.'; end if;
  new.atualizado_por := auth.uid();
  new.atualizado_em := now();
  return new;
end;
$$;
drop trigger if exists custos_tabela_preco_itens_metadados on public.custos_tabela_preco_itens;
create trigger custos_tabela_preco_itens_metadados before insert or update on public.custos_tabela_preco_itens
for each row execute function public.custos_tabela_preco_itens_metadados();

alter table public.custos_tabelas_preco enable row level security;
alter table public.custos_tabela_preco_itens enable row level security;
alter table public.custos_tabela_preco_historico enable row level security;
alter table public.custos_importacoes_produtos_precos enable row level security;

create policy custos_tabelas_preco_leitura on public.custos_tabelas_preco for select to authenticated
  using (public.custos_pode_acessar_empresa(empresa_id, false));
create policy custos_tabelas_preco_gestao on public.custos_tabelas_preco for all to authenticated
  using (public.custos_pode_acessar_empresa(empresa_id, true))
  with check (public.custos_pode_acessar_empresa(empresa_id, true));
create policy custos_tabela_preco_itens_leitura on public.custos_tabela_preco_itens for select to authenticated using (
  exists (
    select 1 from public.custos_tabelas_preco tabela
     where tabela.id = tabela_preco_id
       and public.custos_pode_acessar_empresa(tabela.empresa_id, false)
  )
);
create policy custos_tabela_preco_itens_gestao on public.custos_tabela_preco_itens for all to authenticated
  using (exists (select 1 from public.custos_tabelas_preco tabela where tabela.id = tabela_preco_id and public.custos_pode_acessar_empresa(tabela.empresa_id, true)))
  with check (exists (select 1 from public.custos_tabelas_preco tabela where tabela.id = tabela_preco_id and public.custos_pode_acessar_empresa(tabela.empresa_id, true)));
create policy custos_tabela_preco_historico_leitura on public.custos_tabela_preco_historico for select to authenticated
  using (public.custos_pode_acessar_empresa(empresa_id, false));
create policy custos_importacoes_precos_leitura on public.custos_importacoes_produtos_precos for select to authenticated
  using (public.custos_pode_acessar_empresa(empresa_id, false));

grant select, insert, update on public.custos_tabelas_preco to authenticated;
grant select, insert, update, delete on public.custos_tabela_preco_itens to authenticated;
grant select on public.custos_tabela_preco_historico to authenticated;
grant select on public.custos_importacoes_produtos_precos to authenticated;

create or replace function public.custos_garantir_tabela_padrao_rpc(p_empresa_id uuid)
returns public.custos_tabelas_preco
language plpgsql security definer set search_path = public as $$
declare v_tabela public.custos_tabelas_preco;
begin
  if not public.custos_pode_acessar_empresa(p_empresa_id, false) then raise exception 'Sem acesso às tabelas de preço desta empresa.'; end if;
  select * into v_tabela from public.custos_tabelas_preco where empresa_id = p_empresa_id and padrao limit 1;
  if found then return v_tabela; end if;
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then raise exception 'A tabela padrão ainda não foi preparada por um usuário com permissão de edição.'; end if;
  insert into public.custos_tabelas_preco (empresa_id, codigo, nome, descricao, padrao, ativo)
  values (p_empresa_id, 'PADRAO', 'Tabela padrão', 'Preço de venda principal do cadastro de produtos.', true, true)
  returning * into v_tabela;
  return v_tabela;
end;
$$;

create or replace function public.custos_salvar_tabela_preco_rpc(
  p_empresa_id uuid, p_tabela_id uuid, p_codigo text, p_nome text,
  p_descricao text default null, p_ativo boolean default true
)
returns public.custos_tabelas_preco
language plpgsql security definer set search_path = public as $$
declare v_tabela public.custos_tabelas_preco;
begin
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then raise exception 'Sem permissão para alterar tabelas de preço.'; end if;
  if p_tabela_id is null then
    insert into public.custos_tabelas_preco (empresa_id, codigo, nome, descricao, padrao, ativo)
    values (p_empresa_id, upper(trim(p_codigo)), trim(p_nome), p_descricao, false, coalesce(p_ativo, true))
    returning * into v_tabela;
  else
    update public.custos_tabelas_preco
       set codigo = case when padrao then codigo else upper(trim(p_codigo)) end,
           nome = case when padrao then nome else trim(p_nome) end,
           descricao = p_descricao,
           ativo = case when padrao then true else coalesce(p_ativo, ativo) end
     where id = p_tabela_id and empresa_id = p_empresa_id
    returning * into v_tabela;
    if not found then raise exception 'Tabela de preço não localizada.'; end if;
  end if;
  return v_tabela;
exception when unique_violation then
  raise exception 'Este código de tabela já está em uso.';
end;
$$;

create or replace function public.custos_salvar_preco_tabela_rpc(
  p_empresa_id uuid, p_tabela_id uuid, p_produto_id uuid, p_preco numeric
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_tabela public.custos_tabelas_preco;
  v_produto public.vendas_mobile_catalogo_produtos;
  v_anterior numeric(12,2);
begin
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then raise exception 'Sem permissão para alterar preços.'; end if;
  if p_preco is null or p_preco < 0 then raise exception 'Informe um preço igual ou maior que zero.'; end if;
  select * into v_tabela from public.custos_tabelas_preco where id = p_tabela_id and empresa_id = p_empresa_id;
  if not found then raise exception 'Tabela de preço não localizada.'; end if;
  select produto.* into v_produto
    from public.vendas_mobile_catalogo_produtos produto
    join public.vendas_mobile_catalogos catalogo on catalogo.id = produto.catalogo_id
   where produto.id = p_produto_id and catalogo.empresa_id = p_empresa_id;
  if not found then raise exception 'Produto não localizado no cadastro desta empresa.'; end if;

  if v_tabela.padrao then
    v_anterior := v_produto.preco_venda;
    update public.vendas_mobile_catalogo_produtos set preco_venda = round(p_preco, 2), atualizado_em = now() where id = v_produto.id;
  else
    select preco into v_anterior from public.custos_tabela_preco_itens where tabela_preco_id = v_tabela.id and produto_id = v_produto.id;
    if not found then v_anterior := v_produto.preco_venda; end if;
    insert into public.custos_tabela_preco_itens (tabela_preco_id, produto_id, preco)
    values (v_tabela.id, v_produto.id, round(p_preco, 2))
    on conflict (tabela_preco_id, produto_id) do update set preco = excluded.preco;
  end if;
  if v_anterior is distinct from round(p_preco, 2) then
    insert into public.custos_tabela_preco_historico
      (empresa_id, tabela_preco_id, produto_id, preco_anterior, preco_novo, origem)
    values (p_empresa_id, v_tabela.id, v_produto.id, v_anterior, round(p_preco, 2), 'manual');
  end if;
  return jsonb_build_object('tabela_id', v_tabela.id, 'produto_id', v_produto.id, 'preco', round(p_preco, 2));
end;
$$;

create or replace function public.custos_importar_produtos_precos_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid,
  p_arquivo_nome text,
  p_exportado_em timestamptz,
  p_produtos jsonb,
  p_precos jsonb,
  p_aplicar boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
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
begin
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
          coalesce((v_linha ->> 'ativo')::boolean, true), coalesce((v_linha ->> 'disponivel_catalogo')::boolean, false),
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
          ativo = coalesce((v_linha ->> 'ativo')::boolean, true), disponivel_catalogo = coalesce((v_linha ->> 'disponivel_catalogo')::boolean, false),
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
$$;

revoke all on function public.custos_garantir_tabela_padrao_rpc(uuid) from public, anon;
revoke all on function public.custos_salvar_tabela_preco_rpc(uuid, uuid, text, text, text, boolean) from public, anon;
revoke all on function public.custos_salvar_preco_tabela_rpc(uuid, uuid, uuid, numeric) from public, anon;
revoke all on function public.custos_importar_produtos_precos_rpc(uuid, uuid, text, timestamptz, jsonb, jsonb, boolean) from public, anon;
grant execute on function public.custos_garantir_tabela_padrao_rpc(uuid) to authenticated;
grant execute on function public.custos_salvar_tabela_preco_rpc(uuid, uuid, text, text, text, boolean) to authenticated;
grant execute on function public.custos_salvar_preco_tabela_rpc(uuid, uuid, uuid, numeric) to authenticated;
grant execute on function public.custos_importar_produtos_precos_rpc(uuid, uuid, text, timestamptz, jsonb, jsonb, boolean) to authenticated;

commit;
