-- Conteúdo AvantaVendas: o Operador Completo publica o catálogo sem receber
-- leitura ou escrita direta sobre os preços internos de Custos e Precificação.

begin;

create or replace function public.vendas_mobile_pode_publicar_conteudo(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.usuarios_empresa ue
      join public.empresa_modulos modulo
        on modulo.empresa_id = ue.empresa_id
       and modulo.modulo_id = 'vendas_mobile'
       and modulo.ativo = true
     where ue.empresa_id = p_empresa_id
       and ue.user_id = auth.uid()
       and ue.status = 'ativo'
       and ue.perfil in ('gestor_master', 'administrador', 'operador_completo')
  );
$$;

revoke all on function public.vendas_mobile_pode_publicar_conteudo(uuid) from public;
grant execute on function public.vendas_mobile_pode_publicar_conteudo(uuid) to authenticated;

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

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', produto.id,
    'sku', produto.sku,
    'nome', produto.nome,
    'marca', produto.marca,
    'categoria', produto.categoria,
    'descricao', produto.descricao,
    'preco_divulgacao', produto.preco_divulgacao,
    'unidade', produto.unidade,
    'imagem_url', produto.imagem_url,
    'ncm', produto.ncm,
    'codigo_barras', produto.codigo_barras,
    'ativo', produto.ativo,
    'atualizado_em', produto.atualizado_em
  ) order by produto.nome), '[]'::jsonb)
    into v_produtos
    from public.vendas_mobile_catalogo_produtos produto
   where produto.catalogo_id = v_catalogo_id
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

create or replace function public.inativar_produto_conteudo_vendas_mobile_rpc(
  p_empresa_id uuid,
  p_produto_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_produto_id uuid;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.vendas_mobile_pode_publicar_conteudo(p_empresa_id) then
    raise exception 'Você não tem permissão para administrar o catálogo deste perfil.';
  end if;

  update public.vendas_mobile_catalogo_produtos produto
     set ativo = false, atualizado_em = now()
    from public.vendas_mobile_catalogos catalogo
   where produto.id = p_produto_id
     and produto.catalogo_id = catalogo.id
     and catalogo.empresa_id = p_empresa_id
   returning produto.id into v_produto_id;

  if v_produto_id is null then
    raise exception 'Produto não localizado no catálogo deste perfil.';
  end if;

  return jsonb_build_object('id', v_produto_id);
end;
$$;

revoke all on function public.listar_produtos_conteudo_vendas_mobile_rpc(uuid) from public;
revoke all on function public.salvar_produto_conteudo_vendas_mobile_rpc(uuid, uuid, jsonb) from public;
revoke all on function public.inativar_produto_conteudo_vendas_mobile_rpc(uuid, uuid) from public;
grant execute on function public.listar_produtos_conteudo_vendas_mobile_rpc(uuid) to authenticated;
grant execute on function public.salvar_produto_conteudo_vendas_mobile_rpc(uuid, uuid, jsonb) to authenticated;
grant execute on function public.inativar_produto_conteudo_vendas_mobile_rpc(uuid, uuid) to authenticated;

-- O upload de imagem de divulgação pode ser feito por quem já publica conteúdo.
drop policy if exists vendas_catalogo_imagens_gestao on storage.objects;
create policy vendas_catalogo_imagens_gestao on storage.objects for all to authenticated
using (
  bucket_id = 'vendas-produtos'
  and (storage.foldername(name))[1] = 'catalogos'
  and public.vendas_mobile_pode_publicar_conteudo(((storage.foldername(name))[2])::uuid)
)
with check (
  bucket_id = 'vendas-produtos'
  and (storage.foldername(name))[1] = 'catalogos'
  and public.vendas_mobile_pode_publicar_conteudo(((storage.foldername(name))[2])::uuid)
);

commit;
