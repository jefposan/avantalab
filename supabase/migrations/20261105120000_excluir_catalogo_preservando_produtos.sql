begin;
-- Exclusão explícita; não participa da ativação/desativação dos destinos.
create or replace function public.custos_excluir_catalogo_rpc(p_empresa_id uuid, p_catalogo_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_origem public.vendas_mobile_catalogos;
  v_destino public.vendas_mobile_catalogos;
  v_quantidade integer;
begin
  if auth.uid() is null or not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para excluir catálogos desta empresa.';
  end if;
  perform 1 from public.empresas where id = p_empresa_id for update;
  lock table public.vendas_mobile_catalogo_produtos in share row exclusive mode;
  select * into v_origem from public.vendas_mobile_catalogos
    where id = p_catalogo_id and empresa_id = p_empresa_id for update;
  if not found then raise exception 'Catálogo não localizado nesta empresa.'; end if;
  if v_origem.origem <> 'manual' or v_origem.codigo in ('CUSTOS_LOCAL', 'PRINCIPAL') then
    raise exception 'Este catálogo é protegido pelo sistema e não pode ser excluído.';
  end if;
  if v_origem.ativo or v_origem.publicado_avantavendas then
    raise exception 'Desative Vendas e Serviços e AvantaVendas neste catálogo antes de excluir.';
  end if;
  select * into v_destino from public.vendas_mobile_catalogos
    where empresa_id = p_empresa_id and codigo = 'CUSTOS_LOCAL' and id <> p_catalogo_id for update;
  if not found then raise exception 'Catálogo local de Custos não localizado. Nenhuma alteração foi feita.'; end if;
  if exists (select 1 from public.vendas_mobile_catalogo_produtos a
    join public.vendas_mobile_catalogo_produtos b on upper(trim(a.sku)) = upper(trim(b.sku))
    where a.catalogo_id = p_catalogo_id and b.catalogo_id = v_destino.id) then
    raise exception 'Existem códigos repetidos no catálogo local. Ajuste os códigos antes de excluir.';
  end if;
  -- A proteção dos excluídos impede sua movimentação: abortar, nunca apagar em cascata.
  if exists (select 1 from public.vendas_mobile_catalogo_produtos
    where catalogo_id = p_catalogo_id and excluido_em is not null) then
    raise exception 'Este catálogo contém cadastros excluídos com histórico protegido. Solicite a transferência assistida antes de excluir o catálogo.';
  end if;
  update public.vendas_mobile_catalogo_produtos set catalogo_id = v_destino.id where catalogo_id = p_catalogo_id;
  get diagnostics v_quantidade = row_count;
  update public.vendas_mobile_produtos set catalogo_empresa_id = v_destino.id
    where catalogo_empresa_id = p_catalogo_id;
  update public.custos_importacoes_catalogo_backups set catalogo_id = v_destino.id
    where catalogo_id = p_catalogo_id and empresa_id = p_empresa_id;
  if v_origem.padrao then
    update public.vendas_mobile_catalogos set padrao = false where id = p_catalogo_id;
    update public.vendas_mobile_catalogos set padrao = true where id = v_destino.id;
  end if;
  delete from public.vendas_mobile_catalogos where id = p_catalogo_id and empresa_id = p_empresa_id;
  return jsonb_build_object('excluido', true, 'produtos_movidos', v_quantidade, 'catalogo_destino_id', v_destino.id);
end;
$$;
revoke all on function public.custos_excluir_catalogo_rpc(uuid, uuid) from public, anon;
grant execute on function public.custos_excluir_catalogo_rpc(uuid, uuid) to authenticated;
commit;
