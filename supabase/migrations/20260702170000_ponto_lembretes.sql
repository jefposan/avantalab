create extension if not exists pgcrypto;

create table if not exists public.ponto_lembretes_enviados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  empresa_id uuid not null,
  dia date not null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  momento text not null check (momento in ('antes', 'horario')),
  created_at timestamptz not null default now(),
  unique (user_id, dia, tipo, momento)
);

alter table public.ponto_lembretes_enviados enable row level security;
create index if not exists ponto_lembretes_dia_idx on public.ponto_lembretes_enviados (dia desc);
