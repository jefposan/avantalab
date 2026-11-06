begin;
create table public.marketplace_post_sale_commands (
 id uuid primary key,
 empresa_id uuid not null references public.empresas(id) on delete cascade,
 connection_id uuid not null references public.marketplace_connections(id) on delete cascade,
 sale_id uuid not null references public.marketplace_sales(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 channel text not null check(channel='order' or channel ~ '^claim:[0-9]{1,24}$'),
 action text not null check(action in ('message','allow_return','refund','partial_refund','open_dispute','return_review_ok','return_review_fail','shipping_evidence','shipping_promise')),
 destination text not null check(destination in ('buyer','mediator','case')),
 request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
 basis_hash text not null check(basis_hash ~ '^[a-f0-9]{64}$'),
 payload_hash text not null check(payload_hash ~ '^[a-f0-9]{64}$'),
 state text not null default 'sending' check(state in ('sending','completed','pending_review','uncertain','rejected')),
 confirmation_source text check(confirmation_source in ('receipt','observation')),
 receipt_id text,
 error_code text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index marketplace_post_sale_channel_busy on public.marketplace_post_sale_commands(sale_id,channel,(action='message')) where state in ('sending','uncertain','pending_review');
create unique index marketplace_post_sale_command_once on public.marketplace_post_sale_commands(sale_id,channel,action,destination,basis_hash,payload_hash) where state<>'rejected';
create unique index marketplace_post_sale_solution_once on public.marketplace_post_sale_commands(sale_id,channel,action,payload_hash) where state<>'rejected' and action<>'message';
create index marketplace_post_sale_command_scope on public.marketplace_post_sale_commands(empresa_id,connection_id,sale_id,created_at desc);
alter table public.marketplace_post_sale_commands enable row level security;
revoke all on public.marketplace_post_sale_commands from public,anon,authenticated;
grant select,insert,update on public.marketplace_post_sale_commands to service_role;
comment on table public.marketplace_post_sale_commands is 'Atendimento: tentativas e recibos sem tokens nem texto integral da conversa. Escritas só pelo servidor após revalidar empresa, vendedor, pedido, papel e ações disponíveis.';
create table public.marketplace_post_sale_attachments (
 id uuid primary key,
 empresa_id uuid not null references public.empresas(id) on delete cascade,
 connection_id uuid not null references public.marketplace_connections(id) on delete cascade,
 sale_id uuid not null references public.marketplace_sales(id) on delete cascade,
 channel text not null check(channel='order' or channel ~ '^claim:[0-9]{1,24}$'),
 purpose text not null default 'message' check(purpose in ('message','return_review','shipping_evidence')),
 return_id text,
 provider_id text not null check(provider_id ~ '^[A-Za-z0-9_.-]{1,125}$'),
 name text not null,
 created_at timestamptz not null default now()
);
alter table public.marketplace_post_sale_attachments enable row level security;
revoke all on public.marketplace_post_sale_attachments from public,anon,authenticated;
grant select,insert on public.marketplace_post_sale_attachments to service_role;
create index marketplace_post_sale_attachment_scope on public.marketplace_post_sale_attachments(empresa_id,connection_id,sale_id,channel);
notify pgrst,'reload schema';
commit;
