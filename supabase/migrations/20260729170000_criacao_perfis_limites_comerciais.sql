-- A criação de perfis passa pela rota de servidor /api/criar-perfil, que
-- aplica os limites comerciais. As RPCs antigas não permanecem públicas para
-- evitar a criação direta por um cliente desatualizado.
revoke execute on function public.criar_primeiro_perfil_cadastro_rpc(text, text) from authenticated;
revoke execute on function public.criar_empresa_inicial_rpc(text) from authenticated;
