-- Quando um titular ativa uma assinatura Business paga, perfis anteriores da
-- mesma conta que ainda estavam em trial/cortesia passam a consumir a quota
-- da assinatura. O histórico de assinatura local é preservado e assinaturas
-- pagas independentes nunca são alteradas.
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

  -- Evita duas ativações/webhooks disputarem as mesmas vagas da assinatura.
  perform pg_advisory_xact_lock(hashtextextended(p_origem_empresa_id::text, 0));

  select case when a.plano = 'business_pro' then 10 else 3 end
    into v_limite
  from public.empresas e
  join public.assinaturas a on a.empresa_id = e.id
  where e.id = p_origem_empresa_id
    and e.tipo_perfil = 'empresa'
    and e.assinatura_origem_empresa_id is null
    and a.plano in ('business', 'business_pro', 'empresa')
    and a.status = 'ativa'
    and a.gateway_subscription_id is not null;

  if not found then
    return 0;
  end if;

  select count(*)::integer
    into v_usados
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
    left join public.assinaturas assinatura_alvo
      on assinatura_alvo.empresa_id = alvo.id
    where titular_origem.empresa_id = p_origem_empresa_id
      and titular_origem.status = 'ativo'
      and titular_origem.perfil = 'gestor_master'
      and alvo.id <> p_origem_empresa_id
      and alvo.assinatura_origem_empresa_id is null
      and not exists (
        select 1
        from public.empresas dependente
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

comment on function public.reconciliar_perfis_quota(uuid) is
  'Vincula à quota Business paga os perfis sem cobrança própria do mesmo gestor master.';

revoke all on function public.reconciliar_perfis_quota(uuid) from public;
revoke all on function public.reconciliar_perfis_quota(uuid) from anon;
revoke all on function public.reconciliar_perfis_quota(uuid) from authenticated;
grant execute on function public.reconciliar_perfis_quota(uuid) to service_role;
