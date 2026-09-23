-- Perfis empresariais adicionais do Business Pro e Business Premium.
-- As vagas incluídas compartilham o plano principal. Depois do limite do
-- respectivo plano, cada empresa tem uma recorrência mensal própria.
-- cada empresa tem uma recorrência própria de R$ 14,99/mês, mas continua
-- vinculada à origem para herdar os recursos do plano somente após o
-- webhook financeiro confirmar o pagamento.

create table if not exists public.assinaturas_perfis_adicionais (
  id uuid primary key default gen_random_uuid(),
  empresa_origem_id uuid not null references public.empresas(id) on delete restrict,
  empresa_id uuid not null unique references public.empresas(id) on delete cascade,
  solicitante_user_id uuid not null references auth.users(id) on delete restrict,
  nome_perfil text not null,
  status text not null default 'pendente_pagamento'
    check (status in ('pendente_pagamento', 'ativa', 'inadimplente', 'cancelada', 'suspensa', 'falha')),
  valor_mensal numeric(10,2) not null default 14.99 check (valor_mensal = 14.99),
  gateway text not null default 'asaas' check (gateway = 'asaas'),
  gateway_customer_id text,
  gateway_subscription_id text,
  cobranca_nome text,
  cobranca_documento text,
  cobranca_email text,
  cobranca_telefone text,
  valido_ate timestamptz,
  cancelamento_solicitado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists assinaturas_perfis_adicionais_gateway_subscription_uidx
  on public.assinaturas_perfis_adicionais(gateway_subscription_id)
  where gateway_subscription_id is not null;
create index if not exists assinaturas_perfis_adicionais_origem_status_idx
  on public.assinaturas_perfis_adicionais(empresa_origem_id, status, atualizado_em desc);

alter table public.assinaturas_perfis_adicionais enable row level security;

drop policy if exists "assinaturas_perfis_adicionais_select_gestores" on public.assinaturas_perfis_adicionais;
create policy "assinaturas_perfis_adicionais_select_gestores" on public.assinaturas_perfis_adicionais
  for select using (
    exists (
      select 1 from public.usuarios_empresa ue
      where ue.empresa_id = assinaturas_perfis_adicionais.empresa_origem_id
        and ue.user_id = auth.uid()
        and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador')
    )
  );

create or replace function public.criar_perfil_adicional_business_pendente(
  p_assinatura_adicional_id uuid,
  p_user_id uuid,
  p_origem_empresa_id uuid,
  p_nome text,
  p_nome_usuario text,
  p_email text,
  p_gateway_customer_id text,
  p_gateway_subscription_id text,
  p_cobranca_nome text,
  p_cobranca_documento text,
  p_cobranca_email text,
  p_cobranca_telefone text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_origem public.empresas%rowtype;
  v_empresa public.empresas%rowtype;
  v_assinatura public.assinaturas%rowtype;
  v_usados integer := 0;
  v_limite_incluido integer := 0;
begin
  if p_assinatura_adicional_id is null or p_user_id is null or p_origem_empresa_id is null
    or nullif(trim(p_nome), '') is null
    or nullif(trim(p_gateway_subscription_id), '') is null then
    return jsonb_build_object('ok', false, 'codigo', 'dados_invalidos');
  end if;

  -- A trava fica na empresa origem: duas janelas não podem consumir uma
  -- vaga gratuita simultaneamente nem pular a validação do plano.
  perform pg_advisory_xact_lock(hashtextextended(p_origem_empresa_id::text, 0));

  if not exists (
    select 1 from public.usuarios_empresa ue
    where ue.user_id = p_user_id
      and ue.empresa_id = p_origem_empresa_id
      and ue.status = 'ativo'
      and ue.perfil in ('gestor_master', 'administrador')
  ) then
    return jsonb_build_object('ok', false, 'codigo', 'origem_sem_permissao');
  end if;

  select * into v_origem
  from public.empresas where id = p_origem_empresa_id for update;
  if not found or v_origem.tipo_perfil <> 'empresa' or v_origem.assinatura_origem_empresa_id is not null then
    return jsonb_build_object('ok', false, 'codigo', 'origem_invalida');
  end if;

  select * into v_assinatura
  from public.assinaturas
  where empresa_id = p_origem_empresa_id
  for update;
  if not found or v_assinatura.plano not in ('business_pro', 'business_premium')
    or not (
      v_assinatura.status in ('ativa', 'cortesia')
      or (v_assinatura.status in ('cancelada', 'inadimplente') and v_assinatura.valido_ate > now())
    )
    or (v_assinatura.status = 'cortesia' and v_assinatura.valido_ate is not null and v_assinatura.valido_ate <= now()) then
    return jsonb_build_object('ok', false, 'codigo', 'business_nao_vigente');
  end if;

  v_limite_incluido := case when v_assinatura.plano = 'business_premium' then 10 else 3 end;

  select count(*)::integer into v_usados
  from public.empresas e
  where e.id = p_origem_empresa_id or e.assinatura_origem_empresa_id = p_origem_empresa_id;
  if v_usados < v_limite_incluido then
    return jsonb_build_object('ok', false, 'codigo', 'vaga_incluida_disponivel');
  end if;

  insert into public.empresas (nome, tipo_perfil, assinatura_origem_empresa_id)
  values (trim(p_nome), 'empresa', p_origem_empresa_id)
  returning * into v_empresa;

  insert into public.usuarios_empresa (empresa_id, user_id, nome, email, perfil, status)
  values (
    v_empresa.id,
    p_user_id,
    coalesce(nullif(trim(p_nome_usuario), ''), 'Usuário'),
    lower(nullif(trim(p_email), '')),
    'gestor_master',
    'ativo'
  );

  insert into public.configuracoes (empresa_id, duplicados_ativo)
  values (v_empresa.id, true)
  on conflict (empresa_id) do update set duplicados_ativo = excluded.duplicados_ativo;

  insert into public.assinaturas_perfis_adicionais (
    id, empresa_origem_id, empresa_id, solicitante_user_id, nome_perfil, status,
    gateway_customer_id, gateway_subscription_id, cobranca_nome,
    cobranca_documento, cobranca_email, cobranca_telefone
  ) values (
    p_assinatura_adicional_id, p_origem_empresa_id, v_empresa.id, p_user_id, trim(p_nome), 'pendente_pagamento',
    nullif(trim(p_gateway_customer_id), ''), trim(p_gateway_subscription_id), nullif(trim(p_cobranca_nome), ''),
    nullif(trim(p_cobranca_documento), ''), lower(nullif(trim(p_cobranca_email), '')), nullif(trim(p_cobranca_telefone), '')
  );

  return jsonb_build_object('ok', true, 'empresa', to_jsonb(v_empresa));
end;
$$;

revoke all on function public.criar_perfil_adicional_business_pendente(uuid, uuid, uuid, text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.criar_perfil_adicional_business_pendente(uuid, uuid, uuid, text, text, text, text, text, text, text, text, text) from anon;
revoke all on function public.criar_perfil_adicional_business_pendente(uuid, uuid, uuid, text, text, text, text, text, text, text, text, text) from authenticated;
grant execute on function public.criar_perfil_adicional_business_pendente(uuid, uuid, uuid, text, text, text, text, text, text, text, text, text) to service_role;

comment on table public.assinaturas_perfis_adicionais is
  'Cobranças mensais de R$ 14,99 por perfil empresarial além das vagas incluídas no Business Pro ou Premium.';
