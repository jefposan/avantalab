-- A integração entre Gestão e Vendas deve liberar automaticamente o usuário
-- que administra a empresa. Operadores continuam dependendo do fluxo próprio
-- de solicitação e aprovação do Vendas Mobile.

create or replace function public.garantir_acessos_gestor_vendas_mobile_rpc()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer := 0;
begin
  if auth.uid() is null then
    return 0;
  end if;

  insert into public.vendas_mobile_acessos (
    empresa_id,
    user_id,
    papel,
    status,
    aprovado_por,
    atualizado_em
  )
  select
    ue.empresa_id,
    auth.uid(),
    'gestor',
    'ativo',
    auth.uid(),
    now()
  from public.usuarios_empresa ue
  join public.empresa_modulos modulo
    on modulo.empresa_id = ue.empresa_id
   and modulo.modulo_id = 'vendas_mobile'
   and modulo.ativo = true
  where ue.user_id = auth.uid()
    and ue.status = 'ativo'
    and ue.perfil in ('gestor_master', 'administrador')
  on conflict (empresa_id, user_id) do update
    set papel = 'gestor',
        status = 'ativo',
        aprovado_por = auth.uid(),
        atualizado_em = now();

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke all on function public.garantir_acessos_gestor_vendas_mobile_rpc() from public;
grant execute on function public.garantir_acessos_gestor_vendas_mobile_rpc() to authenticated;
