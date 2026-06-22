-- ─────────────────────────────────────────────────────────────
-- NOTIFICACOES + PUSH (Web Push / PWA)
-- Fase 1: tabelas de inscricoes de push e de notificacoes
-- Rode este script inteiro no SQL Editor do painel do Supabase.
-- ─────────────────────────────────────────────────────────────

-- ─── TABELA: push_subscriptions ─────────────────────────────
-- Guarda a inscricao de push de cada aparelho/navegador do usuario.
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  empresa_id  uuid references public.empresas(id) on delete set null,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Usuario gerencia apenas as proprias inscricoes
create policy "push_subscriptions_select" on public.push_subscriptions
  for select using (user_id = auth.uid());

create policy "push_subscriptions_insert" on public.push_subscriptions
  for insert with check (user_id = auth.uid());

create policy "push_subscriptions_update" on public.push_subscriptions
  for update using (user_id = auth.uid());

create policy "push_subscriptions_delete" on public.push_subscriptions
  for delete using (user_id = auth.uid());

-- ─── TABELA: notificacoes ───────────────────────────────────
-- Fonte da verdade do "sininho". Cada linha e uma notificacao.
-- user_id preenchido = notificacao de um usuario especifico.
-- user_id nulo = notificacao para todos os usuarios da empresa.
create table if not exists public.notificacoes (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  titulo      text not null,
  corpo       text not null default '',
  url         text not null default '/mobile',
  tipo        text not null default 'sistema',
  lida        boolean not null default false,
  criado_em   timestamptz not null default now()
);

create index if not exists notificacoes_empresa_id_idx
  on public.notificacoes(empresa_id);
create index if not exists notificacoes_user_lida_idx
  on public.notificacoes(user_id, lida);

alter table public.notificacoes enable row level security;

-- Usuario ve notificacoes dele OU gerais das empresas a que tem vinculo
create policy "notificacoes_select" on public.notificacoes
  for select using (
    (user_id = auth.uid())
    or (
      user_id is null
      and empresa_id in (
        select empresa_id from public.usuarios_empresa
        where user_id = auth.uid()
      )
    )
  );

-- Usuario pode marcar como lida (update) as que enxerga
create policy "notificacoes_update" on public.notificacoes
  for update using (
    (user_id = auth.uid())
    or (
      user_id is null
      and empresa_id in (
        select empresa_id from public.usuarios_empresa
        where user_id = auth.uid()
      )
    )
  );

-- Observacao: a INSERCAO de notificacoes e feita pelo Edge Function /
-- job agendado usando a service_role key, que ignora o RLS. Por isso
-- nao criamos policy de insert para usuarios comuns.
