-- A tela de gestão precisa exibir toda conta de vendas que permanece conectada
-- ao perfil, inclusive conexões migradas cujo acesso legado já não existe.
-- Esta consulta é somente informativa e não concede, revoga ou reativa acesso.

create or replace function public.listar_vinculos_comerciais_vendas_mobile_rpc(
  p_empresa_id uuid
)
returns table (
  id uuid,
  user_id uuid,
  nome text,
  email text,
  telefone text,
  ativo boolean,
  novidades_ativas boolean,
  divulgacao_ativa boolean,
  catalogo_ativo boolean,
  criado_em timestamptz,
  atualizado_em timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'É necessário entrar na conta.';
  end if;

  if not exists (
    select 1
    from public.usuarios_empresa acesso
    where acesso.empresa_id = p_empresa_id
      and acesso.user_id = auth.uid()
      and acesso.status = 'ativo'
      and acesso.perfil in ('gestor_master', 'administrador')
  ) then
    raise exception 'Sem permissão para consultar os vínculos de conteúdo deste perfil.';
  end if;

  return query
  select
    vinculo.conta_id as id,
    conta.criado_por as user_id,
    coalesce(
      nullif(trim(conta.nome), ''),
      nullif(trim(usuario.raw_user_meta_data ->> 'nome'), ''),
      nullif(trim(usuario.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(usuario.email, ''), '@', 1), ''),
      'Usuário sem identificação'
    ) as nome,
    coalesce(nullif(trim(usuario.email), ''), 'E-mail não informado') as email,
    coalesce(
      nullif(trim(usuario.raw_user_meta_data ->> 'telefone'), ''),
      nullif(trim(usuario.raw_user_meta_data ->> 'phone'), ''),
      nullif(trim(usuario.phone), '')
    ) as telefone,
    true as ativo,
    coalesce(recursos.novidades_ativas, true) as novidades_ativas,
    coalesce(recursos.divulgacao_ativa, true) as divulgacao_ativa,
    coalesce(recursos.catalogo_ativo, true) as catalogo_ativo,
    vinculo.criado_em,
    greatest(vinculo.atualizado_em, coalesce(recursos.atualizado_em, vinculo.atualizado_em)) as atualizado_em
  from public.vendas_mobile_contas_vinculos_comerciais vinculo
  join public.vendas_mobile_contas conta
    on conta.id = vinculo.conta_id
   and conta.arquivada_em is null
  join auth.users usuario on usuario.id = conta.criado_por
  left join public.vendas_mobile_contas_recursos recursos
    on recursos.conta_id = conta.id
  where vinculo.empresa_id = p_empresa_id
    and vinculo.ativo = true
  order by atualizado_em desc, nome;
end;
$$;

revoke all on function public.listar_vinculos_comerciais_vendas_mobile_rpc(uuid) from public;
grant execute on function public.listar_vinculos_comerciais_vendas_mobile_rpc(uuid) to authenticated;
