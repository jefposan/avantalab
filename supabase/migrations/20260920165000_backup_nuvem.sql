-- Integrações OAuth de backup. Tokens nunca ficam legíveis no banco: o app
-- grava apenas cifras AES-256-GCM produzidas com chave exclusiva do ambiente.
create table if not exists public.backup_nuvem_conexoes (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  provedor text not null check (provedor in ('google_drive', 'onedrive')),
  email text,
  pasta_id text not null,
  access_token_cifrado text not null,
  refresh_token_cifrado text not null,
  expira_em timestamptz,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  ultimo_envio_em timestamptz,
  ultimo_erro text
);

create table if not exists public.backup_nuvem_oauth_pendencias (
  id uuid primary key default gen_random_uuid(),
  estado text not null unique,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provedor text not null check (provedor in ('google_drive', 'onedrive')),
  origem text not null check (origem in ('web', 'mobile')) default 'web',
  expira_em timestamptz not null,
  consumido_em timestamptz,
  criado_em timestamptz not null default now()
);

alter table public.backup_nuvem_conexoes enable row level security;
alter table public.backup_nuvem_oauth_pendencias enable row level security;

-- As duas tabelas são acessadas apenas pelas rotas de servidor com service role.
-- Nenhuma policy de cliente é criada propositalmente.
grant select, insert, update, delete on public.backup_nuvem_conexoes to service_role;
grant select, insert, update, delete on public.backup_nuvem_oauth_pendencias to service_role;
