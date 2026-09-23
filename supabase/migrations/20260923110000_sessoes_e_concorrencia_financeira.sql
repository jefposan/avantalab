-- Sessões por dispositivo e revisão otimista dos registros financeiros.
-- A revisão impede que uma edição iniciada em outro aparelho sobrescreva uma
-- alteração já confirmada no servidor.

create table if not exists public.sessoes_acesso (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dispositivo_id text not null,
  empresa_id uuid references public.empresas(id) on delete set null,
  plano text not null default 'free',
  status text not null default 'ativa' check (status in ('ativa', 'revogada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  revogada_em timestamptz,
  unique (user_id, dispositivo_id)
);

create index if not exists sessoes_acesso_usuario_status_idx
  on public.sessoes_acesso (user_id, status);

alter table public.sessoes_acesso enable row level security;

drop policy if exists "Usuário consulta as próprias sessões" on public.sessoes_acesso;
create policy "Usuário consulta as próprias sessões"
  on public.sessoes_acesso for select
  using (auth.uid() = user_id);

-- O navegador não grava a sessão diretamente: somente a rota autenticada usa
-- a service role. Assim não é possível reativar uma sessão revogada pelo UI.

alter table public.lancamentos add column if not exists revisao integer not null default 1;
alter table public.faturamentos_entradas add column if not exists revisao integer not null default 1;
alter table public.caixinhas_movimentos add column if not exists revisao integer not null default 1;

create or replace function public.avantalab_avancar_revisao_financeira()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.revisao := coalesce(old.revisao, 0) + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists avancar_revisao_lancamentos on public.lancamentos;
create trigger avancar_revisao_lancamentos
  before update on public.lancamentos
  for each row execute function public.avantalab_avancar_revisao_financeira();

drop trigger if exists avancar_revisao_faturamentos_entradas on public.faturamentos_entradas;
create trigger avancar_revisao_faturamentos_entradas
  before update on public.faturamentos_entradas
  for each row execute function public.avantalab_avancar_revisao_financeira();

drop trigger if exists avancar_revisao_caixinhas_movimentos on public.caixinhas_movimentos;
create trigger avancar_revisao_caixinhas_movimentos
  before update on public.caixinhas_movimentos
  for each row execute function public.avantalab_avancar_revisao_financeira();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessoes_acesso'
    ) then
      alter publication supabase_realtime add table public.sessoes_acesso;
    end if;
  end if;
end;
$$;
