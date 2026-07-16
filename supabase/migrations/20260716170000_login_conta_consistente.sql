-- Login é um identificador da conta e deve aparecer em todos os perfis
-- vinculados, embora seja armazenado em uma única linha para respeitar o
-- índice global de unicidade.

create or replace function public.listar_usuarios_empresa_contas_rpc(p_empresa_id uuid)
returns table(
  id uuid,
  empresa_id uuid,
  user_id uuid,
  nome text,
  email text,
  login text,
  perfil text,
  status text,
  criado_em timestamptz,
  atualizado_em timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil_solicitante text;
begin
  select acesso.perfil
    into v_perfil_solicitante
  from public.usuarios_empresa acesso
  where acesso.empresa_id = p_empresa_id
    and acesso.user_id = auth.uid()
    and acesso.status = 'ativo'
  limit 1;

  if v_perfil_solicitante not in ('gestor_master', 'administrador', 'operador_completo') then
    raise exception 'Usuário sem permissão para listar acessos.';
  end if;

  return query
  select
    acesso.id,
    acesso.empresa_id,
    acesso.user_id,
    acesso.nome,
    acesso.email,
    coalesce(
      acesso.login,
      (
        select login_conta.login
        from public.usuarios_empresa login_conta
        where login_conta.user_id = acesso.user_id
          and login_conta.login is not null
          and btrim(login_conta.login) <> ''
        order by login_conta.criado_em asc
        limit 1
      )
    ) as login,
    acesso.perfil,
    acesso.status,
    acesso.criado_em,
    acesso.atualizado_em
  from public.usuarios_empresa acesso
  where acesso.empresa_id = p_empresa_id
    and acesso.perfil is distinct from 'funcionario_ponto'
    and (
      v_perfil_solicitante in ('gestor_master', 'administrador')
      or acesso.user_id = auth.uid()
    )
  order by acesso.criado_em asc;
end;
$$;

revoke all on function public.listar_usuarios_empresa_contas_rpc(uuid) from public;
grant execute on function public.listar_usuarios_empresa_contas_rpc(uuid) to authenticated;

-- Move o login entre vínculos da mesma conta dentro de uma única transação.
create or replace function public.definir_login_conta_rpc(
  p_user_id uuid,
  p_acesso_id uuid,
  p_login text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_acesso_id is null or btrim(coalesce(p_login, '')) = '' then
    raise exception 'Dados do login incompletos.';
  end if;

  if not exists (
    select 1
    from public.usuarios_empresa acesso
    where acesso.id = p_acesso_id
      and acesso.user_id = p_user_id
  ) then
    raise exception 'O acesso informado não pertence à conta.';
  end if;

  update public.usuarios_empresa
  set login = null,
      atualizado_em = now()
  where user_id = p_user_id
    and id <> p_acesso_id
    and login is not null;

  update public.usuarios_empresa
  set login = lower(btrim(p_login)),
      atualizado_em = now()
  where id = p_acesso_id
    and user_id = p_user_id;

  return found;
end;
$$;

revoke all on function public.definir_login_conta_rpc(uuid, uuid, text) from public;
grant execute on function public.definir_login_conta_rpc(uuid, uuid, text) to service_role;
