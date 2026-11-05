import type { SupabaseClient } from '@supabase/supabase-js';

type AutenticacaoEntrada = Pick<SupabaseClient['auth'], 'getSession' | 'getUser' | 'refreshSession' | 'signOut'>;
type DadosSessao = Awaited<ReturnType<AutenticacaoEntrada['getSession']>>['data'];
export const LIMITE_VALIDACAO_ENTRADA_MS = 15_000;
export const MENSAGEM_FALHA_VALIDACAO_ENTRADA = 'Não foi possível confirmar seu acesso. Verifique a conexão e tente novamente. Sua sessão não foi apagada.';
const validacoes = new WeakMap<AutenticacaoEntrada, Promise<DadosSessao>>();

function credencialInvalida(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const erro = error as {code?: string; name?: string; status?: number};
  if (erro.status && (erro.status >= 500 || erro.status === 429)) return false;
  return erro.name === 'AuthSessionMissingError' || ['session_not_found', 'session_expired', 'refresh_token_not_found', 'refresh_token_already_used', 'bad_jwt', 'user_not_found', 'user_banned'].includes(erro.code || '');
}
function mesmaSessao(a: DadosSessao, b: DadosSessao) {
  return a.session?.access_token === b.session?.access_token && a.session?.user.id === b.session?.user.id;
}

/** Renova somente credenciais recusadas pelo Auth. Rede/timeout nunca apagam a sessão. */
export function validarSessaoEntrada(auth: AutenticacaoEntrada, limiteMs = LIMITE_VALIDACAO_ENTRADA_MS): Promise<DadosSessao> {
  const existente = validacoes.get(auth);
  if (existente) return existente;
  let expirou = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const ativo = () => { if (expirou) throw new Error(MENSAGEM_FALHA_VALIDACAO_ENTRADA); };
  const ler = async () => { const result = await auth.getSession(); ativo(); return result; };
  const confirmar = async (data: DadosSessao) => {
    if (!data.session) return data;
    // Token explícito vincula a resposta remota à sessão consultada.
    // Se o SDK já remover uma credencial recusada, a releitura volta ao login.
    const result = await auth.getUser(data.session.access_token); ativo();
    if (result.error) throw result.error;
    if (!result.data.user || result.data.user.id !== data.session.user.id) throw new Error('identity_mismatch');
    return data;
  };
  const limparRecusada = async (recusada: DadosSessao): Promise<DadosSessao> => {
    const atual = await ler();
    if (atual.error) throw atual.error;
    if (!atual.data.session) return atual.data;
    if (!mesmaSessao(atual.data, recusada)) return confirmar(atual.data);
    ativo();
    const result = await auth.signOut({scope:'local'}); ativo();
    if (result.error) throw result.error;
    const final = await ler();
    if (final.error) throw final.error;
    return confirmar(final.data);
  };
  const executar = async (): Promise<DadosSessao> => {
    const primeira = await ler();
    if (primeira.error && !credencialInvalida(primeira.error)) throw primeira.error;
    if (!primeira.error) {
      try { return await confirmar(primeira.data); }
      catch (error) { ativo(); if (!credencialInvalida(error)) throw error; }
    }
    const atual = await ler();
    if (atual.error && !credencialInvalida(atual.error)) throw atual.error;
    if (!atual.error && !atual.data.session) return atual.data;
    if (!atual.error && !mesmaSessao(primeira.data, atual.data)) return confirmar(atual.data);
    ativo();
    // Sem token copiado: o SDK usa a credencial corrente sob seu próprio lock.
    const renovada = await auth.refreshSession(); ativo();
    if (renovada.error && !credencialInvalida(renovada.error)) throw renovada.error;
    const depois = await ler();
    if (depois.error) throw depois.error;
    if (!depois.data.session) {
      // O SDK já remove credenciais de refresh definitivamente recusadas.
      if (renovada.error) return depois.data;
      throw new Error('refresh_without_session');
    }
    if (renovada.error) {
      if (!mesmaSessao(atual.data, depois.data)) return confirmar(depois.data);
      return limparRecusada(depois.data);
    }
    try { return await confirmar(depois.data); }
    catch (error) { ativo(); if (!credencialInvalida(error)) throw error; return limparRecusada(depois.data); }
  };
  const promise = Promise.race([
    executar(),
    new Promise<never>((_, reject) => { timer = setTimeout(() => { expirou = true; reject(new Error(MENSAGEM_FALHA_VALIDACAO_ENTRADA)); }, limiteMs); }),
  ]).catch(() => { throw new Error(MENSAGEM_FALHA_VALIDACAO_ENTRADA); }).finally(() => {
    if (timer) clearTimeout(timer);
    if (validacoes.get(auth) === promise) validacoes.delete(auth);
  });
  validacoes.set(auth, promise);
  return promise;
}
