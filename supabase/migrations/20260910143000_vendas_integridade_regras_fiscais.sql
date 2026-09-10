-- Separa consumidor final da situação da inscrição estadual e preserva cada
-- publicação da matriz fiscal em histórico imutável por empresa.
begin;

alter table public.vendas_clientes
  add column consumidor_final boolean;

-- Compatibilidade com o cadastro anterior: a interface antiga representava
-- consumidor final pelo indicador contribuinte_isento; pessoas físicas também
-- eram tratadas como consumidor final. O responsável pode revisar depois.
update public.vendas_clientes
set consumidor_final = (tipo_pessoa='fisica' or indicador_ie='contribuinte_isento')
where consumidor_final is null;

alter table public.vendas_clientes
  alter column consumidor_final set default false,
  alter column consumidor_final set not null;

create table public.vendas_fiscal_configuracoes_revisoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  versao integer not null check (versao > 0),
  matriz_versao text not null,
  matriz jsonb not null check (jsonb_typeof(matriz)='object'),
  revisao_tributaria_confirmada boolean not null,
  reforma_tributaria_confirmada boolean not null,
  responsavel_fiscal text not null,
  revisado_em timestamptz not null,
  publicado_por uuid references auth.users(id) on delete set null,
  publicado_em timestamptz not null,
  conteudo_hash text not null check (conteudo_hash ~ '^[0-9a-f]{64}$'),
  chave_idempotencia text not null,
  criado_em timestamptz not null default now(),
  unique (empresa_id, versao),
  unique (empresa_id, chave_idempotencia)
);

create index vendas_fiscal_configuracoes_revisoes_lista_idx
  on public.vendas_fiscal_configuracoes_revisoes (empresa_id, versao desc);

create trigger vendas_fiscal_configuracoes_revisoes_immutable
before update or delete on public.vendas_fiscal_configuracoes_revisoes
for each row execute function public.vendas_rejeitar_alteracao_imutavel();

alter table public.vendas_fiscal_configuracoes_revisoes enable row level security;
alter table public.vendas_fiscal_configuracoes_revisoes force row level security;

revoke all on table public.vendas_fiscal_configuracoes_revisoes
  from public, anon, authenticated;
grant select,insert on table public.vendas_fiscal_configuracoes_revisoes
  to service_role, avanta_vendas_runtime;

create policy vendas_runtime_tridium on public.vendas_fiscal_configuracoes_revisoes
for all to avanta_vendas_runtime
using (empresa_id='ec9604fd-38f2-429b-9c00-c4bc6c642b0e'::uuid)
with check (empresa_id='ec9604fd-38f2-429b-9c00-c4bc6c642b0e'::uuid);

comment on column public.vendas_clientes.consumidor_final is
  'Indicador de consumidor final independente da situação da inscrição estadual.';
comment on table public.vendas_fiscal_configuracoes_revisoes is
  'Histórico imutável e integral de cada matriz fiscal publicada pela empresa.';

commit;
