create extension if not exists pgcrypto;

create table if not exists public.admin_configuracoes (
  id text primary key,
  password_hash text not null,
  password_salt text not null,
  password_iterations integer not null default 210000,
  updated_at timestamptz not null default now()
);

alter table public.admin_configuracoes enable row level security;

create table if not exists public.admin_disparos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  mensagem text not null,
  usuarios integer not null default 0,
  pushes_enviados integer not null default 0,
  total_inscricoes integer not null default 0,
  status text not null default 'enviado' check (status in ('enviado', 'erro')),
  erro text,
  created_at timestamptz not null default now()
);

alter table public.admin_disparos enable row level security;
create index if not exists admin_disparos_created_at_idx on public.admin_disparos (created_at desc);
