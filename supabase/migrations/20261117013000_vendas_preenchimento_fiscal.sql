begin;
set local lock_timeout='5s';
create table public.vendas_fiscal_preenchimentos (
 id uuid not null,
 empresa_id uuid not null references public.empresas(id) on delete cascade,
 conteudo jsonb not null check(jsonb_typeof(conteudo)='object' and pg_column_size(conteudo)<=262144),
 conteudo_hash text not null check(conteudo_hash~'^[0-9a-f]{64}$'),
 versao integer not null default 1 check(versao>0),
 concluido boolean not null default false,
 criado_por uuid references auth.users(id) on delete set null,
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(),
 primary key(empresa_id,id)
);
alter table public.vendas_fiscal_preenchimentos enable row level security;
alter table public.vendas_fiscal_preenchimentos force row level security;
revoke all on public.vendas_fiscal_preenchimentos from public,anon,authenticated;
grant select,insert,update on public.vendas_fiscal_preenchimentos to service_role,avanta_vendas_runtime;
create policy vendas_preenchimentos_runtime on public.vendas_fiscal_preenchimentos to avanta_vendas_runtime using(true) with check(true);
comment on table public.vendas_fiscal_preenchimentos is 'Preenchimento editável da nota, isolado por empresa no backend autorizado; não é documento fiscal, não reserva número, não gera estoque ou financeiro.';
commit;
