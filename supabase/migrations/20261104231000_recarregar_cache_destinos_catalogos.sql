-- Garante que o PostgREST reconheça imediatamente o contrato de destinos.
-- O cliente mantém compatibilidade com as RPCs anteriores durante a recarga.
begin;

grant execute on function public.custos_alterar_destino_catalogo_rpc(uuid, uuid, text, boolean) to authenticated;
grant execute on function public.custos_alterar_status_catalogo_empresa_rpc(uuid, uuid, boolean) to authenticated;
grant execute on function public.custos_alterar_publicacao_avantavendas_catalogo_rpc(uuid, uuid, boolean) to authenticated;

commit;

notify pgrst, 'reload schema';
