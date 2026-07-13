-- Gestores do perfil podem revogar, reativar ou excluir acessos ja aprovados.

create or replace function public.gerenciar_acesso_vendas_mobile_rpc(
  p_acesso_id uuid,
  p_acao text
)
returns public.vendas_mobile_acessos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acesso public.vendas_mobile_acessos;
  v_acao text := lower(trim(coalesce(p_acao, '')));
begin
  select * into v_acesso
  from public.vendas_mobile_acessos
  where id = p_acesso_id
  for update;

  if v_acesso.id is null then
    raise exception 'Acesso não encontrado.';
  end if;

  if not exists (
    select 1 from public.usuarios_empresa ue
    where ue.empresa_id = v_acesso.empresa_id
      and ue.user_id = auth.uid()
      and ue.status = 'ativo'
      and ue.perfil in ('gestor_master', 'administrador')
  ) then
    raise exception 'Sem permissão para gerenciar este acesso.';
  end if;

  if v_acao = 'revogar' then
    update public.vendas_mobile_acessos
       set status = 'bloqueado', atualizado_em = now()
     where id = v_acesso.id
     returning * into v_acesso;
  elsif v_acao = 'reativar' then
    update public.vendas_mobile_acessos
       set status = 'ativo', aprovado_em = now(), aprovado_por = auth.uid(), atualizado_em = now()
     where id = v_acesso.id
     returning * into v_acesso;
  elsif v_acao = 'excluir' then
    delete from public.vendas_mobile_acessos
     where id = v_acesso.id;

    update public.vendas_mobile_solicitacoes_acesso
       set status = 'cancelada', atualizado_em = now()
     where empresa_id = v_acesso.empresa_id
       and user_id = v_acesso.user_id;
  else
    raise exception 'Ação inválida para o acesso.';
  end if;

  return v_acesso;
end;
$$;

revoke all on function public.gerenciar_acesso_vendas_mobile_rpc(uuid, text) from public;
grant execute on function public.gerenciar_acesso_vendas_mobile_rpc(uuid, text) to authenticated;
