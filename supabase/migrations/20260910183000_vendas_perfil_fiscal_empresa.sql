-- O produto mantém capacidade para NF-e, NFC-e e NFS-e. Esta tabela registra
-- somente quais documentos cada perfil empresarial realmente utiliza.
begin;

create table public.vendas_fiscal_perfis (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  documentos_habilitados text[] not null default '{}'::text[],
  documento_padrao text,
  ambiente_fiscal text not null default 'homologacao' check (ambiente_fiscal in ('homologacao','producao')),
  versao integer not null default 1 check (versao > 0),
  atualizado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint vendas_fiscal_perfis_documentos_check check (
    cardinality(documentos_habilitados) between 1 and 3
    and documentos_habilitados <@ array['nfe','nfce','nfse']::text[]
  ),
  constraint vendas_fiscal_perfis_padrao_check check (documento_padrao = any(documentos_habilitados))
);

create trigger vendas_fiscal_perfis_touch before update on public.vendas_fiscal_perfis
for each row execute function public.vendas_touch_version();

alter table public.vendas_fiscal_perfis enable row level security;
alter table public.vendas_fiscal_perfis force row level security;
revoke all on table public.vendas_fiscal_perfis from public, anon, authenticated;
grant select,insert,update on public.vendas_fiscal_perfis to avanta_vendas_runtime;

create policy vendas_runtime_tridium on public.vendas_fiscal_perfis for all to avanta_vendas_runtime
using (empresa_id = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e'::uuid)
with check (empresa_id = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e'::uuid);

insert into public.vendas_fiscal_perfis(
  empresa_id,documentos_habilitados,documento_padrao,ambiente_fiscal
) values (
  'ec9604fd-38f2-429b-9c00-c4bc6c642b0e'::uuid,array['nfe']::text[],'nfe','homologacao'
) on conflict (empresa_id) do update set
  documentos_habilitados=excluded.documentos_habilitados,
  documento_padrao=excluded.documento_padrao,
  ambiente_fiscal=excluded.ambiente_fiscal;

comment on table public.vendas_fiscal_perfis is
  'Configuração fiscal por perfil empresarial. O catálogo do produto continua independente e contempla NF-e, NFC-e e NFS-e.';

commit;
