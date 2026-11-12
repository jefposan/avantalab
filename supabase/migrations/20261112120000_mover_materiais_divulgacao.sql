-- Move apenas o vínculo de pasta; preserva arquivo, URL, hash e miniatura.
-- SECURITY INVOKER conserva integralmente as políticas RLS existentes.
begin;
create or replace function public.mover_material_divulgacao_rpc(
  p_empresa_id uuid, p_material_id uuid, p_pasta_origem_id uuid, p_pasta_destino_id uuid
)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_material public.vendas_mobile_divulgacao_materiais;
  v_capas jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  select * into v_material from public.vendas_mobile_divulgacao_materiais
    where id=p_material_id and empresa_id=p_empresa_id and ativo for update;
  if not found then raise exception 'Material indisponível ou sem permissão para mover.'; end if;
  if v_material.pasta_id is distinct from p_pasta_origem_id then
    raise exception 'O material já mudou de pasta. Atualize a lista antes de mover novamente.';
  end if;
  perform 1 from public.vendas_mobile_divulgacao_pastas
    where id=p_pasta_destino_id and empresa_id=p_empresa_id and ativo for key share;
  if not found then raise exception 'Pasta de destino indisponível neste perfil.'; end if;
  if v_material.pasta_id=p_pasta_destino_id then
    return jsonb_build_object('material',to_jsonb(v_material),'capas_limpas',v_capas);
  end if;
  update public.vendas_mobile_divulgacao_materiais
    set pasta_id=p_pasta_destino_id, atualizado_em=now()
    where id=p_material_id and empresa_id=p_empresa_id and pasta_id=p_pasta_origem_id and ativo
    returning * into v_material;
  if not found then raise exception 'Não foi possível mover o material.'; end if;
  -- Capa personalizada por material exige que ele continue em uma subpasta.
  -- Ao sair da árvore original, limpa só a referência; não apaga imagens.
  with recursive ancestrais(id) as (
    select pasta_pai_id from public.vendas_mobile_divulgacao_pastas
      where id=p_pasta_destino_id and empresa_id=p_empresa_id and pasta_pai_id is not null
    union
    select pasta.pasta_pai_id from public.vendas_mobile_divulgacao_pastas pasta
      join ancestrais anterior on pasta.id=anterior.id
      where pasta.empresa_id=p_empresa_id and pasta.pasta_pai_id is not null
  ), limpas as (
    update public.vendas_mobile_divulgacao_pastas
      set capa_material_id=null, atualizado_em=now()
      where empresa_id=p_empresa_id and capa_material_id=p_material_id
        and id not in(select id from ancestrais)
      returning id
  ) select coalesce(jsonb_agg(id),'[]'::jsonb) into v_capas from limpas;
  return jsonb_build_object('material',to_jsonb(v_material),'capas_limpas',v_capas);
end;
$$;
revoke all on function public.mover_material_divulgacao_rpc(uuid,uuid,uuid,uuid) from public, anon;
grant execute on function public.mover_material_divulgacao_rpc(uuid,uuid,uuid,uuid) to authenticated;
commit;
