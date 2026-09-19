-- Mantém recursos persistidos coerentes quando uma assinatura empresarial
-- muda de nível. Nada é apagado: perfis excedentes deixam de compartilhar a
-- assinatura e usuários/funcionários excedentes são apenas inativados.

create or replace function public.aplicar_direitos_plano_empresarial()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limite_perfis integer;
  v_limite_usuarios integer;
  v_limite_funcionarios integer;
begin
  if new.plano not in ('business', 'empresa', 'business_pro', 'business_premium') then
    return new;
  end if;

  v_limite_perfis := case
    when new.plano = 'business_premium' then 10
    when new.plano = 'business_pro' then 3
    else 1
  end;
  v_limite_usuarios := v_limite_perfis;
  v_limite_funcionarios := case
    when new.plano = 'business_premium' then null
    when new.plano = 'business_pro' then 30
    else 10
  end;

  -- O perfil assinante sempre permanece. Os mais antigos ocupam as vagas que
  -- restarem; os demais conservam seus dados e voltam a ser independentes.
  update public.empresas empresa
  set assinatura_origem_empresa_id = null
  where empresa.id in (
    select excedente.id
    from public.empresas excedente
    where excedente.assinatura_origem_empresa_id = new.empresa_id
    order by excedente.created_at asc nulls last, excedente.id
    offset greatest(v_limite_perfis - 1, 0)
  );

  -- A franquia de usuários é aplicada em cada perfil que ainda participa da
  -- assinatura. Gestor Master tem prioridade e vínculos técnicos do Ponto não
  -- consomem esta franquia.
  with alvos as (
    select new.empresa_id as empresa_id
    union all
    select empresa.id
    from public.empresas empresa
    where empresa.assinatura_origem_empresa_id = new.empresa_id
  ), ordenados as (
    select usuario.id,
      row_number() over (
        partition by usuario.empresa_id
        order by case when usuario.perfil = 'gestor_master' then 0 else 1 end, usuario.id
      ) as posicao
    from public.usuarios_empresa usuario
    join alvos on alvos.empresa_id = usuario.empresa_id
    where usuario.status = 'ativo'
      and usuario.perfil <> 'funcionario_ponto'
  )
  update public.usuarios_empresa usuario
  set status = 'inativo'
  from ordenados
  where usuario.id = ordenados.id
    and ordenados.posicao > v_limite_usuarios;

  -- O Premium é ilimitado. Nos demais planos, os registros excedentes ficam
  -- inativos, mantendo marcações e documentos históricos intactos.
  if v_limite_funcionarios is not null then
    with alvos as (
      select new.empresa_id as empresa_id
      union all
      select empresa.id
      from public.empresas empresa
      where empresa.assinatura_origem_empresa_id = new.empresa_id
    ), ordenados as (
      select funcionario.id,
        row_number() over (
          partition by funcionario.empresa_id
          order by funcionario.id
        ) as posicao
      from public.ponto_funcionarios funcionario
      join alvos on alvos.empresa_id = funcionario.empresa_id
      where funcionario.ativo = true
    )
    update public.ponto_funcionarios funcionario
    set ativo = false
    from ordenados
    where funcionario.id = ordenados.id
      and ordenados.posicao > v_limite_funcionarios;
  end if;

  if new.plano not in ('business', 'empresa') then
    return new;
  end if;

  update public.configuracoes configuracao
  set centros_custo_ativo = false
  where configuracao.empresa_id = new.empresa_id
     or configuracao.empresa_id in (
       select empresa.id
       from public.empresas empresa
       where empresa.assinatura_origem_empresa_id = new.empresa_id
     );

  update public.empresa_modulos instalacao
  set ativo = false,
      expira_em = null,
      atualizado_em = now()
  where (
      instalacao.empresa_id = new.empresa_id
      or instalacao.empresa_id in (
        select empresa.id
        from public.empresas empresa
        where empresa.assinatura_origem_empresa_id = new.empresa_id
      )
    )
    and instalacao.ativo = true
    and instalacao.origem in ('plano_business_pro', 'cortesia');

  return new;
end;
$$;

drop trigger if exists assinaturas_aplicar_direitos_plano on public.assinaturas;
create trigger assinaturas_aplicar_direitos_plano
after insert or update of plano, status on public.assinaturas
for each row execute function public.aplicar_direitos_plano_empresarial();

-- Corrige de modo idempotente eventuais registros Business Básico existentes
-- quando esta migração chegar ao ambiente.
with perfis_basicos as (
  select assinatura.empresa_id as origem_id
  from public.assinaturas assinatura
  where assinatura.plano in ('business', 'empresa')
), alvos as (
  select origem_id as empresa_id from perfis_basicos
  union
  select empresa.id
  from public.empresas empresa
  join perfis_basicos on perfis_basicos.origem_id = empresa.assinatura_origem_empresa_id
)
update public.configuracoes configuracao
set centros_custo_ativo = false
where configuracao.empresa_id in (select empresa_id from alvos);

with perfis_basicos as (
  select assinatura.empresa_id as origem_id
  from public.assinaturas assinatura
  where assinatura.plano in ('business', 'empresa')
), alvos as (
  select origem_id as empresa_id from perfis_basicos
  union
  select empresa.id
  from public.empresas empresa
  join perfis_basicos on perfis_basicos.origem_id = empresa.assinatura_origem_empresa_id
)
update public.empresa_modulos instalacao
set ativo = false,
    expira_em = null,
    atualizado_em = now()
where instalacao.empresa_id in (select empresa_id from alvos)
  and instalacao.ativo = true
  and instalacao.origem in ('plano_business_pro', 'cortesia');

comment on function public.aplicar_direitos_plano_empresarial() is
  'Aplica franquias 1/3/10 e desativa benefícios não incluídos no Business Básico, preservando todos os dados.';

revoke all on function public.aplicar_direitos_plano_empresarial() from public;
revoke all on function public.aplicar_direitos_plano_empresarial() from anon;
revoke all on function public.aplicar_direitos_plano_empresarial() from authenticated;
