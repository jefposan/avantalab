/** Ação explícita de reentrada: remove somente credenciais locais deste projeto.
 * Não revoga sessões remotas, não apaga preferências nem usa localStorage.clear().
 * O reload subsequente descarta a instância Auth que poderia estar bloqueada.
 */
export function reiniciarAcessoLocal(storage: Pick<Storage, 'removeItem'>, supabaseUrl: string) {
  const url = new URL(supabaseUrl);
  if (url.protocol !== 'https:' || !url.hostname) throw new Error('Não foi possível identificar a sessão local.');
  // Mesma chave padrão documentada no cliente Supabase instalado.
  const key = `sb-${url.hostname.split('.')[0]}-auth-token`;
  for (const suffix of ['', '-user', '-code-verifier']) storage.removeItem(key + suffix);
}
