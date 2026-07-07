-- Ciclo financeiro AvantaLab / Asaas.
-- Idempotente: pode ser aplicado em bancos onde as tabelas basicas de cobranca
-- ja tenham sido criadas manualmente.

create extension if not exists pgcrypto;

create table if not exists public.cupons (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  tipo text not null check (tipo in ('periodo', 'vitalicio')),
  duracao_valor integer,
  duracao_unidade text check (duracao_unidade in ('dias', 'semanas', 'meses')),
  max_usos integer,
  usos integer not null default 0,
  validade timestamptz,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.cupons add column if not exists duracao_valor integer;
alter table public.cupons add column if not exists duracao_unidade text;
create index if not exists cupons_codigo_idx on public.cupons(codigo);
alter table public.cupons enable row level security;

create table if not exists public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  tipo_perfil text not null check (tipo_perfil in ('empresa', 'pessoal')),
  plano text,
  status text not null default 'trial'
    check (status in ('trial', 'ativa', 'expirada', 'cancelada', 'cortesia', 'inadimplente')),
  ciclo text check (ciclo in ('mensal', 'anual')),
  trial_fim timestamptz,
  valido_ate timestamptz,
  gateway text,
  gateway_customer_id text,
  gateway_subscription_id text,
  cupom_id uuid references public.cupons(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id)
);

alter table public.assinaturas add column if not exists plano text;
alter table public.assinaturas add column if not exists tipo_perfil text;
alter table public.assinaturas add column if not exists status text not null default 'trial';
alter table public.assinaturas add column if not exists ciclo text;
alter table public.assinaturas add column if not exists trial_fim timestamptz;
alter table public.assinaturas add column if not exists valido_ate timestamptz;
alter table public.assinaturas add column if not exists gateway text;
alter table public.assinaturas add column if not exists gateway_customer_id text;
alter table public.assinaturas add column if not exists gateway_subscription_id text;
alter table public.assinaturas add column if not exists cupom_id uuid references public.cupons(id);
alter table public.assinaturas add column if not exists criado_em timestamptz not null default now();
alter table public.assinaturas add column if not exists atualizado_em timestamptz not null default now();
create unique index if not exists assinaturas_empresa_unique_idx on public.assinaturas(empresa_id);
create index if not exists assinaturas_empresa_idx on public.assinaturas(empresa_id);
create index if not exists assinaturas_status_idx on public.assinaturas(status);
create index if not exists assinaturas_gw_cust_idx on public.assinaturas(gateway_customer_id);
create unique index if not exists assinaturas_gw_sub_unique_idx
  on public.assinaturas(gateway_subscription_id)
  where gateway_subscription_id is not null;
alter table public.assinaturas enable row level security;

drop policy if exists "assinaturas_select" on public.assinaturas;
create policy "assinaturas_select" on public.assinaturas
  for select using (
    empresa_id in (
      select empresa_id from public.usuarios_empresa where user_id = auth.uid()
    )
  );

create table if not exists public.cupons_resgates (
  id uuid primary key default gen_random_uuid(),
  cupom_id uuid not null references public.cupons(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  resgatado_em timestamptz not null default now()
);
create index if not exists cupons_resgates_cupom_idx on public.cupons_resgates(cupom_id);
create index if not exists cupons_resgates_empresa_idx on public.cupons_resgates(empresa_id);
alter table public.cupons_resgates enable row level security;

-- Espelho operacional das cobrancas geradas pela assinatura. A interface ainda
-- consulta a Asaas diretamente; esta tabela garante historico e conciliacao.
create table if not exists public.assinatura_faturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  assinatura_id uuid references public.assinaturas(id) on delete set null,
  gateway_payment_id text not null unique,
  gateway_subscription_id text,
  status text not null,
  valor numeric(12,2) not null default 0,
  vencimento date,
  pagamento_em timestamptz,
  forma_pagamento text,
  invoice_url text,
  payload jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists assinatura_faturas_empresa_idx on public.assinatura_faturas(empresa_id);
create index if not exists assinatura_faturas_assinatura_idx on public.assinatura_faturas(assinatura_id);
create index if not exists assinatura_faturas_status_idx on public.assinatura_faturas(status);
create index if not exists assinatura_faturas_vencimento_idx on public.assinatura_faturas(vencimento desc);
alter table public.assinatura_faturas enable row level security;

-- Caixa de entrada dos webhooks. O id do evento Asaas torna o processamento
-- idempotente e preserva informacao suficiente para auditoria/reprocessamento.
create table if not exists public.cobranca_webhook_eventos (
  id uuid primary key default gen_random_uuid(),
  asaas_event_id text not null unique,
  evento text not null,
  empresa_id uuid references public.empresas(id) on delete set null,
  gateway_subscription_id text,
  gateway_payment_id text,
  payload jsonb not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'processado', 'erro')),
  erro text,
  recebido_em timestamptz not null default now(),
  processado_em timestamptz
);
create index if not exists cobranca_webhook_eventos_status_idx
  on public.cobranca_webhook_eventos(status, recebido_em);
create index if not exists cobranca_webhook_eventos_empresa_idx
  on public.cobranca_webhook_eventos(empresa_id, recebido_em desc);
alter table public.cobranca_webhook_eventos enable row level security;

-- Sem policies de escrita nas tabelas operacionais: somente as rotas servidoras
-- com service role podem gravar eventos e faturas.

-- Concilia a Asaas a cada 30 minutos para recuperar webhooks perdidos.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
declare
  job_id bigint;
begin
  select jobid into job_id from cron.job where jobname = 'conciliar-cobrancas' limit 1;
  if job_id is not null then perform cron.unschedule(job_id); end if;
end $$;

select cron.schedule(
  'conciliar-cobrancas',
  '*/30 * * * *',
  $job$
    select net.http_post(
      url := 'https://qzewxhdkwettnlmkjoqd.supabase.co/functions/v1/conciliar-cobrancas',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (
          select decrypted_secret from vault.decrypted_secrets where name = 'cron_edge_secret'
        ),
        'Authorization', (
          select 'Bearer ' || decrypted_secret from vault.decrypted_secrets where name = 'cron_edge_secret'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $job$
);
