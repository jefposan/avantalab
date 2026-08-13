-- Compartilhamento pontual do AvantaProjetos.
-- Os dados do mapa continuam em projetos_documentos; estes vínculos definem
-- quais projetos cada pessoa pode abrir, sem criar acesso à Gestão.
begin;

create table if not exists public.projetos_compartilhamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  projeto_id text not null check (char_length(projeto_id) between 1 and 180),
  user_id uuid references auth.users(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 2 and 120),
  email text not null check (char_length(trim(email)) between 3 and 320),
  acesso text not null default 'editor' check (acesso in ('observador', 'editor')),
  situacao text not null default 'ativo' check (situacao in ('ativo', 'pendente', 'revogado')),
  token_hash text unique,
  expira_em timestamptz,
  criado_por uuid not null references auth.users(id) on delete restrict,
  criado_em timestamptz not null default now(),
  revogado_em timestamptz,
  unique (empresa_id, projeto_id, user_id),
  unique (empresa_id, projeto_id, email)
);

create index if not exists projetos_compartilhamentos_usuario_idx
  on public.projetos_compartilhamentos(user_id, empresa_id, projeto_id)
  where situacao = 'ativo';
create index if not exists projetos_compartilhamentos_convite_idx
  on public.projetos_compartilhamentos(token_hash)
  where situacao = 'pendente';

alter table public.projetos_compartilhamentos enable row level security;
-- Não há política de cliente: convites e leituras passam exclusivamente por
-- rotas do servidor, que confirmam o vínculo de quem está solicitando.
grant select, insert, update, delete on public.projetos_compartilhamentos to service_role;

commit;
