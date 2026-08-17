-- Um perfil que consome a quota de outro perfil pode iniciar uma assinatura
-- própria sem perder o acesso atual durante o checkout. A desvinculação só
-- ocorre junto da ativação confirmada da nova assinatura.

alter table public.empresas
  add column if not exists assinatura_origem_anterior_empresa_id uuid
    references public.empresas(id) on delete set null;

alter table public.empresas
  add column if not exists assinatura_desvinculada_em timestamptz;

comment on column public.empresas.assinatura_origem_anterior_empresa_id is
  'Último perfil cuja quota era consumida antes da ativação de assinatura própria.';

comment on column public.empresas.assinatura_desvinculada_em is
  'Momento em que uma assinatura própria substituiu o vínculo de quota anterior.';

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

  select * into v_empresa
  from public.empresas
  where id = p_empresa_id
  for update;
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
  set status = 'ativa',
      valido_ate = null,
      ciclo = coalesce(p_ciclo, ciclo),
      atualizado_em = now()
  where id = v_assinatura.id;

  if v_origem_empresa_id is not null then
    update public.empresas
    set assinatura_origem_anterior_empresa_id = v_origem_empresa_id,
        assinatura_origem_empresa_id = null,
        assinatura_desvinculada_em = now()
    where id = p_empresa_id;

    -- Instalações herdadas de Business Pro deixam de ser benefício incluído
    -- quando o novo plano próprio é Business. Os dados dos módulos são
    -- preservados; somente o direito de acesso é suspenso.
    if coalesce(v_assinatura.plano, '') <> 'business_pro' then
      update public.empresa_modulos
      set ativo = false,
          expira_em = null,
          atualizado_em = now()
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

comment on function public.ativar_assinatura_propria_perfil(uuid, text, text) is
  'Ativa a assinatura confirmada e, na mesma transação, libera a vaga de quota antes consumida pelo perfil.';

revoke all on function public.ativar_assinatura_propria_perfil(uuid, text, text) from public;
revoke all on function public.ativar_assinatura_propria_perfil(uuid, text, text) from anon;
revoke all on function public.ativar_assinatura_propria_perfil(uuid, text, text) from authenticated;
grant execute on function public.ativar_assinatura_propria_perfil(uuid, text, text) to service_role;
