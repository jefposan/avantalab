-- Atualiza o AvantaVendas aberto assim que uma solicitação empresarial é
-- aprovada, rejeitada ou tem o vínculo comercial alterado.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'vendas_mobile_solicitacoes_acesso'
    ) then
      alter publication supabase_realtime add table public.vendas_mobile_solicitacoes_acesso;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'vendas_mobile_acessos'
    ) then
      alter publication supabase_realtime add table public.vendas_mobile_acessos;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'vendas_mobile_vinculos_comerciais'
    ) then
      alter publication supabase_realtime add table public.vendas_mobile_vinculos_comerciais;
    end if;
  end if;
end $$;
