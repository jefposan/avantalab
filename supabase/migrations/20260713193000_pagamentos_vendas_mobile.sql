-- Recebimentos vinculados aos clientes do Vendas Mobile.
create table if not exists public.vendas_mobile_pagamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid references public.vendas_mobile_clientes(id) on delete set null,
  pedido_id uuid references public.vendas_mobile_pedidos(id) on delete set null,
  tipo text not null default 'pagamento',
  forma_pagamento text,
  valor numeric(12,2) not null default 0 check (valor >= 0),
  desconto numeric(12,2) not null default 0 check (desconto >= 0),
  saldo_anterior numeric(12,2) not null default 0,
  saldo_final numeric(12,2) not null default 0,
  observacoes text,
  data_pagamento date not null default current_date,
  criado_em timestamptz not null default now()
);

alter table public.vendas_mobile_pagamentos
  add column if not exists desconto numeric(12,2) not null default 0,
  add column if not exists saldo_anterior numeric(12,2) not null default 0,
  add column if not exists saldo_final numeric(12,2) not null default 0;

create index if not exists vendas_mobile_pagamentos_user_idx
  on public.vendas_mobile_pagamentos(user_id);

create index if not exists vendas_mobile_pagamentos_cliente_data_idx
  on public.vendas_mobile_pagamentos(cliente_id, data_pagamento desc);

alter table public.vendas_mobile_pagamentos enable row level security;

drop policy if exists vendas_mobile_pagamentos_own on public.vendas_mobile_pagamentos;
create policy vendas_mobile_pagamentos_own
  on public.vendas_mobile_pagamentos for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
