-- Mantém Gestão Web e Gestão Mobile atualizadas quando Centros de custo muda
-- em outra sessão aberta para o mesmo perfil.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'configuracoes'
    ) then
      alter publication supabase_realtime add table public.configuracoes;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'centros_custo'
    ) then
      alter publication supabase_realtime add table public.centros_custo;
    end if;
  end if;
end
$$;
