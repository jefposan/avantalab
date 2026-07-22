create table if not exists public.importador_despesas_rascunhos (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  dados jsonb not null,
  atualizado_em timestamptz not null default now(),
  primary key (empresa_id, usuario_id),
  constraint importador_despesas_rascunhos_tamanho check (octet_length(dados::text) <= 1000000)
);
alter table public.importador_despesas_rascunhos enable row level security;
create policy "importador_rascunho_proprio" on public.importador_despesas_rascunhos for all to authenticated
using (usuario_id = auth.uid() and exists (select 1 from public.usuarios_empresa a where a.empresa_id = importador_despesas_rascunhos.empresa_id and a.user_id = auth.uid() and a.status = 'ativo'))
with check (usuario_id = auth.uid() and exists (select 1 from public.usuarios_empresa a where a.empresa_id = importador_despesas_rascunhos.empresa_id and a.user_id = auth.uid() and a.status = 'ativo'));
