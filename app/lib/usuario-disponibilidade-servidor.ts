type UsuarioAuthResumido = {
  id: string;
  email?: string | null;
};

type ClienteAdminAuth = {
  auth: {
    admin: {
      listUsers: (parametros: {
        page: number;
        perPage: number;
      }) => Promise<{
        data: { users: UsuarioAuthResumido[] } | null;
        error: { message?: string } | null;
      }>;
    };
  };
};

export async function buscarContaAuthPorEmail(
  cliente: ClienteAdminAuth,
  email: string,
  ignorarUserId = ''
) {
  const emailNormalizado = email.trim().toLowerCase();
  const porPagina = 1000;
  let pagina = 1;

  while (true) {
    const { data, error } = await cliente.auth.admin.listUsers({
      page: pagina,
      perPage: porPagina,
    });

    if (error) throw new Error(error.message || 'Não foi possível consultar as contas.');

    const usuarios = data?.users || [];
    const encontrado = usuarios.find(
      (usuario) =>
        usuario.id !== ignorarUserId &&
        String(usuario.email || '').trim().toLowerCase() === emailNormalizado
    );

    if (encontrado) return encontrado;
    if (usuarios.length < porPagina) return null;

    pagina += 1;
  }
}
