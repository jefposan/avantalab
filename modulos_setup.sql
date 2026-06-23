-- ─────────────────────────────────────────────────────────────
-- FUNDAÇÃO DO SISTEMA DE MÓDULOS (Fase 1)
-- Rode este script inteiro no SQL Editor do painel do Supabase.
-- ─────────────────────────────────────────────────────────────

-- ─── Catálogo de módulos disponíveis no produto ─────────────
create table if not exists public.modulos (
  id          text primary key,             -- slug: 'ponto', 'vendas', ...
  nome        text not null,
  descricao   text not null default '',
  icone       text not null default '',
  disponivel  boolean not null default true,
  -- tipos de perfil que podem instalar (vazio = todos): ex.: '{empresa}'
  perfis      text[] not null default '{}',
  ordem       integer not null default 0,
  criado_em   timestamptz not null default now()
);

-- ─── Ativação por empresa (quais módulos cada perfil tem) ───
create table if not exists public.empresa_modulos (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  modulo_id     text not null references public.modulos(id) on delete cascade,
  ativo         boolean not null default true,
  origem        text not null default 'avulso',   -- 'plano' | 'avulso' | 'cortesia'
  expira_em     timestamptz,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique(empresa_id, modulo_id)
);

create index if not exists empresa_modulos_empresa_idx
  on public.empresa_modulos(empresa_id);

alter table public.modulos enable row level security;
alter table public.empresa_modulos enable row level security;

-- Catálogo: qualquer usuário autenticado pode ler
create policy "modulos_select" on public.modulos
  for select using (auth.role() = 'authenticated');

-- Ativação: usuários da empresa leem e gerenciam os módulos da própria
-- empresa. (Fase de testes — quando entrar cobrança, a ativação passa a
-- ser controlada pelo servidor/assinatura.)
create policy "empresa_modulos_select" on public.empresa_modulos
  for select using (
    empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid())
  );
create policy "empresa_modulos_insert" on public.empresa_modulos
  for insert with check (
    empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid())
  );
create policy "empresa_modulos_update" on public.empresa_modulos
  for update using (
    empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid())
  );
create policy "empresa_modulos_delete" on public.empresa_modulos
  for delete using (
    empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid())
  );

-- ─── Semear o catálogo com o módulo de Controle de Ponto ────
insert into public.modulos (id, nome, descricao, icone, perfis, ordem)
values ('ponto', 'Controle de Ponto', 'Registro de entrada e saída dos colaboradores.', 'relogio', '{empresa}', 1)
on conflict (id) do nothing;
