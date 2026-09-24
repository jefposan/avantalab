-- O gerenciamento de catálogos também pertence ao Conteúdo AvantaVendas.
-- As rotinas abaixo usam a permissão editorial do Vendas sem expor dados
-- internos de custos e mantêm apenas um catálogo atual por empresa.

begin;

create or replace function public.listar_catalogos_conteudo_vendas_mobile_rpc(p_empresa_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_catalogos jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.vendas_mobile_pode_publicar_conteudo(p_empresa_id) then
    raise exception 'Você não tem permissão para administrar os catálogos deste perfil.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', catalogo.id,
    'nome', catalogo.nome,
    'codigo', catalogo.codigo,
    'origem', catalogo.origem,
    'ativo', catalogo.ativo,
    'padrao', catalogo.padrao,
    'atualizado_em', catalogo.atualizado_em
  ) order by catalogo.padrao desc, catalogo.ativo desc, catalogo.nome), '[]'::jsonb)
    into v_catalogos
    from public.vendas_mobile_catalogos catalogo
   where catalogo.empresa_id = p_empresa_id;

  return jsonb_build_object('catalogos', v_catalogos);
end;
$$;

create or replace function public.salvar_catalogo_conteudo_vendas_mobile_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid default null,
  p_nome text default '',
  p_codigo text default null
)
returns public.vendas_mobile_catalogos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_catalogo public.vendas_mobile_catalogos;
  v_nome text := nullif(trim(coalesce(p_nome, '')), '');
  v_codigo text := upper(regexp_replace(trim(coalesce(p_codigo, '')), '[^A-Za-z0-9_-]+', '_', 'g'));
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.vendas_mobile_pode_publicar_conteudo(p_empresa_id) then
    raise exception 'Você não tem permissão para administrar os catálogos deste perfil.';
  end if;
  if v_nome is null then raise exception 'Informe o nome do catálogo.'; end if;

  if p_catalogo_id is null then
    if v_codigo = '' then
      v_codigo := 'CATALOGO_' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    end if;
    insert into public.vendas_mobile_catalogos (empresa_id, nome, codigo, origem, ativo, padrao, criado_por)
    values (p_empresa_id, v_nome, v_codigo, 'manual', true, false, auth.uid())
    returning * into v_catalogo;
    return v_catalogo;
  end if;

  select * into v_catalogo
    from public.vendas_mobile_catalogos
   where id = p_catalogo_id and empresa_id = p_empresa_id
   for update;
  if not found then raise exception 'Catálogo não localizado neste perfil.'; end if;
  if v_catalogo.origem <> 'manual' and v_codigo <> '' and v_codigo <> v_catalogo.codigo then
    raise exception 'O código de uma fonte externa ou de Custos é protegido.';
  end if;

  update public.vendas_mobile_catalogos
     set nome = v_nome,
         codigo = case when v_catalogo.origem = 'manual' and v_codigo <> '' then v_codigo else codigo end,
         atualizado_em = now()
   where id = v_catalogo.id
   returning * into v_catalogo;
  return v_catalogo;
end;
$$;

create or replace function public.alterar_status_catalogo_conteudo_vendas_mobile_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid,
  p_ativo boolean
)
returns public.vendas_mobile_catalogos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_catalogo public.vendas_mobile_catalogos;
  v_substituto uuid;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.vendas_mobile_pode_publicar_conteudo(p_empresa_id) then
    raise exception 'Você não tem permissão para administrar os catálogos deste perfil.';
  end if;
  select * into v_catalogo from public.vendas_mobile_catalogos
   where id = p_catalogo_id and empresa_id = p_empresa_id for update;
  if not found then raise exception 'Catálogo não localizado neste perfil.'; end if;

  if not coalesce(p_ativo, false) and v_catalogo.padrao then
    select id into v_substituto from public.vendas_mobile_catalogos
     where empresa_id = p_empresa_id and ativo = true and id <> v_catalogo.id
     order by criado_em, id limit 1 for update;
    if v_substituto is null then
      raise exception 'Ative outro catálogo antes de desativar o catálogo atual.';
    end if;
    update public.vendas_mobile_catalogos set padrao = false, atualizado_em = now()
     where empresa_id = p_empresa_id and padrao;
    update public.vendas_mobile_catalogos set padrao = true, atualizado_em = now()
     where id = v_substituto;
  end if;

  update public.vendas_mobile_catalogos
     set ativo = coalesce(p_ativo, false),
         padrao = case when coalesce(p_ativo, false) then padrao else false end,
         atualizado_em = now()
   where id = v_catalogo.id
   returning * into v_catalogo;
  return v_catalogo;
end;
$$;

create or replace function public.definir_catalogo_atual_conteudo_vendas_mobile_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid
)
returns public.vendas_mobile_catalogos
language plpgsql
security definer
set search_path = public
as $$
declare v_catalogo public.vendas_mobile_catalogos;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.vendas_mobile_pode_publicar_conteudo(p_empresa_id) then
    raise exception 'Você não tem permissão para administrar os catálogos deste perfil.';
  end if;
  select * into v_catalogo from public.vendas_mobile_catalogos
   where id = p_catalogo_id and empresa_id = p_empresa_id and ativo = true for update;
  if not found then raise exception 'Ative o catálogo antes de torná-lo o catálogo atual.'; end if;
  update public.vendas_mobile_catalogos set padrao = false, atualizado_em = now()
   where empresa_id = p_empresa_id and padrao;
  update public.vendas_mobile_catalogos set padrao = true, atualizado_em = now()
   where id = v_catalogo.id returning * into v_catalogo;
  return v_catalogo;
