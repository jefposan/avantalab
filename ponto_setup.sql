-- ─────────────────────────────────────────────────────────────
-- MÓDULO: Controle de Ponto (v1 — só registro de horas)
-- Rode no SQL Editor do Supabase, DEPOIS de modulos_setup.sql.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.ponto_registros (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  tipo          text not null check (tipo in ('entrada','saida_refeicao','retorno_refeicao','saida')),
  registrado_em timestamptz not null default now(),
  -- dia de referência no fuso de Brasília (para agrupar o expediente)
  dia           date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  criado_em     timestamptz not null default now()
);

create index if not exists ponto_registros_empresa_dia_idx
  on public.ponto_registros(empresa_id, dia);
create index if not exists ponto_registros_user_dia_idx
  on public.ponto_registros(user_id, dia);

alter table public.ponto_registros enable row level security;

-- Usuários da empresa podem VER os registros da empresa (o gestor vê todos;
-- a UI mostra ao colaborador apenas os dele). Em versão futura dá para
-- restringir leitura de terceiros só a gestores.
create policy "ponto_registros_select" on public.ponto_registros
  for select using (
    empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid())
  );

-- Cada um registra o PRÓPRIO ponto, na empresa a que tem vínculo.
create policy "ponto_registros_insert" on public.ponto_registros
  for insert with check (
    user_id = auth.uid()
    and empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid())
  );
