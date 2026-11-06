begin;
create unique index if not exists custos_tabelas_empresa_id_unique on public.custos_tabelas_preco(empresa_id,id);
alter table public.vendas_clientes add column if not exists tabela_preco_id uuid;
alter table public.vendas_clientes add constraint vendas_cliente_tabela_perfil foreign key(empresa_id,tabela_preco_id) references public.custos_tabelas_preco(empresa_id,id);
create table public.vendas_fiscal_mensagens(
 id uuid primary key,
 empresa_id uuid not null references public.empresas(id) on delete cascade,
 titulo text not null check(length(trim(titulo)) between 1 and 80),
 destino text not null check(destino in ('additional','fiscal','internal')),
 mensagem text not null check(length(trim(mensagem)) between 1 and 5000 and (destino='additional' or length(mensagem)<=2000)),
 criado_por uuid references auth.users(id),criado_em timestamptz not null default now(),
 unique(empresa_id,id)
);
alter table public.vendas_fiscal_mensagens enable row level security;
alter table public.vendas_fiscal_mensagens force row level security;
revoke all on public.vendas_fiscal_mensagens from public,anon,authenticated;
grant select,insert on public.vendas_fiscal_mensagens to service_role,avanta_vendas_runtime;
create policy runtime_tridium on public.vendas_fiscal_mensagens for all to avanta_vendas_runtime using(empresa_id='ec9604fd-38f2-429b-9c00-c4bc6c642b0e'::uuid) with check(empresa_id='ec9604fd-38f2-429b-9c00-c4bc6c642b0e'::uuid);
create policy service_role_access on public.vendas_fiscal_mensagens for all to service_role using(true) with check(true);
comment on table public.vendas_fiscal_mensagens is 'Mensagens de emissão pertencentes ao perfil empresarial. Mensagens internas nunca compõem XML ou DANFE.';
commit;
