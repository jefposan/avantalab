-- Gestores consultam os vínculos comerciais de conteúdo do perfil. O Vendas
-- continua independente: esta lista não representa acesso a clientes, pedidos
-- ou dados financeiros do AvantaVendas.

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
    vinculo.id,
    vinculo.user_id,
    coalesce(
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
    vinculo.ativo,
    vinculo.novidades_ativas,
    vinculo.divulgacao_ativa,
    vinculo.catalogo_ativo,
    vinculo.criado_em,
    vinculo.atualizado_em
  from public.vendas_mobile_vinculos_comerciais vinculo
  join auth.users usuario on usuario.id = vinculo.user_id
  where vinculo.empresa_id = p_empresa_id
  order by vinculo.ativo desc, vinculo.atualizado_em desc;
end;
$$;

revoke all on function public.listar_vinculos_comerciais_vendas_mobile_rpc(uuid) from public;
grant execute on function public.listar_vinculos_comerciais_vendas_mobile_rpc(uuid) to authenticated;
