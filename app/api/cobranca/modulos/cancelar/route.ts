import { NextResponse } from 'next/server';
import { listarCobrancasAssinaturaAsaas, removerAssinaturaAsaas } from '../../../../lib/asaas';
import { autenticarPerfilCobranca, resolverEstadoAcesso } from '../../../../lib/cobranca-servidor';
import { normalizarPlanoComercial } from '../../../../lib/planos-comerciais';

export const runtime = 'nodejs';

function fimDoPeriodoPago(cobrancas: Array<{ dueDate?: string; status?: string }>, fallback?: string | null) {
  const agora = new Date();
  if (fallback && new Date(fallback) > agora) return new Date(fallback).toISOString();
  const pagas = cobrancas
    .filter((item) => item.dueDate && ['CONFIRMED', 'RECEIVED'].includes(item.status || ''))
    .map((item) => new Date(`${item.dueDate}T23:59:59-03:00`))
    .sort((a, b) => b.getTime() - a.getTime());
  if (pagas[0]) { const fim = pagas[0]; fim.setMonth(fim.getMonth() + 1); return fim.toISOString(); }
  const seguranca = new Date();
  seguranca.setDate(seguranca.getDate() + 30);
  return seguranca.toISOString();
}

// Cancela a renovação do módulo, preservando o acesso até o fim pago.
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
    .select('id, status, gateway_subscription_id, valido_ate')
    .eq('empresa_id', empresaId).eq('modulo_id', moduloId).maybeSingle();
  if (!assinatura) return NextResponse.json({ erro: true, mensagem: 'Assinatura do módulo não encontrada.' }, { status: 404 });
  if (assinatura.status === 'cancelada') return NextResponse.json({ ok: true, jaCancelada: true, validoAte: assinatura.valido_ate });
  let cobrancas: Array<{ dueDate?: string; status?: string }> = [];
  if (assinatura.gateway_subscription_id) {
    const lista = await listarCobrancasAssinaturaAsaas(assinatura.gateway_subscription_id);
    if (lista.ok) cobrancas = lista.data?.data || [];
    const removida = await removerAssinaturaAsaas(assinatura.gateway_subscription_id);
    if (!removida.ok && removida.status !== 404) {
      return NextResponse.json({ erro: true, mensagem: removida.erro || 'Não foi possível cancelar a assinatura do módulo.' }, { status: 502 });
    }
  }
  const agora = new Date().toISOString();
  const validoAte = fimDoPeriodoPago(cobrancas, assinatura.valido_ate);
  const [assinaturaAtualizada, instalacaoAtualizada] = await Promise.all([
    acesso.db.from('assinaturas_modulos').update({ status: 'cancelada', valido_ate: validoAte, cancelamento_solicitado_em: agora, atualizado_em: agora }).eq('id', assinatura.id),
    acesso.db.from('empresa_modulos').update({ ativo: true, expira_em: validoAte, atualizado_em: agora }).eq('empresa_id', empresaId).eq('modulo_id', moduloId),
  ]);
  if (assinaturaAtualizada.error || instalacaoAtualizada.error) {
    return NextResponse.json({ erro: true, mensagem: 'A renovação foi cancelada, mas não foi possível registrar o período restante. Tente novamente.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, validoAte });
}
