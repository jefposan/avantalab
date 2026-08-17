-- Proteções transacionais para o resgate de cupons e para as fronteiras entre
-- perfil assinante e perfil que apenas consome uma vaga compartilhada.

create unique index if not exists cupons_resgates_cupom_empresa_unique_idx
  on public.cupons_resgates (cupom_id, empresa_id);

create or replace function public.resgatar_cupom_perfil(
  p_empresa_id uuid,
  p_user_id uuid,
  p_codigo text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cupom public.cupons%rowtype;
  v_empresa public.empresas%rowtype;
  v_assinatura public.assinaturas%rowtype;
  v_valido_ate timestamptz;
  v_plano text;
begin
  if not exists (
    select 1
    from public.usuarios_empresa ue
    where ue.empresa_id = p_empresa_id
      and ue.user_id = p_user_id
      and ue.status = 'ativo'
      and ue.perfil in ('gestor_master', 'administrador')
  ) then
    return jsonb_build_object('ok', false, 'codigo', 'sem_permissao');
  end if;

  select * into v_empresa
  from public.empresas
  where id = p_empresa_id;
  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'perfil_invalido');
  end if;
  if v_empresa.assinatura_origem_empresa_id is not null then
    return jsonb_build_object('ok', false, 'codigo', 'perfil_compartilhado');
  end if;

  select * into v_cupom
  from public.cupons
  where upper(codigo) = upper(trim(p_codigo))
    and ativo = true
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'cupom_invalido');
  end if;

  select * into v_assinatura
  from public.assinaturas
  where empresa_id = p_empresa_id
  for update;

  if exists (
    select 1 from public.cupons_resgates
    where cupom_id = v_cupom.id and empresa_id = p_empresa_id
  ) then
    if v_assinatura.cupom_id = v_cupom.id
      and v_assinatura.status = 'cortesia'
      and (v_assinatura.valido_ate is null or v_assinatura.valido_ate > now()) then
      return jsonb_build_object(
        'ok', true,
        'reutilizado', true,
        'validoAte', v_assinatura.valido_ate
      );
    end if;
    return jsonb_build_object('ok', false, 'codigo', 'cupom_ja_utilizado');
  end if;

  if v_cupom.validade is not null and v_cupom.validade <= now() then
    return jsonb_build_object('ok', false, 'codigo', 'cupom_expirado');
  end if;
  if v_cupom.max_usos is not null and v_cupom.usos >= v_cupom.max_usos then
    return jsonb_build_object('ok', false, 'codigo', 'limite_atingido');
  end if;

  if v_assinatura.id is not null and v_assinatura.gateway_subscription_id is not null then
    return jsonb_build_object('ok', false, 'codigo', 'assinatura_recorrente');
  end if;
  if v_empresa.tipo_perfil = 'pessoal' and exists (
    select 1 from public.assinaturas_loja al
    where al.user_id = p_user_id
      and al.loja = 'apple_app_store'
      and al.entitlement_id = 'pessoal_premium'
      and al.status in ('ativa', 'cancelada', 'inadimplente')
      and al.valido_ate > now()
  ) then
    return jsonb_build_object('ok', false, 'codigo', 'assinatura_loja');
  end if;
  if exists (
    select 1 from public.assinaturas_modulos am
    where am.empresa_id = p_empresa_id
      and am.gateway_subscription_id is not null
      and am.status <> 'cancelada'
  ) then
    return jsonb_build_object('ok', false, 'codigo', 'assinatura_modulo');
  end if;

  v_valido_ate := null;
  if v_cupom.tipo = 'periodo' then
    if coalesce(v_cupom.duracao_valor, 0) <= 0 then
      return jsonb_build_object('ok', false, 'codigo', 'cupom_invalido');
    end if;
    v_valido_ate := case v_cupom.duracao_unidade
      when 'dias' then now() + make_interval(days => v_cupom.duracao_valor)
      when 'semanas' then now() + make_interval(days => v_cupom.duracao_valor * 7)
      else now() + make_interval(months => v_cupom.duracao_valor)
    end;
  end if;

  v_plano := case
    when v_empresa.tipo_perfil = 'empresa' then 'business_pro'
    else 'pessoal_premium'
  end;

  insert into public.assinaturas (
    empresa_id, tipo_perfil, status, plano, ciclo, trial_fim, valido_ate,
    gateway, gateway_subscription_id, cupom_id, atualizado_em
  ) values (
    p_empresa_id, v_empresa.tipo_perfil, 'cortesia', v_plano, null, null,
    v_valido_ate, null, null, v_cupom.id, now()
  )
  on conflict (empresa_id) do update set
    tipo_perfil = excluded.tipo_perfil,
    status = excluded.status,
    plano = excluded.plano,
    ciclo = null,
    trial_fim = null,
    valido_ate = excluded.valido_ate,
    gateway = null,
    gateway_subscription_id = null,
    cupom_id = excluded.cupom_id,
    atualizado_em = now();

  insert into public.cupons_resgates (cupom_id, empresa_id)
  values (v_cupom.id, p_empresa_id);

  update public.cupons
  set usos = usos + 1, atualizado_em = now()
  where id = v_cupom.id;

  return jsonb_build_object('ok', true, 'reutilizado', false, 'validoAte', v_valido_ate);
end;
$$;

revoke all on function public.resgatar_cupom_perfil(uuid, uuid, text) from public;
revoke all on function public.resgatar_cupom_perfil(uuid, uuid, text) from anon;
revoke all on function public.resgatar_cupom_perfil(uuid, uuid, text) from authenticated;
grant execute on function public.resgatar_cupom_perfil(uuid, uuid, text) to service_role;

-- Cria perfil, vínculo e configuração na mesma transação. A quota é conferida
-- sob lock da conta; um perfil compartilhado nunca se torna nova origem.
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

  -- Serializa todas as criações da mesma conta, inclusive por dispositivos
  -- diferentes, antes de contar perfis e consumir a última vaga.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  if p_origem_empresa_id is not null then
    if not exists (
      select 1 from public.usuarios_empresa ue
      where ue.user_id = p_user_id
        and ue.empresa_id = p_origem_empresa_id
        and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador')
    ) then
      return jsonb_build_object('ok', false, 'codigo', 'origem_sem_permissao');
    end if;

    select * into v_origem from public.empresas where id = p_origem_empresa_id;
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
          when v_origem.tipo_perfil = 'empresa' and v_assinatura.plano = 'business_pro' then 'business_pro'
          when v_origem.tipo_perfil = 'empresa' then 'business'
          when v_assinatura.plano = 'pessoal_premium' then 'pessoal_premium'
          else 'free'
        end;
        v_limite := case
          when v_plano = 'business_pro' then 10
          when v_plano in ('business', 'pessoal_premium') then 3
          else 1
        end;
        select count(*)::integer into v_usados
        from public.empresas e
        where e.id = p_origem_empresa_id
           or e.assinatura_origem_empresa_id = p_origem_empresa_id;
        v_compartilha := v_plano <> 'free'
          and v_usados < v_limite
          and (p_tipo_perfil = 'pessoal' or v_plano in ('business', 'business_pro'));
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

revoke all on function public.criar_perfil_financeiro_seguro(uuid, text, text, uuid, text, text) from public;
revoke all on function public.criar_perfil_financeiro_seguro(uuid, text, text, uuid, text, text) from anon;
revoke all on function public.criar_perfil_financeiro_seguro(uuid, text, text, uuid, text, text) from authenticated;
grant execute on function public.criar_perfil_financeiro_seguro(uuid, text, text, uuid, text, text) to service_role;
