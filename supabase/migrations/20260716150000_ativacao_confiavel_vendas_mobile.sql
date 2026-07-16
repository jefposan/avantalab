-- Ativação atômica do Vendas Mobile pelo Gestor Master/Administrador.
-- A interface só considera o módulo instalado após esta função confirmar a
-- gravação e liberar o gestor atual no Vendas.

create or replace function public.ativar_modulo_vendas_mobile_rpc(p_empresa_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil text;
begin
  if auth.uid() is null then
    raise exception 'Sessão não encontrada.';
  end if;

  select ue.perfil
    into v_perfil
  from public.usuarios_empresa ue
  where ue.empresa_id = p_empresa_id
    and ue.user_id = auth.uid()
    and ue.status = 'ativo'
  limit 1;

  if v_perfil is null or v_perfil not in ('gestor_master', 'administrador') then
    raise exception 'Somente Gestor Master ou Administrador pode ativar o Vendas Mobile neste perfil.';
  end if;

  if not exists (select 1 from public.modulos where id = 'vendas_mobile' and disponivel = true) then
    raise exception 'O módulo Vendas Mobile não está disponível para instalação.';
  end if;

  insert into public.empresa_modulos (
    empresa_id,
    modulo_id,
    ativo,
    origem,
    atualizado_em
  ) values (
    p_empresa_id,
    'vendas_mobile',
    true,
    'avulso',
    now()
  )
  on conflict (empresa_id, modulo_id) do update
    set ativo = true,
        origem = 'avulso',
        atualizado_em = now();

  insert into public.vendas_mobile_acessos (
    empresa_id,
    user_id,
    papel,
    status,
    aprovado_por,
    atualizado_em
  ) values (
    p_empresa_id,
    auth.uid(),
    'gestor',
    'ativo',
    auth.uid(),
    now()
  )
  on conflict (empresa_id, user_id) do update
    set papel = 'gestor',
        status = 'ativo',
        aprovado_por = auth.uid(),
        atualizado_em = now();

  return exists (
    select 1
    from public.empresa_modulos modulo
    where modulo.empresa_id = p_empresa_id
      and modulo.modulo_id = 'vendas_mobile'
      and modulo.ativo = true
  );
end;
$$;

revoke all on function public.ativar_modulo_vendas_mobile_rpc(uuid) from public;
grant execute on function public.ativar_modulo_vendas_mobile_rpc(uuid) to authenticated;
