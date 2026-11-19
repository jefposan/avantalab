import { supabase } from './supabase';
import { guardarPreviaModulos } from './retorno-modulos';
import type { PerfilModulos } from '@/app/modulos/MeusModulos';

/** Mensagens apenas invalidam a apresentação: não carregam concessões ou tokens. */
export const CANAL_ACESSOS_MODULOS = 'avantalab-acessos-modulos-v1:';
export const EVENTO_ACESSOS_MODULOS = 'atualizados';
const pendentes = new Map<string, Promise<PerfilModulos[]>>();

export async function atualizarAcessosNavegacao(empresaId: string, usuarioId?: string, forcar = false): Promise<PerfilModulos[]> {
  const chave = `${usuarioId || ''}:${empresaId}`;
  if (!forcar && pendentes.has(chave)) return pendentes.get(chave)!;
  const inicio = Date.now();
  const consulta = (async () => {
    const { data } = await supabase.auth.getSession();
    const sessao = data.session;
    if (!sessao || (usuarioId && sessao.user.id !== usuarioId)) throw new Error('Sua sessão foi alterada. Entre novamente.');
    const params = new URLSearchParams({ empresaId, logos: 'adiadas' });
    const response = await fetch(`/api/acessos-usuario?${params}`, { headers: { Authorization: `Bearer ${sessao.access_token}` }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.mensagem || 'Não foi possível atualizar os acessos.');
    if (!Array.isArray(body.perfis)) throw new Error('Resposta de acessos inválida.');
    const atual = await supabase.auth.getSession();
    if (atual.data.session?.user.id !== sessao.user.id) throw new Error('Sua sessão foi alterada. Entre novamente.');
    const perfis = (body.perfis as PerfilModulos[]).filter(perfil => perfil.empresa.id === empresaId);
    guardarPreviaModulos(sessao.user.id, perfis, empresaId, inicio);
    return perfis;
  })();
  pendentes.set(chave, consulta);
  try { return await consulta; }
  finally { if (pendentes.get(chave) === consulta) pendentes.delete(chave); }
}

/** Também cobre a ativação legada por RPC; nenhum direito é anunciado pelo cliente. */
export async function anunciarMudancaAcessos(empresaId: string) {
  const canal = supabase.channel(`${CANAL_ACESSOS_MODULOS}${empresaId}`);
  try { await canal.httpSend(EVENTO_ACESSOS_MODULOS, {}, { timeout: 1500 }); }
  catch { /* A atualização local e as validações de acesso não dependem do aviso. */ }
  finally { await supabase.removeChannel(canal).catch(() => {}); }
}
