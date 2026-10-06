-- Vendas e Serviços e AvantaVendas são destinos independentes do mesmo
-- catálogo. `ativo` controla somente o uso interno; `publicado_avantavendas`
-- controla somente a distribuição às contas vinculadas.
begin;

comment on column public.vendas_mobile_catalogos.ativo is
  'Disponibiliza o catálogo para uso interno em Vendas e Serviços.';

comment on column public.vendas_mobile_catalogos.publicado_avantavendas is
  'Disponibiliza o catálogo para visualização e uso nas contas vinculadas do AvantaVendas, independentemente do uso interno.';

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
    if not public.vendas_mobile_pode_publicar_conteudo(v_catalogo.empresa_id)
       and not public.custos_pode_acessar_empresa(v_catalogo.empresa_id, true) then
      raise exception 'Você não tem permissão para publicar este catálogo.';
    end if;
  elsif not public.vendas_mobile_pode_operar_conta(p_conta_id) then
    raise exception 'Conta de vendas inválida ou sem permissão.';
  end if;

  v_publicavel := v_catalogo.publicado_avantavendas
    and v_produto.ativo
    and v_produto.disponivel_catalogo
    and coalesce(v_produto.preco_divulgacao, 0) > 0;

  -- Ao desativar a publicação, oculta também cópias pertencentes a vínculos
  -- hoje inativos. Assim, uma reativação futura do vínculo nunca reapresenta
  -- conteúdo que continua desativado no AvantaVendas.
  if not v_publicavel then
    update public.vendas_mobile_produtos
       set ativo = false,
           atualizado_em = now()
     where catalogo_produto_origem_id = v_produto.id
       and ativo = true;
    get diagnostics v_atualizados = row_count;
    return jsonb_build_object('atualizados', v_atualizados, 'adicionados', 0);
  end if;

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

create or replace function public.custos_alterar_publicacao_avantavendas_catalogo_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid,
  p_publicado boolean
)
returns public.vendas_mobile_catalogos
language plpgsql security definer set search_path = public as $$
declare
  v_catalogo public.vendas_mobile_catalogos;
  v_produto_id uuid;
begin
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para gerenciar os catálogos desta empresa.';
  end if;
  select * into v_catalogo
    from public.vendas_mobile_catalogos
   where id = p_catalogo_id and empresa_id = p_empresa_id
   for update;
  if not found then raise exception 'Catálogo não localizado nesta empresa.'; end if;

  update public.vendas_mobile_catalogos
     set publicado_avantavendas = coalesce(p_publicado, false),
         atualizado_em = now()
   where id = v_catalogo.id
   returning * into v_catalogo;

  for v_produto_id in
    select id from public.vendas_mobile_catalogo_produtos where catalogo_id = v_catalogo.id
  loop
    perform public.publicar_produto_catalogo_avantavendas(v_produto_id);
  end loop;
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
declare
  v_catalogo public.vendas_mobile_catalogos;
  v_produto_id uuid;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.vendas_mobile_pode_publicar_conteudo(p_empresa_id) then
    raise exception 'Você não tem permissão para administrar os catálogos deste perfil.';
  end if;
  select * into v_catalogo
    from public.vendas_mobile_catalogos
   where id = p_catalogo_id and empresa_id = p_empresa_id
   for update;
  if not found then raise exception 'Catálogo não localizado neste perfil.'; end if;

  update public.vendas_mobile_catalogos
     set publicado_avantavendas = coalesce(p_ativo, false),
         atualizado_em = now()
   where id = v_catalogo.id
   returning * into v_catalogo;

  for v_produto_id in
    select id from public.vendas_mobile_catalogo_produtos where catalogo_id = v_catalogo.id
  loop
    perform public.publicar_produto_catalogo_avantavendas(v_produto_id);
  end loop;
  return v_catalogo;
end;
$$;

