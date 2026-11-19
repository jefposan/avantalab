type VinculoSenha = { user_id?: string | null; empresa_id?: string; perfil?: string; status?: string };
type ContaSenha = { user_id?: string; origem?: string; empresa_origem_id?: string | null };

/** Contas internas exclusivas; origem atribuída a outra empresa nunca é aceita. */
export function podeRedefinirSenhaEquipe(
  ator: { userId: string; perfil: string; empresaId: string },
  alvo: VinculoSenha,
  conta: ContaSenha | null | undefined,
  vinculos: VinculoSenha[],
) {
  if (!alvo.user_id || alvo.user_id === ator.userId || alvo.empresa_id !== ator.empresaId || alvo.status !== 'ativo') return false;
  if (!['administrador', 'operador_completo', 'operador_simples'].includes(alvo.perfil || '')) return false;
  if (ator.perfil !== 'gestor_master' && !(ator.perfil === 'administrador' && ['operador_completo', 'operador_simples'].includes(alvo.perfil || ''))) return false;
  if (conta?.user_id !== alvo.user_id || conta.origem !== 'usuario_interno' || (conta.empresa_origem_id && conta.empresa_origem_id !== ator.empresaId)) return false;
  const acessos = vinculos.filter(v => v.user_id === alvo.user_id);
  return acessos.length > 0 && acessos.every(v => v.empresa_id === ator.empresaId && v.perfil !== 'gestor_master');
}
