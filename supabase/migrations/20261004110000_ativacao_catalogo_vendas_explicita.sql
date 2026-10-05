-- Cada catálogo ativo participa do Vendas; ativar outro não desativa os demais.
-- Os produtos de catálogos desativados permanecem preservados.
begin;

create or replace function public.custos_definir_catalogo_atual_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid
)
returns public.vendas_mobile_catalogos
language plpgsql security definer set search_path = public as $$
declare v_catalogo public.vendas_mobile_catalogos;
begin
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para gerenciar os catálogos desta empresa.';
  end if;
  perform 1 from public.empresas where id = p_empresa_id for update;
  select * into v_catalogo from public.vendas_mobile_catalogos
   where id = p_catalogo_id and empresa_id = p_empresa_id for update;
  if not found then raise exception 'Catálogo não localizado nesta empresa.'; end if;

  update public.vendas_mobile_catalogos set padrao = false, atualizado_em = now()
   where empresa_id = p_empresa_id and padrao;
  update public.vendas_mobile_catalogos
     set ativo = true, padrao = true, atualizado_em = now()
   where id = v_catalogo.id returning * into v_catalogo;
  return v_catalogo;
end;
$$;

create or replace function public.custos_alterar_status_catalogo_empresa_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid,
  p_ativo boolean
)
returns public.vendas_mobile_catalogos
language plpgsql security definer set search_path = public as $$
declare v_catalogo public.vendas_mobile_catalogos;
begin
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para gerenciar os catálogos desta empresa.';
  end if;
  perform 1 from public.empresas where id = p_empresa_id for update;
  select * into v_catalogo from public.vendas_mobile_catalogos
   where id = p_catalogo_id and empresa_id = p_empresa_id for update;
  if not found then raise exception 'Catálogo não localizado nesta empresa.'; end if;
  update public.vendas_mobile_catalogos
     set ativo = coalesce(p_ativo, false),
         padrao = case when coalesce(p_ativo, false) then padrao else false end,
         atualizado_em = now()
   where id = v_catalogo.id
   returning * into v_catalogo;
  if not exists (select 1 from public.vendas_mobile_catalogos
                  where empresa_id = p_empresa_id and ativo and padrao) then
    update public.vendas_mobile_catalogos set padrao = true, atualizado_em = now()
     where id = (select id from public.vendas_mobile_catalogos
                  where empresa_id = p_empresa_id and ativo
                  order by criado_em, id limit 1)
     returning * into v_catalogo;
  end if;
  select * into v_catalogo from public.vendas_mobile_catalogos where id = p_catalogo_id;
  return v_catalogo;
end;
$$;

create or replace function public.definir_catalogo_atual_conteudo_vendas_mobile_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid
)
returns public.vendas_mobile_catalogos
language plpgsql security definer set search_path = public as $$
declare v_catalogo public.vendas_mobile_catalogos;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.vendas_mobile_pode_publicar_conteudo(p_empresa_id) then
    raise exception 'Você não tem permissão para administrar os catálogos deste perfil.';
  end if;
  perform 1 from public.empresas where id = p_empresa_id for update;
  select * into v_catalogo from public.vendas_mobile_catalogos
   where id = p_catalogo_id and empresa_id = p_empresa_id for update;
  if not found then raise exception 'Catálogo não localizado neste perfil.'; end if;

  update public.vendas_mobile_catalogos set padrao = false, atualizado_em = now()
   where empresa_id = p_empresa_id and padrao;
  update public.vendas_mobile_catalogos
     set ativo = true, padrao = true, atualizado_em = now()
   where id = v_catalogo.id returning * into v_catalogo;
  return v_catalogo;
end;
$$;

