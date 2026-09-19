-- Nova matriz comercial empresarial.
--
-- IDs persistidos:
--   business          = Business Básico
--   business_pro      = Business Pro
--   business_premium  = Business Premium
--
-- Esta migração não altera o valor nem o ciclo da cobrança já existente na
-- Asaas. Ela promove o único assinante empresarial pago atual para Premium
-- como benefício de migração, preservando o vínculo do gateway e o histórico.

-- A função de criação precisa ser a fonte de verdade da franquia, porque uma
-- validação apenas no cliente seria contornável por outra tela ou dispositivo.
create or replace function public.criar_perfil_financeiro_seguro(
  p_user_id uuid,
  p_nome text,
  p_tipo_perfil text,
  p_origem_empresa_id uuid,
  p_nome_usuario text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa public.empresas%rowtype;
  v_origem public.empresas%rowtype;
  v_assinatura public.assinaturas%rowtype;
  v_plano text := 'free';
  v_limite integer := 1;
  v_usados integer := 0;
  v_compartilha boolean := false;
begin
  if p_user_id is null or nullif(trim(p_nome), '') is null
    or p_tipo_perfil not in ('empresa', 'pessoal') then
    return jsonb_build_object('ok', false, 'codigo', 'dados_invalidos');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  if p_origem_empresa_id is not null then
    if not exists (
      select 1
      from public.usuarios_empresa ue
      where ue.user_id = p_user_id
        and ue.empresa_id = p_origem_empresa_id
        and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador')
    ) then
      return jsonb_build_object('ok', false, 'codigo', 'origem_sem_permissao');
    end if;

    select * into v_origem
    from public.empresas
    where id = p_origem_empresa_id;

    if found and v_origem.assinatura_origem_empresa_id is null then
      select * into v_assinatura
      from public.assinaturas
      where empresa_id = p_origem_empresa_id
      for update;

      if found and (
        v_assinatura.status in ('ativa', 'cortesia')
        or (v_assinatura.status in ('cancelada', 'inadimplente') and v_assinatura.valido_ate > now())
      ) and (
        v_assinatura.status <> 'cortesia'
        or v_assinatura.valido_ate is null
        or v_assinatura.valido_ate > now()
      ) then
        v_plano := case
          when v_origem.tipo_perfil = 'empresa'
            and v_assinatura.plano in ('business', 'business_pro', 'business_premium')
            then v_assinatura.plano
          when v_assinatura.plano = 'pessoal_premium' then 'pessoal_premium'
          else 'free'
        end;
        v_limite := case
          when v_plano = 'business_premium' then 10
          when v_plano = 'business_pro' then 3
          when v_plano = 'business' then 1
          when v_plano = 'pessoal_premium' then 3
          else 1
        end;
        select count(*)::integer into v_usados
        from public.empresas e
        where e.id = p_origem_empresa_id
          or e.assinatura_origem_empresa_id = p_origem_empresa_id;

        -- Planos Business compartilham somente empresas. Perfis pessoais
        -- seguem sua franquia Pessoal, sem consumir vagas empresariais.
        v_compartilha := v_plano in ('business', 'business_pro', 'business_premium')
          and p_tipo_perfil = 'empresa'
          and v_usados < v_limite;
      end if;
    end if;
  end if;

  if p_tipo_perfil = 'pessoal' and not v_compartilha then
    select count(distinct e.id)::integer into v_usados
    from public.empresas e
    join public.usuarios_empresa ue on ue.empresa_id = e.id
    where ue.user_id = p_user_id
      and ue.status = 'ativo'
      and ue.perfil = 'gestor_master'
      and e.tipo_perfil = 'pessoal';
    if exists (
      select 1 from public.assinaturas_loja al
      where al.user_id = p_user_id
        and al.loja = 'apple_app_store'
        and al.entitlement_id = 'pessoal_premium'
        and al.status in ('ativa', 'cancelada', 'inadimplente')
        and al.valido_ate > now()
    ) then
      v_plano := 'pessoal_premium';
      v_limite := 3;
    end if;
    if v_usados >= v_limite then
      return jsonb_build_object('ok', false, 'codigo', 'limite_pessoal');
    end if;
  end if;

  insert into public.empresas (nome, tipo_perfil, assinatura_origem_empresa_id)
  values (trim(p_nome), p_tipo_perfil, case when v_compartilha then p_origem_empresa_id else null end)
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

  return jsonb_build_object(
    'ok', true,
    'empresa', to_jsonb(v_empresa),
    'compartilhado', v_compartilha,
    'plano', v_plano,
    'limite', v_limite,
    'usados', v_usados + 1
  );
end;
$$;

-- Reconcilia somente perfis empresariais elegíveis à assinatura de origem.
create or replace function public.reconciliar_perfis_quota(
  p_origem_empresa_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limite integer;
  v_usados integer;
  v_disponiveis integer;
  v_reconciliados integer := 0;
  v_alvo record;
begin
  if p_origem_empresa_id is null then
    return 0;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_origem_empresa_id::text, 0));

  select case
      when a.plano = 'business_premium' then 10
      when a.plano = 'business_pro' then 3
      else 1
    end
    into v_limite
  from public.empresas e
  join public.assinaturas a on a.empresa_id = e.id
  where e.id = p_origem_empresa_id
    and e.tipo_perfil = 'empresa'
    and e.assinatura_origem_empresa_id is null
    and a.plano in ('business', 'business_pro', 'business_premium', 'empresa')
    and a.status = 'ativa'
    and a.gateway_subscription_id is not null;

  if not found then
    return 0;
  end if;

  select count(*)::integer into v_usados
  from public.empresas e
  where e.id = p_origem_empresa_id
    or e.assinatura_origem_empresa_id = p_origem_empresa_id;

  v_disponiveis := greatest(v_limite - coalesce(v_usados, 1), 0);
  if v_disponiveis = 0 then
    return 0;
  end if;

  for v_alvo in
    select distinct alvo.id, alvo.created_at
    from public.usuarios_empresa titular_origem
    join public.usuarios_empresa titular_alvo
      on titular_alvo.user_id = titular_origem.user_id
      and titular_alvo.status = 'ativo'
      and titular_alvo.perfil = 'gestor_master'
    join public.empresas alvo on alvo.id = titular_alvo.empresa_id
    left join public.assinaturas assinatura_alvo on assinatura_alvo.empresa_id = alvo.id
    where titular_origem.empresa_id = p_origem_empresa_id
      and titular_origem.status = 'ativo'
      and titular_origem.perfil = 'gestor_master'
      and alvo.tipo_perfil = 'empresa'
      and alvo.id <> p_origem_empresa_id
      and alvo.assinatura_origem_empresa_id is null
      and not exists (
        select 1 from public.empresas dependente
        where dependente.assinatura_origem_empresa_id = alvo.id
      )
      and (
        assinatura_alvo.id is null
        or (
          assinatura_alvo.gateway_subscription_id is null
          and assinatura_alvo.status in ('trial', 'cortesia', 'expirada')
        )
      )
    order by alvo.created_at asc nulls last, alvo.id
    limit v_disponiveis
  loop
    update public.empresas
    set assinatura_origem_empresa_id = p_origem_empresa_id
    where id = v_alvo.id
      and assinatura_origem_empresa_id is null;

    if found then
      v_reconciliados := v_reconciliados + 1;
    end if;
  end loop;

  return v_reconciliados;