create or replace function public.listar_produtos_conteudo_vendas_mobile_rpc(p_empresa_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_catalogo_id uuid; v_produtos jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.vendas_mobile_pode_publicar_conteudo(p_empresa_id) then
    raise exception 'Você não tem permissão para administrar o catálogo deste perfil.';
  end if;
  select id into v_catalogo_id from public.vendas_mobile_catalogos
   where empresa_id = p_empresa_id and publicado_avantavendas
   order by padrao desc, criado_em, id limit 1;
  if v_catalogo_id is null and not exists (
    select 1 from public.vendas_mobile_catalogos where empresa_id = p_empresa_id
  ) then
    insert into public.vendas_mobile_catalogos (
      empresa_id, nome, codigo, origem, ativo, padrao, publicado_avantavendas
    ) values (p_empresa_id, 'Catálogo principal', 'PRINCIPAL', 'externa', false, false, true)
    returning id into v_catalogo_id;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', produto.id, 'catalogo_id', produto.catalogo_id, 'sku', produto.sku,
    'nome', produto.nome, 'marca', produto.marca, 'categoria', produto.categoria,
    'descricao', produto.descricao, 'preco_divulgacao', produto.preco_divulgacao,
    'unidade', produto.unidade, 'imagem_url', produto.imagem_url, 'ncm', produto.ncm,
    'codigo_barras', produto.codigo_barras, 'ativo', produto.ativo,
    'atualizado_em', produto.atualizado_em
  ) order by produto.nome, produto.id), '[]'::jsonb) into v_produtos
    from public.vendas_mobile_catalogo_produtos produto
    join public.vendas_mobile_catalogos catalogo on catalogo.id = produto.catalogo_id
   where catalogo.empresa_id = p_empresa_id
     and catalogo.publicado_avantavendas
     and produto.disponivel_catalogo = true;
  return jsonb_build_object('catalogo_id', v_catalogo_id, 'produtos', v_produtos);
end;
$$;