create or replace function public.alterar_status_catalogo_conteudo_vendas_mobile_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid,
  p_ativo boolean
)
returns public.vendas_mobile_catalogos
language plpgsql security definer set search_path = public as $$
declare v_catalogo public.vendas_mobile_catalogos;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.vendas_mobile_pode_publicar_conteudo(p_empresa_id) then
    raise exception 'Você não tem permissão para administrar os catálogos deste perfil.';
  end if;
  perform 1 from public.empresas where id = p_empresa_id for update;
  select * into v_catalogo from public.vendas_mobile_catalogos
   where id = p_catalogo_id and empresa_id = p_empresa_id for update;
  if not found then raise exception 'Catálogo não localizado neste perfil.'; end if;
  update public.vendas_mobile_catalogos
     set ativo = coalesce(p_ativo, false),
         padrao = case when coalesce(p_ativo, false) then padrao else false end,
         atualizado_em = now()
   where id = v_catalogo.id
   returning * into v_catalogo;
  if not exists (select 1 from public.vendas_mobile_catalogos
                  where empresa_id = p_empresa_id and ativo and padrao) then
    update public.vendas_mobile_catalogos set padrao = true, atualizado_em = now()
     where id = (select id from public.vendas_mobile_catalogos
                  where empresa_id = p_empresa_id and ativo
                  order by criado_em, id limit 1)
     returning * into v_catalogo;
  end if;
  select * into v_catalogo from public.vendas_mobile_catalogos where id = p_catalogo_id;
  return v_catalogo;
end;
$$;

-- A gestão de conteúdo mostra todos os catálogos ativos simultaneamente.
create or replace function public.listar_produtos_conteudo_vendas_mobile_rpc(p_empresa_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_catalogo_id uuid;
  v_produtos jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.vendas_mobile_pode_publicar_conteudo(p_empresa_id) then
    raise exception 'Você não tem permissão para administrar o catálogo deste perfil.';
  end if;
  select id into v_catalogo_id from public.vendas_mobile_catalogos
   where empresa_id = p_empresa_id and ativo = true
   order by padrao desc, criado_em, id limit 1;
  if v_catalogo_id is null then
    if not exists (select 1 from public.vendas_mobile_catalogos where empresa_id = p_empresa_id) then
      insert into public.vendas_mobile_catalogos (empresa_id, nome, codigo, origem, ativo, padrao)
      values (p_empresa_id, 'Catálogo principal', 'PRINCIPAL', 'externa', true, true)
      returning id into v_catalogo_id;
    else
      return jsonb_build_object('catalogo_id', null, 'produtos', '[]'::jsonb);
    end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', produto.id, 'catalogo_id', produto.catalogo_id,
    'sku', produto.sku, 'nome', produto.nome, 'marca', produto.marca,
    'categoria', produto.categoria, 'descricao', produto.descricao,
    'preco_divulgacao', produto.preco_divulgacao, 'unidade', produto.unidade,
    'imagem_url', produto.imagem_url, 'ncm', produto.ncm, 'codigo_barras', produto.codigo_barras,
    'ativo', produto.ativo, 'atualizado_em', produto.atualizado_em
  ) order by produto.nome, produto.id), '[]'::jsonb) into v_produtos
    from public.vendas_mobile_catalogo_produtos produto
    join public.vendas_mobile_catalogos catalogo on catalogo.id = produto.catalogo_id
   where catalogo.empresa_id = p_empresa_id and catalogo.ativo = true
     and produto.disponivel_catalogo = true;
  return jsonb_build_object('catalogo_id', v_catalogo_id, 'produtos', v_produtos);
