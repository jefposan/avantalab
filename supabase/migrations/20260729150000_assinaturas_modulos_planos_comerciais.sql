-- Base comercial dos módulos avulsos.
-- Cada módulo do Business é uma assinatura mensal independente de R$ 14,90.
-- O Business Pro não cria registros aqui: o acesso integral será resolvido pela
-- assinatura principal do plano, inclusive para módulos adicionados no futuro.

create table if not exists public.assinaturas_modulos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  modulo_id text not null references public.modulos(id) on delete restrict,
  status text not null default 'expirada'
    check (status in ('ativa', 'expirada', 'cancelada', 'inadimplente')),
  ciclo text not null default 'mensal' check (ciclo = 'mensal'),
  valor numeric(12,2) not null default 14.90 check (valor = 14.90),
  gateway text,
  gateway_customer_id text,
  gateway_subscription_id text,
  valido_ate timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, modulo_id)
);

create index if not exists assinaturas_modulos_empresa_idx
  on public.assinaturas_modulos(empresa_id, status);
create unique index if not exists assinaturas_modulos_gateway_sub_uidx
  on public.assinaturas_modulos(gateway_subscription_id)
  where gateway_subscription_id is not null;

alter table public.assinaturas_modulos enable row level security;

drop policy if exists "assinaturas_modulos_select" on public.assinaturas_modulos;
create policy "assinaturas_modulos_select" on public.assinaturas_modulos
  for select using (
    empresa_id in (
      select empresa_id
      from public.usuarios_empresa
      where user_id = auth.uid() and status = 'ativo'
    )
  );

-- Nenhuma política de escrita: contratação, webhook e conciliação usam a
-- service role nas rotas do servidor, evitando alteração direta pelo cliente.
