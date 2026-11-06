-- O catálogo selecionado para manutenção em Custos não é um destino de venda.
-- Esta migração desacopla `padrao` (seleção administrativa) de `ativo`
-- (Vendas e Serviços). A publicação existente no AvantaVendas não é alterada.
begin;

create or replace function public.custos_salvar_catalogo_empresa_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid,
  p_nome text,
  p_codigo text default null
)
returns public.vendas_mobile_catalogos
language plpgsql security definer set search_path = public as $$
declare
  v_catalogo public.vendas_mobile_catalogos;
  v_nome text := nullif(trim(coalesce(p_nome, '')), '');
  v_codigo text := upper(regexp_replace(trim(coalesce(p_codigo, '')), '[^A-Za-z0-9_-]+', '_', 'g'));
  v_primeiro boolean := false;
begin
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para gerenciar os catálogos desta empresa.';
  end if;
  if v_nome is null then raise exception 'Informe o nome do catálogo.'; end if;

  perform 1 from public.empresas where id = p_empresa_id for update;

  if p_catalogo_id is null then
    if v_codigo = '' then
      v_codigo := 'CATALOGO_' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    end if;
    v_primeiro := not exists (
      select 1 from public.vendas_mobile_catalogos where empresa_id = p_empresa_id
    );
    insert into public.vendas_mobile_catalogos (
      empresa_id, nome, codigo, origem, ativo, padrao,
      publicado_avantavendas, criado_por
    ) values (
      p_empresa_id, v_nome, v_codigo, 'manual', false, v_primeiro,
      false, auth.uid()
    ) returning * into v_catalogo;
    return v_catalogo;
  end if;

  select * into v_catalogo
    from public.vendas_mobile_catalogos
   where id = p_catalogo_id and empresa_id = p_empresa_id
   for update;
  if not found then raise exception 'Catálogo não localizado nesta empresa.'; end if;

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

  update public.vendas_mobile_catalogos
     set padrao = false, atualizado_em = now()
   where empresa_id = p_empresa_id and padrao;
  update public.vendas_mobile_catalogos
     set padrao = true, atualizado_em = now()
   where id = v_catalogo.id
   returning * into v_catalogo;
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
  select * into v_catalogo from public.vendas_mobile_catalogos
   where id = p_catalogo_id and empresa_id = p_empresa_id for update;
  if not found then raise exception 'Catálogo não localizado nesta empresa.'; end if;

  -- Muda somente o destino Vendas e Serviços. `padrao` e a publicação no
  -- AvantaVendas permanecem exatamente como estavam.
  update public.vendas_mobile_catalogos
     set ativo = coalesce(p_ativo, false),
         atualizado_em = now()
   where id = v_catalogo.id
   returning * into v_catalogo;
  return v_catalogo;
end;
$$;

create or replace function public.custos_mover_produtos_catalogo_rpc(
  p_empresa_id uuid,
  p_produto_ids uuid[],
  p_catalogo_destino_id uuid
)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[];
  v_catalogo_destino public.vendas_mobile_catalogos;
  v_total_origem integer := 0;
  v_codigo_duplicado text;
  v_atualizados integer := 0;
begin
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para alterar os produtos desta empresa.';
  end if;

  select array_agg(distinct item_id) into v_ids
    from unnest(coalesce(p_produto_ids, '{}'::uuid[])) as itens(item_id);
  if coalesce(array_length(v_ids, 1), 0) = 0 then
    raise exception 'Selecione ao menos um produto ou serviço.';
  end if;

  select catalogo.* into v_catalogo_destino
    from public.vendas_mobile_catalogos catalogo
   where catalogo.id = p_catalogo_destino_id
     and catalogo.empresa_id = p_empresa_id
   for update;
  if not found then
    raise exception 'Selecione um catálogo desta empresa como destino.';
  end if;

  select count(*) into v_total_origem
    from public.vendas_mobile_catalogo_produtos produto
    join public.vendas_mobile_catalogos catalogo_origem on catalogo_origem.id = produto.catalogo_id
   where produto.id = any(v_ids)
     and catalogo_origem.empresa_id = p_empresa_id;
  if v_total_origem <> array_length(v_ids, 1) then
    raise exception 'Um ou mais produtos selecionados não pertencem a esta empresa.';
  end if;

  select upper(trim(produto.sku)) into v_codigo_duplicado
    from public.vendas_mobile_catalogo_produtos produto
   where produto.id = any(v_ids)
     and produto.catalogo_id <> p_catalogo_destino_id
     and nullif(trim(produto.sku), '') is not null
   group by upper(trim(produto.sku))
  having count(*) > 1
   limit 1;
  if v_codigo_duplicado is not null then
    raise exception 'O código % aparece mais de uma vez na seleção. Ajuste os códigos antes de mover.', v_codigo_duplicado;
  end if;

  select upper(trim(origem.sku)) into v_codigo_duplicado
    from public.vendas_mobile_catalogo_produtos origem
    join public.vendas_mobile_catalogo_produtos destino
      on destino.catalogo_id = p_catalogo_destino_id
     and destino.id <> origem.id
     and upper(trim(destino.sku)) = upper(trim(origem.sku))
   where origem.id = any(v_ids)
     and origem.catalogo_id <> p_catalogo_destino_id
     and nullif(trim(origem.sku), '') is not null
   limit 1;
  if v_codigo_duplicado is not null then
    raise exception 'O catálogo de destino já usa o código % em outro cadastro. Ajuste o código antes de mover.', v_codigo_duplicado;
  end if;

  update public.vendas_mobile_catalogo_produtos produto
     set catalogo_id = p_catalogo_destino_id,
         atualizado_em = now()
   where produto.id = any(v_ids)
     and produto.catalogo_id <> p_catalogo_destino_id;
  get diagnostics v_atualizados = row_count;
  return v_atualizados;
end;
$$;

revoke all on function public.custos_salvar_catalogo_empresa_rpc(uuid, uuid, text, text) from public, anon;
revoke all on function public.custos_definir_catalogo_atual_rpc(uuid, uuid) from public, anon;
revoke all on function public.custos_alterar_status_catalogo_empresa_rpc(uuid, uuid, boolean) from public, anon;
revoke all on function public.custos_mover_produtos_catalogo_rpc(uuid, uuid[], uuid) from public, anon;
grant execute on function public.custos_salvar_catalogo_empresa_rpc(uuid, uuid, text, text) to authenticated;
grant execute on function public.custos_definir_catalogo_atual_rpc(uuid, uuid) to authenticated;
grant execute on function public.custos_alterar_status_catalogo_empresa_rpc(uuid, uuid, boolean) to authenticated;
grant execute on function public.custos_mover_produtos_catalogo_rpc(uuid, uuid[], uuid) to authenticated;

commit;
