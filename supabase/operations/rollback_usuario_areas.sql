-- Somente junto do rollback da aplicação. Não exclui dados nem auditoria.
begin;
do $$ declare f record; p record; begin
  for f in select definicao from public.usuario_areas_rpc_backup loop execute f.definicao; end loop;
  for p in select schemaname,tablename,policyname from pg_policies where policyname='usuario_area_limite'
  loop execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename); end loop;
end $$;
drop trigger if exists usuario_areas_validar on public.usuarios_empresa;
-- Colunas, auditoria e cópias das RPCs ficam disponíveis para recuperação.
commit;
