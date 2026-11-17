begin;
set local lock_timeout = '5s';
-- Inicialização sob demanda, sem migração em massa ou alteração de fontes existentes.
create function public.custos_garantir_catalogo_inicial_rpc(p_empresa_id uuid)
returns public.vendas_mobile_catalogos
language plpgsql security definer set search_path = public as $$
declare
  v_catalogo public.vendas_mobile_catalogos;
  v_codigo text := 'CUSTOS_LOCAL';
begin
  if auth.uid() is null or not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para iniciar o catálogo desta empresa.';
  end if;
  perform 1 from public.empresas where id = p_empresa_id for update;
  if not found then raise exception 'Empresa não localizada.'; end if;
  select * into v_catalogo from public.vendas_mobile_catalogos
    where empresa_id = p_empresa_id and excluido_em is null
    order by padrao desc, criado_em, id limit 1;
  if found then return v_catalogo; end if;
  -- Não reativa nem reutiliza uma fonte excluída ou seu identificador protegido.
  if exists(select 1 from public.vendas_mobile_catalogos where empresa_id=p_empresa_id and codigo=v_codigo) then
    v_codigo := 'CUSTOS_LOCAL_' || upper(replace(gen_random_uuid()::text, '-', ''));
  end if;
  insert into public.vendas_mobile_catalogos
    (empresa_id,nome,codigo,origem,ativo,publicado_avantavendas,padrao,criado_por)
  values (p_empresa_id,'Catálogo local',v_codigo,'custos_local',true,false,
    not exists(select 1 from public.vendas_mobile_catalogos where empresa_id=p_empresa_id and padrao),auth.uid())
  returning * into v_catalogo;
  return v_catalogo;
end;
$$;
revoke all on function public.custos_garantir_catalogo_inicial_rpc(uuid) from public, anon;
grant execute on function public.custos_garantir_catalogo_inicial_rpc(uuid) to authenticated;
comment on function public.custos_garantir_catalogo_inicial_rpc(uuid) is
  'Cria catálogo local somente quando não há catálogo não excluído, com permissão de edição. Preserva fontes existentes; não publica no AvantaVendas.';
commit;
