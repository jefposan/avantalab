import { supabase } from './supabase';
import { erroAutenticacaoDefinitivo } from './sessao-perfil';

const CHAVE_DISPOSITIVO = 'avantalab.dispositivo.v1';

export function obterIdDispositivo() {
  if (typeof window === 'undefined') return '';
  const existente = window.localStorage.getItem(CHAVE_DISPOSITIVO);
  if (existente) return existente;
  const novo = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(CHAVE_DISPOSITIVO, novo);
  return novo;
}

export async function validarSessaoDoDispositivo(empresaId: string, acao: 'entrar' | 'verificar') {
  const { data, error } = await supabase.auth.getSession().catch(() => ({ data: { session: null }, error: { status: 503 } }));
  if (error) return { ok: false, ativa: false, expirada: erroAutenticacaoDefinitivo(error), mensagem: 'Não foi possível confirmar a sessão agora.' };
  const token = data.session?.access_token;
  if (!token) return { ok: false, ativa: false, expirada: true, mensagem: 'Sua sessão expirou.' };
  const resposta = await fetch('/api/cobranca/sessoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ empresaId, dispositivoId: obterIdDispositivo(), acao }),
  }).catch(() => null);
  const dados = await resposta?.json().catch(() => null);
  return {
    ok: Boolean(resposta?.ok && dados?.ok),
    // Falha de rede/servidor não encerra o login; tampouco vira confirmação.
    ativa: Boolean(resposta?.ok && dados?.ok && dados?.ativa === true),
    expirada: resposta?.status === 401,
    bloqueada: resposta?.status === 403 || Boolean(resposta?.ok && dados?.ativa === false),
    ignorado: Boolean(dados?.ignorado),
    mensagem: String(dados?.mensagem || ''),
  };
}
