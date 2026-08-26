import { NextResponse } from 'next/server';
import { autenticarPerfilCobranca } from '@/app/lib/cobranca-servidor';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const temaEscuro = corpo.temaEscuro;
  if (!empresaId || typeof temaEscuro !== 'boolean') return NextResponse.json({ erro: true, mensagem: 'Dados de ajuste inválidos.' }, { status: 400 });

  const acesso = await autenticarPerfilCobranca(request, empresaId, true);
  if (!acesso) return NextResponse.json({ erro: true, mensagem: 'Apenas Gestor Master ou Administrador pode alterar o visual do perfil.' }, { status: 403 });

  const [{ data: instalacao }, { data: configuracao, error: erroConfiguracao }] = await Promise.all([
    acesso.db.from('empresa_modulos').select('ativo, expira_em').eq('empresa_id', empresaId).eq('modulo_id', 'custos').maybeSingle(),
    acesso.db.from('configuracoes').select('empresa_id').eq('empresa_id', empresaId).maybeSingle(),
  ]);
  if (erroConfiguracao || !configuracao) return NextResponse.json({ erro: true, mensagem: 'As configurações deste perfil não estão disponíveis.' }, { status: 409 });
  if (!instalacao?.ativo || (instalacao.expira_em && instalacao.expira_em <= new Date().toISOString())) return NextResponse.json({ erro: true, mensagem: 'Este módulo não está ativo neste perfil.' }, { status: 403 });

  const { error } = await acesso.db.from('configuracoes').update({ dark_mode: temaEscuro }).eq('empresa_id', empresaId);
  if (error) return NextResponse.json({ erro: true, mensagem: 'Não foi possível salvar o modo visual.' }, { status: 500 });
  return NextResponse.json({ ok: true, temaEscuro });
}
