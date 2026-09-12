-- Eventos públicos do link inteligente do AvantaVendas.
-- Não há identificação pessoal, IP ou User-Agent bruto: somente destino,
-- dispositivo classificado e UTMs necessários para análise de campanhas.

create extension if not exists pgcrypto;

create table if not exists public.avantavendas_download_eventos (
  id uuid primary key default gen_random_uuid(),
  tipo_evento text not null check (tipo_evento in ('acesso', 'selecao_loja')),
  dispositivo text not null check (dispositivo in ('ios', 'android', 'outro')),
  destino text not null check (destino in ('app_store', 'google_play', 'pagina_intermediaria')),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  created_at timestamptz not null default now()
);

create index if not exists avantavendas_download_eventos_created_at_idx
  on public.avantavendas_download_eventos (created_at desc);
create index if not exists avantavendas_download_eventos_destino_created_at_idx
  on public.avantavendas_download_eventos (destino, created_at desc);
create index if not exists avantavendas_download_eventos_utm_source_created_at_idx
  on public.avantavendas_download_eventos (utm_source, created_at desc)
  where utm_source is not null;

alter table public.avantavendas_download_eventos enable row level security;
revoke all on table public.avantavendas_download_eventos from anon, authenticated;

-- Nenhuma policy pública: a gravação ocorre somente pelo Route Handler usando
-- a service role, e a consulta futura deve ser protegida no ambiente admin.
