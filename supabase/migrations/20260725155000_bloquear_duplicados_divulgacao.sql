-- Identifica materiais da Divulgação pelo conteúdo, independentemente do nome
-- ou da pasta em que foram enviados.

alter table public.vendas_mobile_divulgacao_materiais
  add column if not exists arquivo_hash text;

comment on column public.vendas_mobile_divulgacao_materiais.arquivo_hash is
  'SHA-256 hexadecimal do conteúdo original usado para impedir duplicidade por empresa.';

alter table public.vendas_mobile_divulgacao_materiais
  drop constraint if exists vendas_divulgacao_materiais_hash_formato_check;

alter table public.vendas_mobile_divulgacao_materiais
  add constraint vendas_divulgacao_materiais_hash_formato_check
  check (arquivo_hash is null or arquivo_hash ~ '^[0-9a-f]{64}$');

create unique index if not exists vendas_divulgacao_materiais_empresa_hash_uq
  on public.vendas_mobile_divulgacao_materiais (empresa_id, arquivo_hash)
  where arquivo_hash is not null;
