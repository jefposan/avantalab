begin;
set local lock_timeout='5s';
-- Apenas o gatilho pode travar o retrato imutável; o runtime continua sem UPDATE.
-- Sem argumentos, SQL dinâmico, dados retornados ou novo ponto de acesso público.
create or replace function fiscal_private.prevent_deleted_draft_emission()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_schema<>'fiscal_private' or tg_table_name<>'emissions' or tg_op<>'INSERT' then
  raise exception 'Contexto inválido da proteção fiscal.' using errcode='42501';
 end if;
 perform 1 from public.vendas_fiscal_rascunhos
  where empresa_id=new.company_id and id::text=new.draft_id for update;
 if not found then
  raise exception 'Rascunho fiscal não localizado nesta empresa.' using errcode='23503';
 end if;
 if exists(select 1 from fiscal_private.draft_deletions
  where company_id=new.company_id and draft_id::text=new.draft_id) then
  raise exception 'Rascunho excluído; inicie uma nova nota.' using errcode='23514';
 end if;
 return new;
end $$;
revoke all on function fiscal_private.prevent_deleted_draft_emission() from public,anon,authenticated,service_role,avanta_vendas_runtime;
comment on function fiscal_private.prevent_deleted_draft_emission() is 'Gatilho privado: serializa criação e exclusão do mesmo rascunho, sem conceder UPDATE ao runtime.';
commit;
