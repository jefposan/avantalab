import { NextResponse } from 'next/server';
import { removerAssinaturaAsaas } from '../../../../lib/asaas';
import { autenticarPerfilCobranca, resolverEstadoAcesso } from '../../../../lib/cobranca-servidor';
import { normalizarPlanoComercial } from '../../../../lib/planos-comerciais';

export const runtime = 'nodejs';

// Cancela exclusivamente a recorrência do módulo selecionado e desativa o
// acesso do módulo no mesmo fluxo, sem afetar o plano principal.
export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const moduloId = String(corpo.moduloId || '').trim();
  if (!empresaId || !moduloId) return NextResponse.json({ erro: true, mensagem: 'Dados inválidos.' }, { status: 400 });
  const acesso = await autenticarPerfilCobranca(request, empresaId, true);
  if (!acesso) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });
  const estado = await resolverEstadoAcesso(empresaId);
  if (normalizarPlanoComercial(estado?.plano) !== 'business') {
    return NextResponse.json({ erro: true, mensagem: 'Esta ação é exclusiva dos módulos avulsos do Business.' }, { status: 409 });
  }
  const { data: assinatura } = await acesso.db
    .from('assinaturas_modulos')
    .select('id, status, gateway_subscription_id')
    .eq('empresa_id', empresaId).eq('modulo_id', moduloId).maybeSingle();
  if (!assinatura || assinatura.status === 'cancelada') return NextResponse.json({ ok: true, jaCancelada: true });
  if (assinatura.gateway_subscription_id) {
    const removida = await removerAssinaturaAsaas(assinatura.gateway_subscription_id);
    if (!removida.ok && removida.status !== 404) {
      return NextResponse.json({ erro: true, mensagem: removida.erro || 'Não foi possível cancelar a assinatura do módulo.' }, { status: 502 });
    }
  }
  const agora = new Date().toISOString();
  await Promise.all([
    acesso.db.from('assinaturas_modulos').update({ status: 'cancelada', valido_ate: agora, atualizado_em: agora }).eq('id', assinatura.id),
    acesso.db.from('empresa_modulos').update({ ativo: false, atualizado_em: agora }).eq('empresa_id', empresaId).eq('modulo_id', moduloId),
  ]);
  return NextResponse.json({ ok: true });
}
