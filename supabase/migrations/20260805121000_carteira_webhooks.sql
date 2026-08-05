create table if not exists public.carteira_webhook_eventos (
  id uuid primary key default gen_random_uuid(),
  provedor text not null default 'ASAAS' check (provedor = 'ASAAS'),
  evento_id text not null unique,
  evento text not null,
  gateway_payment_id text,
  status text not null default 'pendente' check (status in ('pendente','processado','ignorado','erro')),
  payload jsonb not null default '{}'::jsonb,
  erro text,
  recebido_em timestamptz not null default now(),
  processado_em timestamptz
);
alter table public.carteira_webhook_eventos enable row level security;
revoke all on public.carteira_webhook_eventos from anon, authenticated;
