-- O acesso ao Vendas Mobile deve existir explicitamente na tabela de acessos.
-- Ser gestor ou administrador no ERP permite analisar solicitacoes, mas nao
-- concede entrada automatica no aplicativo de vendas.

create or replace function public.meus_acessos_vendas_mobile_rpc()
returns table (
  empresa_id uuid,
  empresa_nome text,
  papel text,
  status text
)
language sql
security definer
set search_path = public
as $$
  select a.empresa_id, e.nome, a.papel, a.status
  from public.vendas_mobile_acessos a
  join public.empresas e on e.id = a.empresa_id
  where a.user_id = auth.uid();
$$;

revoke all on function public.meus_acessos_vendas_mobile_rpc() from public;
grant execute on function public.meus_acessos_vendas_mobile_rpc() to authenticated;
