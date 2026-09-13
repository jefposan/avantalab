-- Métricas oficiais diárias das lojas. A escrita é exclusivamente server-side,
-- via cron protegido e credenciais de leitura das lojas; não há dados pessoais.

create table if not exists public.lojas_downloads_diarios (
  aplicativo text not null check (aplicativo in ('avantalab', 'avantavendas')),
  loja text not null check (loja in ('apple_app_store', 'google_play')),
  data_referencia date not null,
  downloads integer not null default 0 check (downloads >= 0),
  fonte text not null check (fonte in ('apple_sales_report', 'google_play_bulk_report')),
  atualizado_em timestamptz not null default now(),
  primary key (aplicativo, loja, data_referencia)
);

create index if not exists lojas_downloads_diarios_loja_data_idx
  on public.lojas_downloads_diarios (loja, data_referencia desc);

alter table public.lojas_downloads_diarios enable row level security;
revoke all on table public.lojas_downloads_diarios from anon, authenticated;
