import { NextResponse } from 'next/server';
import { autenticarPerfilCobranca, resolverEstadoAcesso } from '@/app/lib/cobranca-servidor';
import { normalizarPlanoComercial } from '@/app/lib/planos-comerciais';

export const runtime = 'nodejs';

// No Business Pro a remoção é imediata, mas nunca apaga os dados do módulo.
export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const moduloId = String(corpo.moduloId || '').trim();
  if (!empresaId || !moduloId) return NextResponse.json({ erro: true, mensagem: 'Dados inválidos.' }, { status: 400 });

  const acesso = await autenticarPerfilCobranca(request, empresaId, true);
  if (!acesso) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });
  const estado = await resolverEstadoAcesso(empresaId);
  if (normalizarPlanoComercial(estado?.plano) !== 'business_pro') {
    return NextResponse.json({ erro: true, mensagem: 'Use o cancelamento da assinatura para módulos avulsos do Business.' }, { status: 409 });
  }

  const { error } = await acesso.db.from('empresa_modulos')
    .update({ ativo: false, expira_em: null, atualizado_em: new Date().toISOString() })
    .eq('empresa_id', empresaId).eq('modulo_id', moduloId);
  if (error) return NextResponse.json({ erro: true, mensagem: 'Não foi possível remover o módulo.' }, { status: 500 });
  return NextResponse.json({ ok: true, dadosPreservados: true });
}
