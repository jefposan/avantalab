-- Tabela TEMPORÁRIA de diagnóstico do webhook de cobrança.
-- Registra cada chamada recebida (sem segredos: só tamanhos e sim/não).
-- Depois de resolver, pode apagar: drop table public.cobranca_webhook_log;

create table if not exists public.cobranca_webhook_log (
  id            uuid primary key default gen_random_uuid(),
  recebido_em   timestamptz not null default now(),
  evento        text,
  assinatura_gw text,
  esperado_len  integer,   -- tamanho do ASAAS_WEBHOOK_TOKEN no servidor
  recebido_len  integer,   -- tamanho do token que a Asaas enviou
  autorizado    boolean    -- os dois bateram?
);

alter table public.cobranca_webhook_log enable row level security;
-- Sem policies: só o servidor (service role) grava/lê.
