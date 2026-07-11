-- ─────────────────────────────────────────────────────────────
-- Controle de Ponto — dias não úteis da empresa
-- Rodar no SQL Editor do Supabase.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.ponto_dias_nao_uteis (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references public.empresas(id) on delete cascade,
  data_inicio      date not null,
  data_fim         date not null,
  tipo             text not null default 'empresa_fechada'
                   check (tipo in ('feriado','empresa_fechada','recesso','folga_coletiva','outro')),
  descricao        text,
  recorrente_anual boolean not null default false,
  criado_em        timestamptz not null default now(),
  criado_por       uuid references auth.users(id) on delete set null,
  check (data_fim >= data_inicio)
);

create index if not exists ponto_dias_nao_uteis_empresa_inicio_idx
  on public.ponto_dias_nao_uteis(empresa_id, data_inicio);

alter table public.ponto_dias_nao_uteis enable row level security;

drop policy if exists "ponto_dias_nao_uteis_select" on public.ponto_dias_nao_uteis;
create policy "ponto_dias_nao_uteis_select" on public.ponto_dias_nao_uteis
  for select using (
    empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid())
  );

drop policy if exists "ponto_dias_nao_uteis_insert" on public.ponto_dias_nao_uteis;
create policy "ponto_dias_nao_uteis_insert" on public.ponto_dias_nao_uteis
  for insert with check (
    empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid() and perfil in ('gestor_master','administrador'))
  );

drop policy if exists "ponto_dias_nao_uteis_delete" on public.ponto_dias_nao_uteis;
create policy "ponto_dias_nao_uteis_delete" on public.ponto_dias_nao_uteis
  for delete using (
    empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid() and perfil in ('gestor_master','administrador'))
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'ponto_dias_nao_uteis'
    ) then
      alter publication supabase_realtime add table public.ponto_dias_nao_uteis;
    end if;
  end if;
end $$;