end;
$$;

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
  if p_produto_id is not null and v_sku = '' then v_sku := 'LEGADO-' || upper(replace(p_produto_id::text, '-', '')); end if;
  if v_sku = '' or v_nome = '' or v_preco is null or v_preco <= 0 then
    raise exception 'Código, nome e preço sugerido de revenda são obrigatórios.';
  end if;
  if p_produto_id is null then
    select id into v_catalogo_id from public.vendas_mobile_catalogos
     where empresa_id = p_empresa_id and ativo = true
     order by padrao desc, criado_em, id limit 1;
    if v_catalogo_id is null then
      if exists (select 1 from public.vendas_mobile_catalogos where empresa_id = p_empresa_id) then
        raise exception 'Ative um catálogo antes de cadastrar produtos.';
      end if;
      insert into public.vendas_mobile_catalogos (empresa_id, nome, codigo, origem, ativo, padrao)
      values (p_empresa_id, 'Catálogo principal', 'PRINCIPAL', 'externa', true, true)
      returning id into v_catalogo_id;
    end if;
    insert into public.vendas_mobile_catalogo_produtos (catalogo_id, sku, tipo_item, disponivel_catalogo, codigo_barras, marca, categoria, nome, descricao, preco_divulgacao, preco_custo, preco_venda, unidade, imagem_url, ncm, ativo, atualizado_em)
    values (v_catalogo_id, v_sku, 'produto', true, nullif(trim(p_dados ->> 'codigo_barras'), ''), nullif(trim(p_dados ->> 'marca'), ''), nullif(trim(p_dados ->> 'categoria'), ''), v_nome, nullif(trim(p_dados ->> 'descricao'), ''), v_preco, 0, 0, v_unidade, nullif(trim(p_dados ->> 'imagem_url'), ''), nullif(trim(p_dados ->> 'ncm'), ''), v_ativo, now())
    returning id into v_produto_id;
  else
    select produto.catalogo_id into v_catalogo_id
      from public.vendas_mobile_catalogo_produtos produto
      join public.vendas_mobile_catalogos catalogo on catalogo.id = produto.catalogo_id
     where produto.id = p_produto_id and catalogo.empresa_id = p_empresa_id and catalogo.ativo = true;
    if v_catalogo_id is null then raise exception 'Produto não localizado em catálogo ativo deste perfil.'; end if;
    update public.vendas_mobile_catalogo_produtos set
      sku = v_sku, tipo_item = 'produto', disponivel_catalogo = true,
      codigo_barras = nullif(trim(p_dados ->> 'codigo_barras'), ''), marca = nullif(trim(p_dados ->> 'marca'), ''), categoria = nullif(trim(p_dados ->> 'categoria'), ''), nome = v_nome, descricao = nullif(trim(p_dados ->> 'descricao'), ''), preco_divulgacao = v_preco, unidade = v_unidade, imagem_url = nullif(trim(p_dados ->> 'imagem_url'), ''), ncm = nullif(trim(p_dados ->> 'ncm'), ''), ativo = v_ativo, atualizado_em = now()
     where id = p_produto_id and catalogo_id = v_catalogo_id returning id into v_produto_id;
    if v_produto_id is null then raise exception 'Produto não localizado em catálogo ativo deste perfil.'; end if;
  end if;
  return jsonb_build_object('id', v_produto_id);
end;
$$;

revoke all on function public.custos_definir_catalogo_atual_rpc(uuid, uuid) from public, anon;
revoke all on function public.custos_alterar_status_catalogo_empresa_rpc(uuid, uuid, boolean) from public, anon;
revoke all on function public.definir_catalogo_atual_conteudo_vendas_mobile_rpc(uuid, uuid) from public, anon;
revoke all on function public.alterar_status_catalogo_conteudo_vendas_mobile_rpc(uuid, uuid, boolean) from public, anon;
revoke all on function public.listar_produtos_conteudo_vendas_mobile_rpc(uuid) from public, anon;
revoke all on function public.salvar_produto_conteudo_vendas_mobile_rpc(uuid, uuid, jsonb) from public, anon;
grant execute on function public.custos_definir_catalogo_atual_rpc(uuid, uuid) to authenticated;
grant execute on function public.custos_alterar_status_catalogo_empresa_rpc(uuid, uuid, boolean) to authenticated;
grant execute on function public.definir_catalogo_atual_conteudo_vendas_mobile_rpc(uuid, uuid) to authenticated;
grant execute on function public.alterar_status_catalogo_conteudo_vendas_mobile_rpc(uuid, uuid, boolean) to authenticated;
grant execute on function public.listar_produtos_conteudo_vendas_mobile_rpc(uuid) to authenticated;
grant execute on function public.salvar_produto_conteudo_vendas_mobile_rpc(uuid, uuid, jsonb) to authenticated;

commit;
