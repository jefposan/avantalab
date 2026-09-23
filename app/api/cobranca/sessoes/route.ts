import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { COBRANCA_ATIVA, assinaturaVigente } from '../../../lib/cobranca';
import { resolverEstadoAcesso } from '../../../lib/cobranca-servidor';
import { normalizarPlanoComercial, PLANOS_COMERCIAIS } from '../../../lib/planos-comerciais';

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
  if (erroAutenticacao || !autenticacao.user) return respostaErro(401, 'Sua sessão expirou. Entre novamente.');

  const admin = createClient(url, service);
  const { data: vinculo } = await admin
    .from('usuarios_empresa')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('user_id', autenticacao.user.id)
    .eq('status', 'ativo')
    .maybeSingle();
  if (!vinculo) return respostaErro(403, 'Você não tem acesso a este perfil.');

  const estado = await resolverEstadoAcesso(empresaId);
  if (!estado || !assinaturaVigente(estado)) {
    return NextResponse.json({ ok: true, ignorado: true, ativa: true });
  }

  const plano = normalizarPlanoComercial(estado.plano) || 'free';
  const simultaneas = PLANOS_COMERCIAIS[plano].limites.permiteSessoesSimultaneasDoMesmoUsuario;
  const agora = new Date().toISOString();
  const base = admin.from('sessoes_acesso');

  if (acao === 'verificar') {
    const { data: sessao, error } = await base
      .select('status')
      .eq('user_id', autenticacao.user.id)
      .eq('dispositivo_id', dispositivoId)
      .maybeSingle();
    if (error) return respostaErro(502, 'Não foi possível confirmar a sessão.');
    const ativa = !sessao || sessao.status === 'ativa';
    return NextResponse.json({
      ok: true,
      ativa,
      politica: simultaneas ? 'simultaneas' : 'unica',
      mensagem: ativa ? undefined : 'Esta conta foi acessada em outro dispositivo.',
    });
  }

  if (!simultaneas) {
    const { error: revogarErro } = await base
      .update({ status: 'revogada', revogada_em: agora, atualizado_em: agora })
      .eq('user_id', autenticacao.user.id)
      .eq('status', 'ativa')
      .neq('dispositivo_id', dispositivoId);
    if (revogarErro) return respostaErro(502, 'Não foi possível encerrar a sessão anterior.');

    // Revoga também refresh tokens de outros dispositivos. A confirmação pela
    // tabela acima permite que a outra interface reaja imediatamente, mesmo
    // antes de seu token curto expirar.
    const { error: signOutErro } = await admin.auth.admin.signOut(token, 'others');
    if (signOutErro) return respostaErro(502, 'Não foi possível encerrar a sessão anterior.');
  }

  const { error: salvarErro } = await base.upsert({
    user_id: autenticacao.user.id,
    dispositivo_id: dispositivoId,
    empresa_id: empresaId,
    plano,
    status: 'ativa',
    atualizado_em: agora,
    revogada_em: null,
  }, { onConflict: 'user_id,dispositivo_id' });
  if (salvarErro) return respostaErro(502, 'Não foi possível registrar esta sessão.');

  return NextResponse.json({ ok: true, ativa: true, politica: simultaneas ? 'simultaneas' : 'unica' });
}