create or replace function public.salvar_catalogo_conteudo_vendas_mobile_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid default null,
  p_nome text default '',
  p_codigo text default null
)
returns public.vendas_mobile_catalogos
language plpgsql security definer set search_path = public as $$
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
    insert into public.vendas_mobile_catalogos (
      empresa_id, nome, codigo, origem, ativo, padrao, publicado_avantavendas, criado_por
    ) values (p_empresa_id, v_nome, v_codigo, 'manual', false, false, true, auth.uid())
    returning * into v_catalogo;
    return v_catalogo;
  end if;
  select * into v_catalogo from public.vendas_mobile_catalogos
   where id = p_catalogo_id and empresa_id = p_empresa_id for update;
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
exception when unique_violation then
  raise exception 'Este código de catálogo já está em uso nesta empresa.';
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
  if p_produto_id is not null and v_sku = '' then
    v_sku := 'LEGADO-' || upper(replace(p_produto_id::text, '-', ''));
  end if;
  if v_sku = '' or v_nome = '' or v_preco is null or v_preco <= 0 then
    raise exception 'Código, nome e preço sugerido de revenda são obrigatórios.';
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
      categoria, nome, descricao, preco_divulgacao, preco_custo, preco_venda,
      unidade, imagem_url, ncm, ativo, atualizado_em
    ) values (
      v_catalogo_id, v_sku, 'produto', true, nullif(trim(p_dados ->> 'codigo_barras'), ''),
      nullif(trim(p_dados ->> 'marca'), ''), nullif(trim(p_dados ->> 'categoria'), ''),
      v_nome, nullif(trim(p_dados ->> 'descricao'), ''), v_preco, 0, 0, v_unidade,
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
      preco_divulgacao = v_preco, unidade = v_unidade,
      imagem_url = nullif(trim(p_dados ->> 'imagem_url'), ''), ncm = nullif(trim(p_dados ->> 'ncm'), ''),
      ativo = v_ativo, atualizado_em = now()
     where id = p_produto_id and catalogo_id = v_catalogo_id
     returning id into v_produto_id;
    if v_produto_id is null then raise exception 'Produto não localizado em catálogo ativo no AvantaVendas.'; end if;
  end if;
  return jsonb_build_object('id', v_produto_id);
end;
$$;

create or replace function public.sincronizar_catalogo_vendas_mobile_rpc(p_conta_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_empresa_id uuid;
  v_catalogo public.vendas_mobile_catalogos;
  v_produto public.vendas_mobile_catalogo_produtos;
  v_resultado jsonb;
  v_adicionados integer := 0;
  v_ignorados integer := 0;
  v_sem_preco integer := 0;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if p_conta_id is null or not public.vendas_mobile_pode_operar_conta(p_conta_id) then
    raise exception 'Conta de vendas inválida ou sem permissão.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('catalogo-conta:' || p_conta_id::text, 0));
  select vinculo.empresa_id into v_empresa_id
    from public.vendas_mobile_contas_vinculos_comerciais vinculo
    join public.vendas_mobile_contas_recursos recurso
      on recurso.conta_id = vinculo.conta_id and recurso.catalogo_ativo = true
   where vinculo.conta_id = p_conta_id and vinculo.ativo
     and public.vendas_mobile_vinculo_conta_valido(vinculo.conta_id, vinculo.empresa_id)
   limit 1;
  if v_empresa_id is null then
    return jsonb_build_object('adicionados', 0, 'ja_recebidos', 0, 'sem_preco', 0);
  end if;
  for v_catalogo in
    select catalogo.* from public.vendas_mobile_catalogos catalogo
    join public.empresa_modulos modulo
      on modulo.empresa_id = catalogo.empresa_id and modulo.modulo_id = 'vendas_mobile' and modulo.ativo
    where catalogo.empresa_id = v_empresa_id
      and catalogo.publicado_avantavendas
  loop
    for v_produto in
      select * from public.vendas_mobile_catalogo_produtos
       where catalogo_id = v_catalogo.id and ativo and disponivel_catalogo
    loop
      if v_produto.preco_divulgacao is null or v_produto.preco_divulgacao <= 0 then
        v_sem_preco := v_sem_preco + 1;
        continue;
      end if;
      v_resultado := public.publicar_produto_catalogo_avantavendas(v_produto.id, p_conta_id);
      v_adicionados := v_adicionados + coalesce((v_resultado ->> 'adicionados')::integer, 0);
      if coalesce((v_resultado ->> 'adicionados')::integer, 0) = 0 then
        v_ignorados := v_ignorados + 1;
      end if;
    end loop;
  end loop;
  return jsonb_build_object('adicionados', v_adicionados, 'ja_recebidos', v_ignorados, 'sem_preco', v_sem_preco);
end;
$$;

-- Ajusta somente a visibilidade das cópias recebidas. Não remove cadastros,
-- estoque, pedidos, pagamentos ou histórico de nenhuma conta.
update public.vendas_mobile_produtos destino
   set ativo = catalogo.publicado_avantavendas
     and origem.ativo
     and origem.disponivel_catalogo
     and coalesce(origem.preco_divulgacao, 0) > 0,
       atualizado_em = now()
  from public.vendas_mobile_catalogo_produtos origem
  join public.vendas_mobile_catalogos catalogo on catalogo.id = origem.catalogo_id
 where destino.catalogo_produto_origem_id = origem.id;

revoke all on function public.publicar_produto_catalogo_avantavendas(uuid, uuid) from public, anon, authenticated;
revoke all on function public.custos_alterar_publicacao_avantavendas_catalogo_rpc(uuid, uuid, boolean) from public, anon;
grant execute on function public.custos_alterar_publicacao_avantavendas_catalogo_rpc(uuid, uuid, boolean) to authenticated;
revoke all on function public.sincronizar_catalogo_vendas_mobile_rpc(uuid) from public, anon;
grant execute on function public.sincronizar_catalogo_vendas_mobile_rpc(uuid) to authenticated;

commit;
