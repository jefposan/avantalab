-- Garante que o PWA do colaborador possa identificar o perfil vinculado pela
-- própria sessão. Preserva todos os metadados existentes e altera somente
-- empresa_nome quando ele estiver ausente ou desatualizado.
update auth.users as usuario
set raw_user_meta_data = coalesce(usuario.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('empresa_nome', empresa.nome)
from public.recebimentos_colaboradores as colaborador
join public.empresas as empresa on empresa.id = colaborador.empresa_id
where usuario.id = colaborador.user_id
  and nullif(trim(empresa.nome), '') is not null
  and coalesce(usuario.raw_user_meta_data ->> 'empresa_nome', '') is distinct from empresa.nome;
