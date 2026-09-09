-- O catálogo do Gestão é a origem do AvantaVendas. Cada conta vinculada recebe
-- a publicação no mesmo commit, e não apenas na próxima sincronização manual.

begin;

create or replace function public.preencher_conta_operacional_vendas_mobile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- A publicação oficial pode criar a cópia em uma conta vinculada sem assumir
  -- a identidade do vendedor. A origem, a empresa e o recurso ativo são
  -- confirmados no banco antes de liberar exclusivamente esse caso.
  if tg_table_name = 'vendas_mobile_produtos'
     and new.catalogo_produto_origem_id is not null
     and exists (
       select 1
       from public.vendas_mobile_catalogo_produtos produto
       join public.vendas_mobile_catalogos catalogo on catalogo.id = produto.catalogo_id
       join public.vendas_mobile_contas_vinculos_comerciais vinculo
         on vinculo.conta_id = new.conta_id
        and vinculo.empresa_id = catalogo.empresa_id
        and vinculo.ativo = true
       join public.vendas_mobile_contas_recursos recurso
         on recurso.conta_id = vinculo.conta_id
        and recurso.catalogo_ativo = true
       where produto.id = new.catalogo_produto_origem_id
         and public.vendas_mobile_pode_publicar_conteudo(catalogo.empresa_id)
         and public.vendas_mobile_vinculo_conta_valido(vinculo.conta_id, catalogo.empresa_id)
     ) then
    return new;
  end if;

  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if new.conta_id is null then raise exception 'Selecione uma conta de vendas antes de continuar.'; end if;
  if not public.vendas_mobile_pode_operar_conta(new.conta_id) then
    raise exception 'Você não possui permissão para operar esta conta de vendas.';
  end if;
  new.user_id := auth.uid();
  return new;
end;
$$;

