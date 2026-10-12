-- Identificação interna por conexão/empresa; não altera credenciais, vendas ou estoque.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
create unique index if not exists marketplace_connections_id_empresa_idx
  on public.marketplace_connections(id, empresa_id);
create table if not exists public.marketplace_connection_labels (
  connection_id uuid primary key,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  local_label text not null default '' check (char_length(local_label) <= 80 and local_label !~ '[[:cntrl:]]'),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  foreign key (connection_id, empresa_id) references public.marketplace_connections(id, empresa_id) on delete cascade
);
alter table public.marketplace_connection_labels enable row level security;
revoke all on public.marketplace_connection_labels from anon, authenticated;
grant select, insert, update on public.marketplace_connection_labels to service_role;
create index if not exists marketplace_connection_labels_empresa_idx on public.marketplace_connection_labels(empresa_id);
comment on table public.marketplace_connection_labels is 'Nomes locais de contas marketplace. Acesso somente pelo backend autorizado por empresa.';
commit;
