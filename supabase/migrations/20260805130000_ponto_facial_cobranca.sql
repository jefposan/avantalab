-- Cobrança independente do reconhecimento facial do Controle de Ponto.
-- Uma assinatura consolidada por empresa, com quantidade de funcionários e
-- liberação exclusivamente após confirmação financeira da Asaas.

alter table public.ponto_facial_funcionarios
  drop constraint if exists ponto_facial_funcionarios_status_check;
alter table public.ponto_facial_funcionarios
  add constraint ponto_facial_funcionarios_status_check
  check (status in ('pendente_pagamento', 'pendente_cadastro', 'ativo', 'suspenso', 'removido'));

create table if not exists public.ponto_facial_assinaturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  status text not null default 'pendente_pagamento'
    check (status in ('pendente_pagamento', 'ativa', 'inadimplente', 'cancelamento_programado', 'cancelada', 'suspensa')),
  quantidade_atual integer not null default 0 check (quantidade_atual >= 0),
  quantidade_proxima integer not null default 0 check (quantidade_proxima >= 0),
  valor_unitario_centavos integer not null default 1490 check (valor_unitario_centavos = 1490),
  valor_mensal_centavos integer not null default 0 check (valor_mensal_centavos >= 0),
  gateway text not null default 'asaas' check (gateway = 'asaas'),
  gateway_customer_id text,
  gateway_subscription_id text,
  proximo_vencimento date,
  valido_ate timestamptz,
  cancelamento_solicitado_em timestamptz,
  desativacao_imediata boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id)
);

create unique index if not exists ponto_facial_assinaturas_gateway_sub_uidx
  on public.ponto_facial_assinaturas(gateway_subscription_id)
  where gateway_subscription_id is not null;
create index if not exists ponto_facial_assinaturas_status_idx
  on public.ponto_facial_assinaturas(status, atualizado_em);

create table if not exists public.ponto_facial_alteracoes_cobranca (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  assinatura_id uuid references public.ponto_facial_assinaturas(id) on delete cascade,
  tipo text not null check (tipo in ('contratacao', 'aumento', 'reducao', 'ajuste', 'cancelamento')),
  status text not null default 'pendente_pagamento'
    check (status in ('pendente_pagamento', 'agendada', 'aplicada', 'cancelada')),
  quantidade_anterior integer not null default 0 check (quantidade_anterior >= 0),
  quantidade_nova integer not null default 0 check (quantidade_nova >= 0),
  valor_cobrado_centavos integer not null default 0 check (valor_cobrado_centavos >= 0),
  funcionarios_adicionados uuid[] not null default '{}'::uuid[],
  funcionarios_removidos uuid[] not null default '{}'::uuid[],
  gateway_payment_id text,
  invoice_url text,
  vencimento date,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  aplicado_em timestamptz,
  atualizado_em timestamptz not null default now()
);

create unique index if not exists ponto_facial_alteracoes_gateway_payment_uidx
  on public.ponto_facial_alteracoes_cobranca(gateway_payment_id)
  where gateway_payment_id is not null;
create index if not exists ponto_facial_alteracoes_empresa_idx
  on public.ponto_facial_alteracoes_cobranca(empresa_id, criado_em desc);

create table if not exists public.ponto_facial_faturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  assinatura_id uuid references public.ponto_facial_assinaturas(id) on delete set null,
  alteracao_id uuid references public.ponto_facial_alteracoes_cobranca(id) on delete set null,
  gateway_payment_id text not null unique,
  gateway_subscription_id text,
  status text not null,
  valor_centavos integer not null default 0 check (valor_centavos >= 0),
  vencimento date,
  pagamento_em timestamptz,
  forma_pagamento text,
  invoice_url text,
  payload jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists ponto_facial_faturas_empresa_idx
  on public.ponto_facial_faturas(empresa_id, vencimento desc);
create index if not exists ponto_facial_faturas_assinatura_idx
  on public.ponto_facial_faturas(assinatura_id, status);

alter table public.ponto_facial_assinaturas enable row level security;
alter table public.ponto_facial_alteracoes_cobranca enable row level security;
alter table public.ponto_facial_faturas enable row level security;

drop policy if exists "ponto_facial_assinaturas_select_gestores" on public.ponto_facial_assinaturas;
create policy "ponto_facial_assinaturas_select_gestores" on public.ponto_facial_assinaturas
  for select using (
    exists (
      select 1 from public.usuarios_empresa ue
      where ue.empresa_id = ponto_facial_assinaturas.empresa_id
        and ue.user_id = auth.uid()
        and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador')
    )
  );

drop policy if exists "ponto_facial_alteracoes_select_gestores" on public.ponto_facial_alteracoes_cobranca;
create policy "ponto_facial_alteracoes_select_gestores" on public.ponto_facial_alteracoes_cobranca
  for select using (
    exists (
      select 1 from public.usuarios_empresa ue
      where ue.empresa_id = ponto_facial_alteracoes_cobranca.empresa_id
        and ue.user_id = auth.uid()
        and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador')
    )
  );

drop policy if exists "ponto_facial_faturas_select_gestores" on public.ponto_facial_faturas;
create policy "ponto_facial_faturas_select_gestores" on public.ponto_facial_faturas
  for select using (
    exists (
      select 1 from public.usuarios_empresa ue
      where ue.empresa_id = ponto_facial_faturas.empresa_id
        and ue.user_id = auth.uid()
        and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador')
    )
  );

-- Escrita somente pelas rotas servidoras com service role.

alter table public.ponto_auditoria
  drop constraint if exists ponto_auditoria_evento_check;
alter table public.ponto_auditoria
  add constraint ponto_auditoria_evento_check check (evento in (
    'marcacao_registrada', 'funcionario_inativado', 'funcionario_reativado',
    'funcionario_cadastrado', 'reconhecimento_facial_preparado',
    'reconhecimento_facial_cobranca_criada',
    'reconhecimento_facial_cobranca_confirmada',
    'reconhecimento_facial_configuracao_reduzida',
    'reconhecimento_facial_configuracao_alterada',
    'reconhecimento_facial_cancelamento_programado',
    'reconhecimento_facial_desativado'
  ));
