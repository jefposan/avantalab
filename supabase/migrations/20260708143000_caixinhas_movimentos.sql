create table if not exists public.caixinhas_movimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  lancamento_id uuid references public.lancamentos(id) on delete set null,
  tipo text not null default 'aporte' check (tipo in ('aporte', 'resgate', 'rendimento', 'ajuste')),
  descricao text not null default '',
  valor numeric(14,2) not null check (valor >= 0),
  data_movimento date not null default current_date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists caixinhas_movimentos_empresa_data_idx
  on public.caixinhas_movimentos (empresa_id, data_movimento desc, criado_em desc);

alter table public.caixinhas_movimentos enable row level security;

drop policy if exists "caixinhas_movimentos_select_empresa" on public.caixinhas_movimentos;
create policy "caixinhas_movimentos_select_empresa"
on public.caixinhas_movimentos
for select
using (
  exists (
    select 1
    from public.usuarios_empresa ue
    where ue.empresa_id = caixinhas_movimentos.empresa_id
      and ue.user_id = auth.uid()
      and coalesce(ue.status, 'ativo') = 'ativo'
  )
);

drop policy if exists "caixinhas_movimentos_insert_empresa" on public.caixinhas_movimentos;
create policy "caixinhas_movimentos_insert_empresa"
on public.caixinhas_movimentos
for insert
with check (
  exists (
    select 1
    from public.usuarios_empresa ue
    where ue.empresa_id = caixinhas_movimentos.empresa_id
      and ue.user_id = auth.uid()
      and coalesce(ue.status, 'ativo') = 'ativo'
  )
);

drop policy if exists "caixinhas_movimentos_update_empresa" on public.caixinhas_movimentos;
create policy "caixinhas_movimentos_update_empresa"
on public.caixinhas_movimentos
for update
using (
  exists (
    select 1
    from public.usuarios_empresa ue
    where ue.empresa_id = caixinhas_movimentos.empresa_id
      and ue.user_id = auth.uid()
      and coalesce(ue.status, 'ativo') = 'ativo'
  )
)
with check (
  exists (
    select 1
    from public.usuarios_empresa ue
    where ue.empresa_id = caixinhas_movimentos.empresa_id
      and ue.user_id = auth.uid()
      and coalesce(ue.status, 'ativo') = 'ativo'
  )
);

drop policy if exists "caixinhas_movimentos_delete_empresa" on public.caixinhas_movimentos;
create policy "caixinhas_movimentos_delete_empresa"
on public.caixinhas_movimentos
for delete
using (
  exists (
    select 1
    from public.usuarios_empresa ue
    where ue.empresa_id = caixinhas_movimentos.empresa_id
      and ue.user_id = auth.uid()
      and coalesce(ue.status, 'ativo') = 'ativo'
  )
);