end;
$$;

-- Uma assinatura Premium própria mantém os módulos incluídos quando substitui
-- uma vaga compartilhada, tal como já acontece no Business Pro.
create or replace function public.ativar_assinatura_propria_perfil(
  p_empresa_id uuid,
  p_gateway_subscription_id text,
  p_ciclo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa public.empresas%rowtype;
  v_assinatura public.assinaturas%rowtype;
  v_origem_empresa_id uuid;
begin
  if p_empresa_id is null or nullif(trim(p_gateway_subscription_id), '') is null then
    return jsonb_build_object('ok', false, 'codigo', 'dados_invalidos');
  end if;
  if p_ciclo is not null and p_ciclo not in ('mensal', 'anual') then
    return jsonb_build_object('ok', false, 'codigo', 'ciclo_invalido');
  end if;

  select * into v_empresa from public.empresas where id = p_empresa_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'perfil_invalido');
  end if;

  select * into v_assinatura
  from public.assinaturas
  where empresa_id = p_empresa_id
    and gateway_subscription_id = trim(p_gateway_subscription_id)
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'assinatura_invalida');
  end if;

  v_origem_empresa_id := v_empresa.assinatura_origem_empresa_id;

  update public.assinaturas
  set status = 'ativa', valido_ate = null, ciclo = coalesce(p_ciclo, ciclo), atualizado_em = now()
  where id = v_assinatura.id;

  if v_origem_empresa_id is not null then
    update public.empresas
    set assinatura_origem_anterior_empresa_id = v_origem_empresa_id,
        assinatura_origem_empresa_id = null,
        assinatura_desvinculada_em = now()
    where id = p_empresa_id;

    if coalesce(v_assinatura.plano, '') not in ('business_pro', 'business_premium') then
      update public.empresa_modulos
      set ativo = false, expira_em = null, atualizado_em = now()
      where empresa_id = p_empresa_id
        and origem = 'plano_business_pro';
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'desvinculado', v_origem_empresa_id is not null,
    'origemEmpresaId', v_origem_empresa_id
  );
end;
$$;

-- Migração assistida do único assinante empresarial pago atual. Caso a base
-- tenha mais de uma assinatura paga quando esta migração for aplicada, ela
-- falha sem tocar nos registros: a escolha precisa então ser explícita.
do $$
declare
  v_quantidade integer;
begin
  select count(*)::integer into v_quantidade
  from public.assinaturas a
  join public.empresas e on e.id = a.empresa_id
  where e.tipo_perfil = 'empresa'
    and e.assinatura_origem_empresa_id is null
    and a.status = 'ativa'
    and a.gateway_subscription_id is not null;

  if v_quantidade > 1 then
    raise exception 'Migração Business Premium interrompida: foram encontradas % assinaturas empresariais pagas.', v_quantidade;
  end if;

  if v_quantidade = 1 then
    update public.assinaturas a
    set plano = 'business_premium', atualizado_em = now()
    from public.empresas e
    where e.id = a.empresa_id
      and e.tipo_perfil = 'empresa'
      and e.assinatura_origem_empresa_id is null
      and a.status = 'ativa'
      and a.gateway_subscription_id is not null;
  end if;
end;
$$;

comment on function public.criar_perfil_financeiro_seguro(uuid, text, text, uuid, text, text) is
  'Cria perfis com quota empresarial 1/3/10 para Business Básico/Pro/Premium.';

comment on function public.reconciliar_perfis_quota(uuid) is
  'Vincula empresas elegíveis à quota Business paga de 1, 3 ou 10 perfis.';
