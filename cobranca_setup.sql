-- ─────────────────────────────────────────────────────────────
-- COBRANÇA / ASSINATURAS (v1) — tabelas novas, 100% aditivas.
-- Não altera nenhuma tabela existente. Seguro rodar em produção.
-- Para desfazer, rode: cobranca_rollback.sql
--
-- Segurança: RLS ativado em todas. A escrita de cobrança é feita
-- pelo servidor (chave service role, que ignora RLS). O usuário
-- logado só consegue LER a assinatura do próprio perfil.
-- ─────────────────────────────────────────────────────────────

-- ── CUPONS (exclusivo do Premium Pessoal) ─────────────────────
-- Códigos que liberam acesso sem pagamento (avaliadores, cortesias).
create table if not exists public.cupons (
  id             uuid primary key default gen_random_uuid(),
  codigo         text not null unique,                 -- o que o usuário digita
  tipo           text not null check (tipo in ('periodo','vitalicio')),
  duracao_meses  integer,                              -- usado quando tipo = 'periodo'
  max_usos       integer,                              -- limite de resgates (nulo = ilimitado)
  usos           integer not null default 0,           -- quantas vezes já foi resgatado
  validade       timestamptz,                          -- até quando o cupom pode ser resgatado (nulo = sem prazo)
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index if not exists cupons_codigo_idx on public.cupons(codigo);

alter table public.cupons enable row level security;
-- Sem policies: nenhum acesso via cliente. Só o servidor (service role)
-- lê/valida/cria cupons — evita que usuários listem ou adivinhem códigos.

-- ── ASSINATURAS (uma por perfil: empresa ou pessoal) ──────────
create table if not exists public.assinaturas (
  id                       uuid primary key default gen_random_uuid(),
  empresa_id               uuid not null references public.empresas(id) on delete cascade,
  tipo_perfil              text not null check (tipo_perfil in ('empresa','pessoal')),
  plano                    text,                        -- ex.: 'empresa', 'pessoal_premium'
  status                   text not null default 'trial'
                            check (status in ('trial','ativa','expirada','cancelada','cortesia','inadimplente')),
  ciclo                    text check (ciclo in ('mensal','anual')),
  trial_fim                timestamptz,                 -- fim dos 7 dias (perfil empresa)
  valido_ate               timestamptz,                 -- até quando o acesso vale (nulo = sem prazo, ex.: cortesia vitalícia)
  gateway                  text,                        -- ex.: 'asaas'
  gateway_customer_id      text,                        -- id do cliente no gateway
  gateway_subscription_id  text,                        -- id da assinatura no gateway (usado no webhook)
  cupom_id                 uuid references public.cupons(id),
  criado_em                timestamptz not null default now(),
  atualizado_em            timestamptz not null default now(),
  unique (empresa_id)
);
create index if not exists assinaturas_empresa_idx on public.assinaturas(empresa_id);
create index if not exists assinaturas_status_idx on public.assinaturas(status);
create index if not exists assinaturas_gw_sub_idx on public.assinaturas(gateway_subscription_id);
create index if not exists assinaturas_gw_cust_idx on public.assinaturas(gateway_customer_id);

alter table public.assinaturas enable row level security;
-- O usuário logado lê a assinatura do próprio perfil (para a tela mostrar o status).
create policy "assinaturas_select" on public.assinaturas
  for select using (
    empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid())
  );
-- Sem policies de INSERT/UPDATE/DELETE: só o servidor (service role) grava,
-- a partir do webhook do gateway. É a "fonte da verdade" da liberação.

-- ── CUPONS_RESGATES (histórico de uso dos cupons) ─────────────
create table if not exists public.cupons_resgates (
  id            uuid primary key default gen_random_uuid(),
  cupom_id      uuid not null references public.cupons(id) on delete cascade,
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  resgatado_em  timestamptz not null default now()
);
create index if not exists cupons_resgates_cupom_idx on public.cupons_resgates(cupom_id);
create index if not exists cupons_resgates_empresa_idx on public.cupons_resgates(empresa_id);

alter table public.cupons_resgates enable row level security;
-- Sem policies: registro/consulta só pelo servidor (service role).
