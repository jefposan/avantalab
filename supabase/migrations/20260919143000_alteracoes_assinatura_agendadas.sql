-- Alterações de plano/ciclo que só entram em vigor após o período já pago.
-- O plano atual continua sendo a fonte dos direitos até alteracao_agendada_para.

alter table public.assinaturas
  add column if not exists plano_agendado text,
  add column if not exists ciclo_agendado text,
  add column if not exists alteracao_agendada_para timestamptz,
  add column if not exists alteracao_agendada_em timestamptz;

alter table public.assinaturas
  drop constraint if exists assinaturas_plano_agendado_check;
alter table public.assinaturas
  add constraint assinaturas_plano_agendado_check
  check (plano_agendado is null or plano_agendado in ('business', 'business_pro', 'business_premium'));

alter table public.assinaturas
  drop constraint if exists assinaturas_ciclo_agendado_check;
alter table public.assinaturas
  add constraint assinaturas_ciclo_agendado_check
  check (ciclo_agendado is null or ciclo_agendado in ('mensal', 'anual'));

alter table public.assinaturas
  drop constraint if exists assinaturas_alteracao_agendada_completa_check;
alter table public.assinaturas
  add constraint assinaturas_alteracao_agendada_completa_check check (
    (plano_agendado is null and ciclo_agendado is null and alteracao_agendada_para is null and alteracao_agendada_em is null)
    or
    (plano_agendado is not null and ciclo_agendado is not null and alteracao_agendada_para is not null and alteracao_agendada_em is not null)
  );

create index if not exists assinaturas_alteracao_agendada_idx
  on public.assinaturas (alteracao_agendada_para)
  where alteracao_agendada_para is not null;

create or replace function public.aplicar_alteracao_assinatura_agendada(
  p_empresa_id uuid,
  p_agora timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_assinatura public.assinaturas%rowtype;
begin
  if p_empresa_id is null then
    return jsonb_build_object('ok', false, 'codigo', 'empresa_invalida');
  end if;

  select * into v_assinatura
  from public.assinaturas
  where empresa_id = p_empresa_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'assinatura_inexistente');
  end if;
  if v_assinatura.plano_agendado is null then
    return jsonb_build_object('ok', true, 'aplicada', false, 'codigo', 'sem_alteracao');
  end if;
  if v_assinatura.alteracao_agendada_para > p_agora then
    return jsonb_build_object(
      'ok', true,
      'aplicada', false,
      'codigo', 'ainda_nao_vigente',
      'efetivaEm', v_assinatura.alteracao_agendada_para
    );
  end if;

  update public.assinaturas
  set plano = v_assinatura.plano_agendado,
      ciclo = v_assinatura.ciclo_agendado,
      plano_agendado = null,
      ciclo_agendado = null,
      alteracao_agendada_para = null,
      alteracao_agendada_em = null,
      atualizado_em = p_agora
  where id = v_assinatura.id;

  perform public.reconciliar_perfis_quota(p_empresa_id);

  return jsonb_build_object(
    'ok', true,
    'aplicada', true,
    'planoAnterior', v_assinatura.plano,
    'cicloAnterior', v_assinatura.ciclo,
    'plano', v_assinatura.plano_agendado,
    'ciclo', v_assinatura.ciclo_agendado
  );
end;
$$;

comment on function public.aplicar_alteracao_assinatura_agendada(uuid, timestamptz) is
  'Aplica de forma atômica uma troca de plano/ciclo após o fim do período pago.';

revoke all on function public.aplicar_alteracao_assinatura_agendada(uuid, timestamptz) from public;
revoke all on function public.aplicar_alteracao_assinatura_agendada(uuid, timestamptz) from anon;
revoke all on function public.aplicar_alteracao_assinatura_agendada(uuid, timestamptz) from authenticated;
grant execute on function public.aplicar_alteracao_assinatura_agendada(uuid, timestamptz) to service_role;