end;
$$;

-- A lista de Conteúdo e seus produtos seguem o catálogo atual, não o primeiro
-- registro criado. Assim a mudança de catálogo é imediata em toda a operação.
create or replace function public.listar_produtos_conteudo_vendas_mobile_rpc(p_empresa_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
   order by padrao desc, criado_em limit 1;
  if v_catalogo_id is null then
    insert into public.vendas_mobile_catalogos (empresa_id, nome, codigo, origem, padrao)
    values (p_empresa_id, 'Catálogo principal', 'PRINCIPAL', 'externa', true)
    returning id into v_catalogo_id;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', produto.id, 'sku', produto.sku, 'nome', produto.nome, 'marca', produto.marca,
    'categoria', produto.categoria, 'descricao', produto.descricao,
    'preco_divulgacao', produto.preco_divulgacao, 'unidade', produto.unidade,
    'imagem_url', produto.imagem_url, 'ncm', produto.ncm, 'codigo_barras', produto.codigo_barras,
    'ativo', produto.ativo, 'atualizado_em', produto.atualizado_em
  ) order by produto.nome), '[]'::jsonb) into v_produtos
    from public.vendas_mobile_catalogo_produtos produto
   where produto.catalogo_id = v_catalogo_id and produto.disponivel_catalogo = true;
  return jsonb_build_object('catalogo_id', v_catalogo_id, 'produtos', v_produtos);
end;
$$;

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
  if not public.vendas_mobile_pode_publicar_conteudo(p_empresa_id) then raise exception 'Você não tem permissão para administrar o catálogo deste perfil.'; end if;
  if p_produto_id is not null and v_sku = '' then v_sku := 'LEGADO-' || upper(replace(p_produto_id::text, '-', '')); end if;
  if v_sku = '' or v_nome = '' or v_preco is null or v_preco <= 0 then raise exception 'Código, nome e preço sugerido de revenda são obrigatórios.'; end if;
  select id into v_catalogo_id from public.vendas_mobile_catalogos
   where empresa_id = p_empresa_id and ativo = true order by padrao desc, criado_em limit 1;
  if v_catalogo_id is null then
    insert into public.vendas_mobile_catalogos (empresa_id, nome, codigo, origem, padrao)
    values (p_empresa_id, 'Catálogo principal', 'PRINCIPAL', 'externa', true)
    returning id into v_catalogo_id;
  end if;
  if p_produto_id is null then
    insert into public.vendas_mobile_catalogo_produtos (catalogo_id, sku, tipo_item, disponivel_catalogo, codigo_barras, marca, categoria, nome, descricao, preco_divulgacao, preco_custo, preco_venda, unidade, imagem_url, ncm, ativo, atualizado_em)
    values (v_catalogo_id, v_sku, 'produto', true, nullif(trim(p_dados ->> 'codigo_barras'), ''), nullif(trim(p_dados ->> 'marca'), ''), nullif(trim(p_dados ->> 'categoria'), ''), v_nome, nullif(trim(p_dados ->> 'descricao'), ''), v_preco, 0, 0, v_unidade, nullif(trim(p_dados ->> 'imagem_url'), ''), nullif(trim(p_dados ->> 'ncm'), ''), v_ativo, now())
    returning id into v_produto_id;
  else
    update public.vendas_mobile_catalogo_produtos set
      sku = v_sku, tipo_item = 'produto', disponivel_catalogo = true,
      codigo_barras = nullif(trim(p_dados ->> 'codigo_barras'), ''), marca = nullif(trim(p_dados ->> 'marca'), ''), categoria = nullif(trim(p_dados ->> 'categoria'), ''), nome = v_nome, descricao = nullif(trim(p_dados ->> 'descricao'), ''), preco_divulgacao = v_preco, unidade = v_unidade, imagem_url = nullif(trim(p_dados ->> 'imagem_url'), ''), ncm = nullif(trim(p_dados ->> 'ncm'), ''), ativo = v_ativo, atualizado_em = now()
     where id = p_produto_id and catalogo_id = v_catalogo_id returning id into v_produto_id;
    if v_produto_id is null then raise exception 'Produto não localizado no catálogo atual deste perfil.'; end if;
  end if;
  return jsonb_build_object('id', v_produto_id);
end;
$$;

revoke all on function public.listar_catalogos_conteudo_vendas_mobile_rpc(uuid) from public;
revoke all on function public.salvar_catalogo_conteudo_vendas_mobile_rpc(uuid, uuid, text, text) from public;
revoke all on function public.alterar_status_catalogo_conteudo_vendas_mobile_rpc(uuid, uuid, boolean) from public;
revoke all on function public.definir_catalogo_atual_conteudo_vendas_mobile_rpc(uuid, uuid) from public;
grant execute on function public.listar_catalogos_conteudo_vendas_mobile_rpc(uuid) to authenticated;
grant execute on function public.salvar_catalogo_conteudo_vendas_mobile_rpc(uuid, uuid, text, text) to authenticated;
grant execute on function public.alterar_status_catalogo_conteudo_vendas_mobile_rpc(uuid, uuid, boolean) to authenticated;
grant execute on function public.definir_catalogo_atual_conteudo_vendas_mobile_rpc(uuid, uuid) to authenticated;

commit;
