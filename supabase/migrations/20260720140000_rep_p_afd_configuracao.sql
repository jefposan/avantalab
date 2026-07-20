create table public.rep_p_configuracoes (
  id text primary key default 'principal' check (id = 'principal'),
  registro_inpi text not null default '',
  documento_desenvolvedor text not null default '' check (documento_desenvolvedor = '' or documento_desenvolvedor ~ '^[0-9]{11}([0-9]{3})?$'),
  atualizado_em timestamptz not null default now()
);
alter table public.rep_p_configuracoes enable row level security;
insert into public.rep_p_configuracoes (id) values ('principal') on conflict (id) do nothing;
