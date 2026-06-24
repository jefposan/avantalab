-- ─────────────────────────────────────────────────────────────
-- Controle de Ponto — local da empresa + geofence (100m)
-- Rodar no SQL Editor do Supabase (depois de ponto_setup.sql).
-- ─────────────────────────────────────────────────────────────

-- Localização da empresa (definida pelo gestor) + raio permitido
create table if not exists public.ponto_config (
  empresa_id    uuid primary key references public.empresas(id) on delete cascade,
  latitude      double precision,
  longitude     double precision,
  raio_m        integer not null default 100,
  atualizado_em timestamptz not null default now()
);

alter table public.ponto_config enable row level security;

-- Membros da empresa leem (o funcionário precisa pra calcular a distância)
drop policy if exists "ponto_config_select" on public.ponto_config;
create policy "ponto_config_select" on public.ponto_config
  for select using (
    empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid())
  );

-- Só gestor/admin definem o local
drop policy if exists "ponto_config_insert" on public.ponto_config;
create policy "ponto_config_insert" on public.ponto_config
  for insert with check (
    empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid() and perfil in ('gestor_master','administrador'))
  );
drop policy if exists "ponto_config_update" on public.ponto_config;
create policy "ponto_config_update" on public.ponto_config
  for update using (
    empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid() and perfil in ('gestor_master','administrador'))
  );

-- Distância (em metros) do funcionário até a empresa no momento do registro
alter table public.ponto_registros
  add column if not exists distancia_m double precision;
