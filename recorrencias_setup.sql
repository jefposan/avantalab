-- ─────────────────────────────────────────────────────────────
-- TABELA: recorrencias
-- Despesas fixas que são lançadas automaticamente todo mês
-- ─────────────────────────────────────────────────────────────

create table if not exists public.recorrencias (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references public.empresas(id) on delete cascade,
  nome         text not null,
  categoria    text not null default '',
  dia          integer not null default 1 check (dia between 1 and 31),
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Índice para buscas por empresa
create index if not exists recorrencias_empresa_id_idx
  on public.recorrencias(empresa_id);

-- Índice para buscar apenas ativas
create index if not exists recorrencias_empresa_ativo_idx
  on public.recorrencias(empresa_id, ativo);

-- ─── RLS ────────────────────────────────────────────────────
alter table public.recorrencias enable row level security;

-- Usuário pode ver recorrências das empresas às quais tem vínculo
create policy "recorrencias_select" on public.recorrencias
  for select using (
    empresa_id in (
      select empresa_id from public.usuarios_empresa
      where user_id = auth.uid()
    )
  );

-- Usuário pode inserir em empresas vinculadas
create policy "recorrencias_insert" on public.recorrencias
  for insert with check (
    empresa_id in (
      select empresa_id from public.usuarios_empresa
      where user_id = auth.uid()
    )
  );

-- Usuário pode atualizar em empresas vinculadas
create policy "recorrencias_update" on public.recorrencias
  for update using (
    empresa_id in (
      select empresa_id from public.usuarios_empresa
      where user_id = auth.uid()
    )
  );

-- Usuário pode excluir em empresas vinculadas
create policy "recorrencias_delete" on public.recorrencias
  for delete using (
    empresa_id in (
      select empresa_id from public.usuarios_empresa
      where user_id = auth.uid()
    )
  );

-- ─── Trigger: atualiza atualizado_em automaticamente ────────
create or replace function public.set_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger recorrencias_atualizado_em
  before update on public.recorrencias
  for each row execute function public.set_atualizado_em();