create or replace function public.publicar_produto_catalogo_avantavendas(
  p_catalogo_produto_id uuid,
  p_conta_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_produto public.vendas_mobile_catalogo_produtos;
  v_catalogo public.vendas_mobile_catalogos;
  v_conta record;
  v_produto_conta_id uuid;
  v_publicavel boolean;
  v_atualizados integer := 0;
  v_adicionados integer := 0;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;

  select * into v_produto
  from public.vendas_mobile_catalogo_produtos
  where id = p_catalogo_produto_id;
  if v_produto.id is null then raise exception 'Produto de catálogo não encontrado.'; end if;

  select * into v_catalogo
  from public.vendas_mobile_catalogos
  where id = v_produto.catalogo_id;
  if v_catalogo.id is null then raise exception 'Catálogo não encontrado.'; end if;

  if p_conta_id is null then
    if not public.vendas_mobile_pode_publicar_conteudo(v_catalogo.empresa_id) then
      raise exception 'Você não tem permissão para publicar este catálogo.';
    end if;
  elsif not public.vendas_mobile_pode_operar_conta(p_conta_id) then
    raise exception 'Conta de vendas inválida ou sem permissão.';
  end if;

  v_publicavel := v_catalogo.ativo
    and v_produto.ativo
    and v_produto.disponivel_catalogo
    and coalesce(v_produto.preco_divulgacao, 0) > 0;

  update public.vendas_mobile_produtos destino
     set marca = v_produto.marca,
         categoria = v_produto.categoria,
         sku = v_produto.sku,
         nome = v_produto.nome,
         descricao = v_produto.descricao,
         preco = coalesce(v_produto.preco_divulgacao, 0),
         unidade = v_produto.unidade,
         imagem_url = v_produto.imagem_url,
         metadados = coalesce(destino.metadados, '{}'::jsonb)
           || jsonb_build_object('catalogo_empresa', jsonb_build_object('catalogo_id', v_catalogo.id, 'produto_id', v_produto.id)),
         ativo = v_publicavel,
         catalogo_empresa_id = v_catalogo.id,
         catalogo_produto_origem_id = v_produto.id,
         atualizado_em = now()
    from public.vendas_mobile_contas_vinculos_comerciais vinculo
    join public.vendas_mobile_contas_recursos recurso
      on recurso.conta_id = vinculo.conta_id and recurso.catalogo_ativo = true
   where destino.conta_id = vinculo.conta_id
     and destino.catalogo_produto_origem_id = v_produto.id
     and vinculo.empresa_id = v_catalogo.empresa_id
     and vinculo.ativo = true
     and (p_conta_id is null or vinculo.conta_id = p_conta_id)
     and public.vendas_mobile_vinculo_conta_valido(vinculo.conta_id, v_catalogo.empresa_id);
  get diagnostics v_atualizados = row_count;

  for v_conta in
    select conta.id, conta.criado_por
    from public.vendas_mobile_contas conta
    join public.vendas_mobile_contas_vinculos_comerciais vinculo
      on vinculo.conta_id = conta.id
     and vinculo.empresa_id = v_catalogo.empresa_id
     and vinculo.ativo = true
    join public.vendas_mobile_contas_recursos recurso
      on recurso.conta_id = conta.id and recurso.catalogo_ativo = true
    where conta.arquivada_em is null
      and (p_conta_id is null or conta.id = p_conta_id)
      and public.vendas_mobile_vinculo_conta_valido(conta.id, v_catalogo.empresa_id)
  loop
    select id into v_produto_conta_id
    from public.vendas_mobile_produtos
    where conta_id = v_conta.id and catalogo_produto_origem_id = v_produto.id
    order by criado_em, id
    limit 1;

    if v_produto_conta_id is null and v_publicavel then
      insert into public.vendas_mobile_produtos (
        user_id, conta_id, marca, categoria, sku, nome, descricao, preco,
        preco_custo, estoque, unidade, imagem_url, metadados, ativo,
        catalogo_empresa_id, catalogo_produto_origem_id, estoque_controlado
      ) values (
        v_conta.criado_por, v_conta.id, v_produto.marca, v_produto.categoria,
        v_produto.sku, v_produto.nome, v_produto.descricao, v_produto.preco_divulgacao,
        0, null, v_produto.unidade, v_produto.imagem_url,
        jsonb_build_object('catalogo_empresa', jsonb_build_object('catalogo_id', v_catalogo.id, 'produto_id', v_produto.id)),
        true, v_catalogo.id, v_produto.id, false
      ) returning id into v_produto_conta_id;
      v_adicionados := v_adicionados + 1;
    end if;

    if v_produto_conta_id is not null then
      insert into public.vendas_mobile_contas_catalogo_recebimentos (
        conta_id, catalogo_produto_id, produto_id, status, recebido_por, atualizado_em
      ) values (
        v_conta.id, v_produto.id, v_produto_conta_id, 'recebido', v_conta.criado_por, now()
      ) on conflict (conta_id, catalogo_produto_id) do update
        set produto_id = excluded.produto_id,
            status = 'recebido',
            atualizado_em = excluded.atualizado_em;
    end if;
  end loop;

  return jsonb_build_object('atualizados', v_atualizados, 'adicionados', v_adicionados);
end;
$$;

create or replace function public.publicar_alteracao_catalogo_avantavendas()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.publicar_produto_catalogo_avantavendas(new.id);
  return new;
end;
$$;

drop trigger if exists vendas_mobile_catalogo_publicar_imediatamente on public.vendas_mobile_catalogo_produtos;
create trigger vendas_mobile_catalogo_publicar_imediatamente
after insert or update of sku, codigo_barras, marca, categoria, nome, descricao,
  preco_divulgacao, unidade, imagem_url, ncm, ativo, disponivel_catalogo
on public.vendas_mobile_catalogo_produtos
for each row execute function public.publicar_alteracao_catalogo_avantavendas();

-- Corrige as cópias já existentes na implantação, sem alterar custo, estoque
-- ou outros dados próprios das contas de vendas.
update public.vendas_mobile_produtos destino
   set marca = origem.marca,
       categoria = origem.categoria,
       sku = origem.sku,
       nome = origem.nome,
       descricao = origem.descricao,
       preco = coalesce(origem.preco_divulgacao, 0),
       unidade = origem.unidade,
       imagem_url = origem.imagem_url,
       metadados = coalesce(destino.metadados, '{}'::jsonb)
         || jsonb_build_object('catalogo_empresa', jsonb_build_object('catalogo_id', catalogo.id, 'produto_id', origem.id)),
       ativo = catalogo.ativo and origem.ativo and origem.disponivel_catalogo and coalesce(origem.preco_divulgacao, 0) > 0,
       atualizado_em = now()
  from public.vendas_mobile_catalogo_produtos origem
  join public.vendas_mobile_catalogos catalogo on catalogo.id = origem.catalogo_id
  join public.vendas_mobile_contas_vinculos_comerciais vinculo
    on vinculo.empresa_id = catalogo.empresa_id
   and vinculo.ativo = true
  join public.vendas_mobile_contas_recursos recurso
    on recurso.conta_id = vinculo.conta_id and recurso.catalogo_ativo = true
 where destino.conta_id = vinculo.conta_id
   and destino.catalogo_produto_origem_id = origem.id
   and public.vendas_mobile_vinculo_conta_valido(vinculo.conta_id, catalogo.empresa_id);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'vendas_mobile_produtos'
     ) then
    alter publication supabase_realtime add table public.vendas_mobile_produtos;
  end if;
end $$;

revoke all on function public.publicar_produto_catalogo_avantavendas(uuid, uuid) from public, anon, authenticated;

commit;
