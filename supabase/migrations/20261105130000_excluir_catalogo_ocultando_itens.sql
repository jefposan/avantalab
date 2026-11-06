begin;
alter table public.vendas_mobile_catalogos add column if not exists excluido_em timestamptz;

create or replace function public.custos_proteger_catalogo_excluido()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.excluido_em is not null then
    raise exception 'Este catálogo foi excluído e permanece somente nos históricos.';
  end if;
  return new;
end;
$$;
create trigger custos_proteger_catalogo_excluido before update on public.vendas_mobile_catalogos
for each row execute function public.custos_proteger_catalogo_excluido();

create or replace function public.custos_impedir_item_catalogo_excluido()
returns trigger language plpgsql set search_path = public as $$
begin
  perform 1 from public.vendas_mobile_catalogos where id = new.catalogo_id and excluido_em is null for share;
  if not found then raise exception 'Não é permitido cadastrar ou mover itens para um catálogo excluído.'; end if;
  return new;
end;
$$;
create trigger custos_impedir_item_catalogo_excluido before insert or update of catalogo_id
on public.vendas_mobile_catalogo_produtos for each row execute function public.custos_impedir_item_catalogo_excluido();

create or replace function public.custos_excluir_catalogo_rpc(p_empresa_id uuid, p_catalogo_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_catalogo public.vendas_mobile_catalogos;
  v_produto uuid;
  v_quantidade integer := 0;
begin
  if auth.uid() is null or not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para excluir catálogos desta empresa.';
  end if;
  perform 1 from public.empresas where id = p_empresa_id for update;
  lock table public.vendas_mobile_catalogo_produtos in share row exclusive mode;
  select * into v_catalogo from public.vendas_mobile_catalogos
    where id = p_catalogo_id and empresa_id = p_empresa_id for update;
  if not found then raise exception 'Catálogo não localizado nesta empresa.'; end if;
  if v_catalogo.origem <> 'manual' or v_catalogo.codigo in ('CUSTOS_LOCAL', 'PRINCIPAL') then
    raise exception 'Este catálogo é protegido pelo sistema e não pode ser excluído.';
  end if;
  if v_catalogo.excluido_em is not null then return jsonb_build_object('excluido', true); end if;
  -- Identidades, tabelas de preços e documentos anteriores não são removidos.
  for v_produto in select id from public.vendas_mobile_catalogo_produtos
    where catalogo_id = p_catalogo_id and excluido_em is null
  loop
    perform public.custos_excluir_produto_rpc(p_empresa_id, v_produto);
    v_quantidade := v_quantidade + 1;
  end loop;
  update public.vendas_mobile_catalogos
    set ativo = false, publicado_avantavendas = false, padrao = false,
        excluido_em = now(), atualizado_em = now()
    where id = p_catalogo_id;
  if v_catalogo.padrao then
    update public.vendas_mobile_catalogos set padrao = true
      where empresa_id = p_empresa_id and codigo = 'CUSTOS_LOCAL' and excluido_em is null;
  end if;
  return jsonb_build_object('excluido', true, 'produtos_excluidos', v_quantidade);
end;
$$;
revoke all on function public.custos_proteger_catalogo_excluido() from public, anon, authenticated;
revoke all on function public.custos_impedir_item_catalogo_excluido() from public, anon, authenticated;
revoke all on function public.custos_excluir_catalogo_rpc(uuid, uuid) from public, anon;
grant execute on function public.custos_excluir_catalogo_rpc(uuid, uuid) to authenticated;
commit;
