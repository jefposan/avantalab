-- ─────────────────────────────────────────────────────────────
-- FASE 3: Agenda no servidor + disparo de push por vencimento
-- Rode este script inteiro no SQL Editor do painel do Supabase.
-- ─────────────────────────────────────────────────────────────

-- ─── TABELA: agenda_itens ───────────────────────────────────
-- Espelha os lembretes/avisos da agenda do app (que hoje ficam
-- no aparelho) para o servidor poder dispar o push no dia certo.
create table if not exists public.agenda_itens (
  id          text primary key,                 -- mesmo id gerado no app
  user_id     uuid not null references auth.users(id) on delete cascade,
  empresa_id  uuid references public.empresas(id) on delete set null,
  tipo        text not null default 'lembrete',
  titulo      text not null,
  descricao   text not null default '',
  ano         text not null default '',
  mes         text not null default '',
  dia         integer not null default 1,
  repetir     boolean not null default false,
  repeticao   text not null default '',          -- diaria|semanal|quinzenal|mensal|anual
  criado_em   timestamptz not null default now()
);

-- Datas de ocorrencias removidas individualmente (exclusao de 1 dia no web).
-- Formato de cada item: "ANO-MESINDEX(0-11)-DIA" (ex.: "2026-5-22").
alter table public.agenda_itens
  add column if not exists excluir_dias text[] not null default '{}';

create index if not exists agenda_itens_user_id_idx on public.agenda_itens(user_id);

alter table public.agenda_itens enable row level security;

-- Usuario gerencia apenas os proprios itens
create policy "agenda_itens_select" on public.agenda_itens
  for select using (user_id = auth.uid());
create policy "agenda_itens_insert" on public.agenda_itens
  for insert with check (user_id = auth.uid());
create policy "agenda_itens_update" on public.agenda_itens
  for update using (user_id = auth.uid());
create policy "agenda_itens_delete" on public.agenda_itens
  for delete using (user_id = auth.uid());

-- ─── notificacoes: colunas de origem + deduplicacao ─────────
-- origem_id = id do item de agenda que gerou a notificacao
-- ref_data  = dia de referencia (para nao duplicar no mesmo dia)
alter table public.notificacoes
  add column if not exists origem_id text,
  add column if not exists ref_data date;

-- Garante UMA notificacao por item por dia (o job usa ON CONFLICT).
-- Indice NAO-parcial de proposito: o upsert/ON CONFLICT nao consegue
-- inferir um indice parcial. NULLs sao tratados como distintos pelo
-- Postgres, entao notificacoes sem origem_id nao conflitam entre si.
create unique index if not exists notificacoes_origem_ref_uidx
  on public.notificacoes(origem_id, ref_data);
