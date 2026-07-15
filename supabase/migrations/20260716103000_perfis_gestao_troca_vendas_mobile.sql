-- Lista todos os perfis ativos da Gestão vinculados à conta autenticada no
-- Vendas. A consulta não amplia permissões: a Gestão reaplica o papel próprio
-- do vínculo selecionado ao abrir o perfil.

create or replace function public.meus_perfis_gestao_para_troca_rpc()
returns table (
  empresa_id uuid,
  empresa_nome text,
  tipo_perfil text,
  perfil text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ue.empresa_id,
    e.nome as empresa_nome,
    coalesce(e.tipo_perfil, 'empresa') as tipo_perfil,
    ue.perfil
  from public.usuarios_empresa ue
  join public.empresas e on e.id = ue.empresa_id
  where ue.user_id = auth.uid()
    and ue.status = 'ativo'
  order by e.nome;
$$;

revoke all on function public.meus_perfis_gestao_para_troca_rpc() from public;
grant execute on function public.meus_perfis_gestao_para_troca_rpc() to authenticated;
