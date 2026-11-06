begin;
set local lock_timeout='5s';
-- Mantém todas as reservas e tentativas; uma reserva liberada deixa de ocupar um número.
alter table fiscal_private.number_reservations drop constraint number_reservations_status_check;
alter table fiscal_private.number_reservations add constraint number_reservations_status_check check(status in ('reserved','authorized','void_pending','voided','released'));
do $$ declare r record; begin
 for r in select c.conname from pg_constraint c where c.conrelid='fiscal_private.number_reservations'::regclass and c.contype='u' and array_length(c.conkey,1)=5 loop
  execute format('alter table fiscal_private.number_reservations drop constraint %I',r.conname);
 end loop;
end $$;
create unique index number_reservations_occupied_number on fiscal_private.number_reservations(company_id,establishment_id,document_type,series,number) where status<>'released';
create table fiscal_private.draft_deletions(
 company_id uuid not null references public.empresas(id) on delete restrict,
 draft_id uuid not null,
 emission_id uuid references fiscal_private.emissions(id) on delete restrict,
 actor_id uuid references auth.users(id) on delete set null,
 previous_state text not null,
 series text,
 number integer,
 created_at timestamptz not null default now(),
 primary key(company_id,draft_id),
 foreign key(company_id,draft_id) references public.vendas_fiscal_rascunhos(empresa_id,id) on delete restrict
);
alter table fiscal_private.draft_deletions enable row level security;
alter table fiscal_private.draft_deletions force row level security;
grant select,insert on fiscal_private.draft_deletions to service_role,avanta_vendas_runtime;
create policy runtime_tridium on fiscal_private.draft_deletions for all to avanta_vendas_runtime using(company_id='ec9604fd-38f2-429b-9c00-c4bc6c642b0e'::uuid) with check(company_id='ec9604fd-38f2-429b-9c00-c4bc6c642b0e'::uuid);
create policy service_role_access on fiscal_private.draft_deletions for all to service_role using(true) with check(true);
-- Permite iniciar outro rascunho do mesmo pedido depois da exclusão, sem perder o retrato anterior.
do $$ declare r record; begin
 for r in select c.conname from pg_constraint c where c.conrelid='public.vendas_fiscal_rascunhos'::regclass and c.contype='u' and (select array_agg(a.attname::text order by a.attname) from unnest(c.conkey) k join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k)=array['empresa_id','operacao_id'] loop
  execute format('alter table public.vendas_fiscal_rascunhos drop constraint %I',r.conname);
 end loop;
end $$;
create index vendas_fiscal_rascunhos_origem_idx on public.vendas_fiscal_rascunhos(empresa_id,operacao_id);
create function public.vendas_guardar_rascunho_ativo() returns trigger language plpgsql as $$
begin
 if new.operacao_id is not null then
  perform 1 from public.vendas_operacoes where empresa_id=new.empresa_id and id=new.operacao_id for update;
  if exists(select 1 from public.vendas_fiscal_rascunhos r where r.empresa_id=new.empresa_id and r.operacao_id=new.operacao_id and not exists(select 1 from fiscal_private.draft_deletions d where d.company_id=r.empresa_id and d.draft_id=r.id) and not exists(select 1 from public.vendas_fiscal_rascunho_cancelamentos c where c.empresa_id=r.empresa_id and c.rascunho_id=r.id)) then
   raise exception 'Já existe rascunho fiscal ativo para este pedido.' using errcode='23505';
  end if;
 end if;
 return new;
end $$;
create trigger vendas_guardar_rascunho_ativo before insert on public.vendas_fiscal_rascunhos for each row execute function public.vendas_guardar_rascunho_ativo();
create function fiscal_private.prevent_deleted_draft_emission() returns trigger language plpgsql as $$
begin
 perform 1 from public.vendas_fiscal_rascunhos where empresa_id=new.company_id and id::text=new.draft_id for update;
 if exists(select 1 from fiscal_private.draft_deletions where company_id=new.company_id and draft_id::text=new.draft_id) then
  raise exception 'Rascunho excluído; inicie uma nova nota.' using errcode='23514';
 end if;
 return new;
end $$;
create trigger prevent_deleted_draft_emission before insert on fiscal_private.emissions for each row execute function fiscal_private.prevent_deleted_draft_emission();
create trigger fiscal_draft_deletions_immutable before update or delete on fiscal_private.draft_deletions for each row execute function public.vendas_rejeitar_alteracao_imutavel();
comment on table fiscal_private.draft_deletions is 'Exclusão operacional de rascunho não autorizado; conserva auditoria e não cancela documento fiscal.';
commit;
