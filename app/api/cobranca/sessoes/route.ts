import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { COBRANCA_ATIVA, assinaturaVigente } from '../../../lib/cobranca';
import { resolverEstadoAcesso } from '../../../lib/cobranca-servidor';
import { normalizarPlanoComercial, PLANOS_COMERCIAIS } from '../../../lib/planos-comerciais';
import { erroAutenticacaoDefinitivo, idSessaoAutenticada, permiteSessoesDoPerfil } from '../../../lib/sessao-perfil';

export const runtime = 'nodejs';

type AcaoSessao = 'entrar' | 'verificar';

function respostaErro(status: number, mensagem: string) {
  return NextResponse.json({ ok: false, mensagem }, { status });
}

/**
 * Centraliza a política de sessões. O dispositivo nunca pode reativar-se por
 * conta própria: somente a ação "entrar" cria/renova sua sessão; "verificar"
 * apenas consulta o estado que o servidor já decidiu.
 */
export async function POST(request: Request) {
  if (!COBRANCA_ATIVA) return NextResponse.json({ ok: true, ignorado: true, ativa: true });

  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const dispositivoId = String(corpo.dispositivoId || '').trim();
  const acao: AcaoSessao = corpo.acao === 'verificar' ? 'verificar' : 'entrar';
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!empresaId || !dispositivoId || dispositivoId.length > 160 || !token || !url || !anon || !service) {
    return respostaErro(400, 'Não foi possível validar esta sessão.');
  }

  const publico = createClient(url, anon);
  const { data: autenticacao, error: erroAutenticacao } = await publico.auth.getUser(token);
  if (erroAutenticacao) return respostaErro(erroAutenticacaoDefinitivo(erroAutenticacao) ? 401 : 503,
    erroAutenticacaoDefinitivo(erroAutenticacao) ? 'Sua sessão expirou. Entre novamente.' : 'Não foi possível confirmar a sessão agora. Tente novamente.');
  if (!autenticacao.user) return respostaErro(401, 'Sua sessão expirou. Entre novamente.');
  const sessaoAuthId = idSessaoAutenticada(token, autenticacao.user.id);
  if (!sessaoAuthId) return respostaErro(401, 'Sua sessão expirou. Entre novamente.');

  const admin = createClient(url, service);
  const { data: vinculo, error: erroVinculo } = await admin
    .from('usuarios_empresa')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('user_id', autenticacao.user.id)
    .eq('status', 'ativo')
    .maybeSingle();
  if (erroVinculo) return respostaErro(503, 'Não foi possível consultar o acesso ao perfil. Tente novamente.');
  if (!vinculo) return respostaErro(403, 'Você não tem acesso a este perfil.');

  const estado = await resolverEstadoAcesso(empresaId);
  if (!estado || !assinaturaVigente(estado)) {
    return NextResponse.json({ ok: true, ignorado: true, ativa: true });
  }

  const plano = normalizarPlanoComercial(estado.plano) || 'free';
  const simultaneas = permiteSessoesDoPerfil(estado.tipoPerfil,
    PLANOS_COMERCIAIS[plano].limites.permiteSessoesSimultaneasDoMesmoUsuario);
  const { data: ativa, error } = await admin.rpc('avantalab_confirmar_sessao_perfil', {
    p_user_id: autenticacao.user.id, p_empresa_id: empresaId,
    p_sessao_auth_id: sessaoAuthId, p_dispositivo_id: dispositivoId,
    p_plano: plano, p_simultaneas: simultaneas, p_acao: acao,
  });
  if (error || typeof ativa !== 'boolean') return respostaErro(503, 'Não foi possível confirmar a sessão do perfil. Tente novamente.');
  return NextResponse.json({ ok: true, ativa, politica: simultaneas ? 'simultaneas' : 'unica',
    codigo: ativa ? undefined : 'perfil_em_outro_dispositivo',
    mensagem: ativa ? undefined : 'Este perfil foi acessado em outro dispositivo. Escolha outro perfil ou entre novamente para usá-lo aqui.',
  });
}
