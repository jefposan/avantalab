/** Políticas de perfil nunca revogam o login Supabase inteiro da conta. */
export function permiteSessoesDoPerfil(tipoPerfil: string, permiteSimultaneas: boolean) {
  return tipoPerfil === 'pessoal' || permiteSimultaneas;
}

export function erroAutenticacaoDefinitivo(erro: { code?: string; status?: number; name?: string } | null) {
  if (!erro) return false;
  return erro.name === 'AuthSessionMissingError'
    || ['session_not_found', 'session_expired', 'refresh_token_not_found',
      'refresh_token_already_used', 'bad_jwt', 'user_not_found', 'user_banned'].includes(erro.code || '')
    || erro.status === 401 || erro.status === 403;
}

/** Só chamar DEPOIS de auth.getUser(token) validar a assinatura e o usuário. */
export function idSessaoAutenticada(token: string, usuarioId: string) {
  try {
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    if (claims.sub !== usuarioId || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(claims.session_id || '')) return null;
    return String(claims.session_id);
  } catch { return null; }
}
