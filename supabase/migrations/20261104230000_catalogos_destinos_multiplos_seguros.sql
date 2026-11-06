-- Cada ação altera somente o destino explicitamente solicitado. Vários
-- catálogos podem permanecer ativos simultaneamente no mesmo destino.
begin;

create or replace function public.custos_alterar_destino_catalogo_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid,
  p_destino text,
  p_ativo boolean
)
returns public.vendas_mobile_catalogos
language plpgsql security definer set search_path = public as $$
declare
  v_catalogo public.vendas_mobile_catalogos;
  v_ativo_anterior boolean;
  v_publicado_anterior boolean;
  v_produto_id uuid;
begin
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para gerenciar os catálogos desta empresa.';
  end if;
  if coalesce(p_destino, '') not in ('vendas_servicos', 'avantavendas') then
    raise exception 'Destino de catálogo inválido.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'catalogo-destino:' || p_empresa_id::text || ':' || p_destino,
    0
  ));
  select * into v_catalogo
    from public.vendas_mobile_catalogos
   where id = p_catalogo_id and empresa_id = p_empresa_id
   for update;
  if not found then raise exception 'Catálogo não localizado nesta empresa.'; end if;

  v_ativo_anterior := v_catalogo.ativo;
  v_publicado_anterior := v_catalogo.publicado_avantavendas;

  if p_destino = 'vendas_servicos' then
    update public.vendas_mobile_catalogos
       set ativo = coalesce(p_ativo, false),
           atualizado_em = now()
     where id = v_catalogo.id
     returning * into v_catalogo;
    if v_catalogo.publicado_avantavendas is distinct from v_publicado_anterior then
      raise exception 'A publicação no AvantaVendas não pode ser alterada por esta ação.';
    end if;
  else
    update public.vendas_mobile_catalogos
       set publicado_avantavendas = coalesce(p_ativo, false),
           atualizado_em = now()
     where id = v_catalogo.id
     returning * into v_catalogo;
    if v_catalogo.ativo is distinct from v_ativo_anterior then
      raise exception 'A ativação em Vendas e Serviços não pode ser alterada por esta ação.';
    end if;

    for v_produto_id in
      select id
        from public.vendas_mobile_catalogo_produtos
       where catalogo_id = v_catalogo.id
    loop
      perform public.publicar_produto_catalogo_avantavendas(v_produto_id);
    end loop;
  end if;

  return v_catalogo;
end;
$$;

-- Compatibilidade: todos os pontos antigos passam pelo mesmo contrato seguro.
create or replace function public.custos_alterar_status_catalogo_empresa_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid,
  p_ativo boolean
)
returns public.vendas_mobile_catalogos
language plpgsql security definer set search_path = public as $$
begin
  return public.custos_alterar_destino_catalogo_rpc(
    p_empresa_id, p_catalogo_id, 'vendas_servicos', p_ativo
  );
end;
$$;

create or replace function public.custos_alterar_publicacao_avantavendas_catalogo_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid,
  p_publicado boolean
)
returns public.vendas_mobile_catalogos
language plpgsql security definer set search_path = public as $$
begin
  return public.custos_alterar_destino_catalogo_rpc(
    p_empresa_id, p_catalogo_id, 'avantavendas', p_publicado
  );
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
  v_ativo_anterior boolean;
  v_produto_id uuid;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.vendas_mobile_pode_publicar_conteudo(p_empresa_id) then
    raise exception 'Você não tem permissão para administrar os catálogos deste perfil.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'catalogo-destino:' || p_empresa_id::text || ':avantavendas',
    0
  ));
  select * into v_catalogo
    from public.vendas_mobile_catalogos
   where id = p_catalogo_id and empresa_id = p_empresa_id
   for update;
  if not found then raise exception 'Catálogo não localizado neste perfil.'; end if;
  v_ativo_anterior := v_catalogo.ativo;

  update public.vendas_mobile_catalogos
     set publicado_avantavendas = coalesce(p_ativo, false),
         atualizado_em = now()
   where id = v_catalogo.id
   returning * into v_catalogo;
  if v_catalogo.ativo is distinct from v_ativo_anterior then
    raise exception 'A ativação em Vendas e Serviços não pode ser alterada por esta ação.';
  end if;

  for v_produto_id in
    select id
      from public.vendas_mobile_catalogo_produtos
     where catalogo_id = v_catalogo.id
  loop
    perform public.publicar_produto_catalogo_avantavendas(v_produto_id);
  end loop;
  return v_catalogo;
end;
$$;

create or replace function public.definir_catalogo_atual_conteudo_vendas_mobile_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid
)
returns public.vendas_mobile_catalogos
language plpgsql security definer set search_path = public as $$
begin
  return public.alterar_status_catalogo_conteudo_vendas_mobile_rpc(
    p_empresa_id, p_catalogo_id, true
  );
end;
$$;

revoke all on function public.custos_alterar_destino_catalogo_rpc(uuid, uuid, text, boolean) from public, anon;
revoke all on function public.custos_alterar_status_catalogo_empresa_rpc(uuid, uuid, boolean) from public, anon;
revoke all on function public.custos_alterar_publicacao_avantavendas_catalogo_rpc(uuid, uuid, boolean) from public, anon;
revoke all on function public.alterar_status_catalogo_conteudo_vendas_mobile_rpc(uuid, uuid, boolean) from public, anon;
revoke all on function public.definir_catalogo_atual_conteudo_vendas_mobile_rpc(uuid, uuid) from public, anon;

grant execute on function public.custos_alterar_destino_catalogo_rpc(uuid, uuid, text, boolean) to authenticated;
grant execute on function public.custos_alterar_status_catalogo_empresa_rpc(uuid, uuid, boolean) to authenticated;
grant execute on function public.custos_alterar_publicacao_avantavendas_catalogo_rpc(uuid, uuid, boolean) to authenticated;
grant execute on function public.alterar_status_catalogo_conteudo_vendas_mobile_rpc(uuid, uuid, boolean) to authenticated;
grant execute on function public.definir_catalogo_atual_conteudo_vendas_mobile_rpc(uuid, uuid) to authenticated;

comment on function public.custos_alterar_destino_catalogo_rpc(uuid, uuid, text, boolean) is
  'Altera somente o destino solicitado e permite múltiplos catálogos ativos no mesmo destino.';

commit;
