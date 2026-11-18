begin;
set local lock_timeout='5s';
-- Histórico privado; acesso somente pelo servidor após validar empresa e permissões.
create table fiscal_private.note_backups (
 id uuid primary key,
 company_id uuid not null references public.empresas(id) on delete restrict,
 actor_id uuid not null references auth.users(id) on delete restrict,
 request_id uuid not null,
 start_date date not null,
 end_date date not null check(end_date >= start_date),
 client_document text not null default '',
 client_label text not null,
 filename text not null,
 state text not null default 'generating' check(state in ('generating','ready','failed')),
 notes jsonb not null check(jsonb_typeof(notes)='array'),
 note_count integer not null check(note_count between 1 and 500),
 completed integer not null default 0 check(completed>=0 and completed<=note_count),
 byte_length bigint not null default 0 check(byte_length>=0),
 checksum text,
 failure_message text,
 lease_id uuid,
 lease_until timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(company_id,request_id),
 constraint backup_ready_complete check(state<>'ready' or (completed=note_count and byte_length>0 and checksum ~ '^[a-f0-9]{64}$'))
);
create index note_backups_company_created on fiscal_private.note_backups(company_id,created_at desc,id desc);
create unique index note_backups_one_running on fiscal_private.note_backups(company_id) where state='generating';
alter table fiscal_private.note_backups enable row level security;
revoke all on fiscal_private.note_backups from public,anon,authenticated;
grant select,insert,update on fiscal_private.note_backups to service_role,avanta_vendas_runtime;
create policy note_backups_runtime on fiscal_private.note_backups to avanta_vendas_runtime
 using(public.vendas_runtime_empresa_liberada(company_id))
 with check(public.vendas_runtime_empresa_liberada(company_id));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('vendas-notas-backups','vendas-notas-backups',false,209715200,array['application/zip'])
 on conflict(id) do nothing;
commit;
