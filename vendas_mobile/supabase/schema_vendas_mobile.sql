-- Rascunho inicial do banco para o Vendas Mobile.
-- Não aplicar em produção sem adaptar ao padrão final do AvantaLab.

create table if not exists public.vendas_mobile_instalacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  perfil_id uuid,
  status text not null default 'ativo',
  configuracoes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.vendas_mobile_pacotes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  marca text,
  descricao text,
  oficial boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.vendas_mobile_pacote_produtos (
  id uuid primary key default gen_random_uuid(),
  pacote_id uuid not null references public.vendas_mobile_pacotes(id) on delete cascade,
  marca text,
  categoria text,
  sku text,
  nome text not null,
  descricao text,
  preco numeric(12,2) not null default 0,
  preco_promocional numeric(12,2),
  imagem_url text,
  ativo boolean not null default true,
  metadados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create table if not exists public.vendas_mobile_produtos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  perfil_id uuid,
  pacote_origem_id uuid references public.vendas_mobile_pacotes(id) on delete set null,
  marca text,
  categoria text,
  sku text,
  nome text not null,
  descricao text,
  preco numeric(12,2) not null default 0,
  preco_promocional numeric(12,2),
  estoque numeric(12,3),
  unidade text default 'un',
  imagem_url text,
  ativo boolean not null default true,
  metadados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.vendas_mobile_clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  perfil_id uuid,
  nome text not null,
  documento text,
  telefone text,
  email text,
  endereco jsonb not null default '{}'::jsonb,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.vendas_mobile_pedidos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  perfil_id uuid,
  cliente_id uuid references public.vendas_mobile_clientes(id) on delete set null,
  status text not null default 'concluida',
  subtotal numeric(12,2) not null default 0,
  desconto numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  forma_pagamento text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.vendas_mobile_pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.vendas_mobile_pedidos(id) on delete cascade,
  produto_id uuid references public.vendas_mobile_produtos(id) on delete set null,
  produto_nome text not null,
  produto_sku text,
  quantidade numeric(12,3) not null default 1,
  preco_unitario numeric(12,2) not null default 0,
  desconto numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  criado_em timestamptz not null default now()
);

create table if not exists public.vendas_mobile_importacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  perfil_id uuid,
  arquivo_nome text not null,
  status text not null default 'pendente',
  total_linhas integer not null default 0,
  linhas_importadas integer not null default 0,
  linhas_com_erro integer not null default 0,
  erros jsonb not null default '[]'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists vendas_mobile_produtos_user_idx on public.vendas_mobile_produtos(user_id);
create index if not exists vendas_mobile_clientes_user_idx on public.vendas_mobile_clientes(user_id);
create index if not exists vendas_mobile_pedidos_user_idx on public.vendas_mobile_pedidos(user_id);
create index if not exists vendas_mobile_pedido_itens_pedido_idx on public.vendas_mobile_pedido_itens(pedido_id);

create table if not exists public.vendas_mobile_pagamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid references public.vendas_mobile_clientes(id) on delete set null,
  pedido_id uuid references public.vendas_mobile_pedidos(id) on delete set null,
  tipo text not null default 'pagamento' check (tipo in ('pagamento','credito','debito','estorno')),
  forma_pagamento text,
  valor numeric(12,2) not null check (valor >= 0),
  desconto numeric(12,2) not null default 0 check (desconto >= 0),
  saldo_anterior numeric(12,2) not null default 0,
  saldo_final numeric(12,2) not null default 0,
  observacoes text,
  data_pagamento date not null default current_date,
  criado_em timestamptz not null default now()
);

create table if not exists public.vendas_mobile_agenda (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid references public.vendas_mobile_clientes(id) on delete set null,
  cliente_nome text,
  tipo text not null default 'visita',
  data date not null,
  horario time,
  observacoes text,
  status text not null default 'pendente' check (status in ('pendente','concluido','cancelado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.vendas_mobile_publicacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('novidade','divulgacao','informacao')),
  titulo text not null,
  conteudo text,
  imagem_url text,
  arquivo_url text,
  ativo boolean not null default true,
  publicado_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

create index if not exists vendas_mobile_pagamentos_user_idx on public.vendas_mobile_pagamentos(user_id);
create index if not exists vendas_mobile_agenda_user_data_idx on public.vendas_mobile_agenda(user_id, data);
create index if not exists vendas_mobile_publicacoes_tipo_idx on public.vendas_mobile_publicacoes(tipo, publicado_em desc);

alter table public.vendas_mobile_instalacoes enable row level security;
alter table public.vendas_mobile_pacotes enable row level security;
alter table public.vendas_mobile_pacote_produtos enable row level security;
alter table public.vendas_mobile_produtos enable row level security;
alter table public.vendas_mobile_clientes enable row level security;
alter table public.vendas_mobile_pedidos enable row level security;
alter table public.vendas_mobile_pedido_itens enable row level security;
alter table public.vendas_mobile_importacoes enable row level security;
alter table public.vendas_mobile_pagamentos enable row level security;
alter table public.vendas_mobile_agenda enable row level security;
alter table public.vendas_mobile_publicacoes enable row level security;

drop policy if exists vendas_mobile_instalacoes_own on public.vendas_mobile_instalacoes;
create policy vendas_mobile_instalacoes_own on public.vendas_mobile_instalacoes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists vendas_mobile_pacotes_read on public.vendas_mobile_pacotes;
create policy vendas_mobile_pacotes_read on public.vendas_mobile_pacotes for select to authenticated using (ativo = true);
drop policy if exists vendas_mobile_pacote_produtos_read on public.vendas_mobile_pacote_produtos;
create policy vendas_mobile_pacote_produtos_read on public.vendas_mobile_pacote_produtos for select to authenticated using (ativo = true);

drop policy if exists vendas_mobile_produtos_own on public.vendas_mobile_produtos;
create policy vendas_mobile_produtos_own on public.vendas_mobile_produtos for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists vendas_mobile_clientes_own on public.vendas_mobile_clientes;
create policy vendas_mobile_clientes_own on public.vendas_mobile_clientes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists vendas_mobile_pedidos_own on public.vendas_mobile_pedidos;
create policy vendas_mobile_pedidos_own on public.vendas_mobile_pedidos for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists vendas_mobile_pedido_itens_own on public.vendas_mobile_pedido_itens;
create policy vendas_mobile_pedido_itens_own on public.vendas_mobile_pedido_itens for all to authenticated
using (exists (select 1 from public.vendas_mobile_pedidos p where p.id = pedido_id and p.user_id = auth.uid()))
with check (exists (select 1 from public.vendas_mobile_pedidos p where p.id = pedido_id and p.user_id = auth.uid()));

drop policy if exists vendas_mobile_importacoes_own on public.vendas_mobile_importacoes;
create policy vendas_mobile_importacoes_own on public.vendas_mobile_importacoes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists vendas_mobile_pagamentos_own on public.vendas_mobile_pagamentos;
create policy vendas_mobile_pagamentos_own on public.vendas_mobile_pagamentos for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists vendas_mobile_agenda_own on public.vendas_mobile_agenda;
create policy vendas_mobile_agenda_own on public.vendas_mobile_agenda for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists vendas_mobile_publicacoes_read on public.vendas_mobile_publicacoes;
create policy vendas_mobile_publicacoes_read on public.vendas_mobile_publicacoes for select to authenticated using (ativo = true and (user_id is null or user_id = auth.uid()));
drop policy if exists vendas_mobile_publicacoes_own_write on public.vendas_mobile_publicacoes;
create policy vendas_mobile_publicacoes_own_write on public.vendas_mobile_publicacoes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
