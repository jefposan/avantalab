do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ponto_registros'
  ) then
    alter publication supabase_realtime add table public.ponto_registros;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ponto_funcionarios'
  ) then
    alter publication supabase_realtime add table public.ponto_funcionarios;
  end if;
end
$$;
