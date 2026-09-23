import { supabase } from './supabase';

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
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, ativa: false, mensagem: 'Sua sessão expirou.' };
  const resposta = await fetch('/api/cobranca/sessoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ empresaId, dispositivoId: obterIdDispositivo(), acao }),
  }).catch(() => null);
  const dados = await resposta?.json().catch(() => null);
  return {
    ok: Boolean(resposta?.ok && dados?.ok),
    ativa: dados?.ativa !== false,
    ignorado: Boolean(dados?.ignorado),
    mensagem: String(dados?.mensagem || ''),
  };
}
