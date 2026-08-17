import { NextResponse } from 'next/server';
import { listarCobrancasAssinaturaAsaas, removerAssinaturaAsaas } from '../../../../lib/asaas';
import { autenticarPerfilCobranca, resolverEstadoAcesso } from '../../../../lib/cobranca-servidor';
import { calcularFimPeriodoPago } from '../../../../lib/cobranca-fluxo';
import { normalizarPlanoComercial } from '../../../../lib/planos-comerciais';

export const runtime = 'nodejs';

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
    if (!lista.ok && ['ativa', 'inadimplente'].includes(assinatura.status)) {
      return NextResponse.json({
        erro: true,
        mensagem: 'Não foi possível confirmar o período pago. Nenhum cancelamento foi realizado.',
      }, { status: 502 });
    }
    if (lista.ok) cobrancas = lista.data?.data || [];
    const removida = await removerAssinaturaAsaas(assinatura.gateway_subscription_id);
    if (!removida.ok && removida.status !== 404) {
      return NextResponse.json({ erro: true, mensagem: removida.erro || 'Não foi possível cancelar a assinatura do módulo.' }, { status: 502 });
    }
  }
  const agora = new Date().toISOString();
  const validoAte = calcularFimPeriodoPago(cobrancas, 'mensal', assinatura.valido_ate);
  const manterAtivo = Boolean(validoAte && new Date(validoAte) > new Date());
  const [assinaturaAtualizada, instalacaoAtualizada] = await Promise.all([
    acesso.db.from('assinaturas_modulos').update({ status: 'cancelada', valido_ate: validoAte || agora, cancelamento_solicitado_em: agora, atualizado_em: agora }).eq('id', assinatura.id),
    acesso.db.from('empresa_modulos').update({ ativo: manterAtivo, expira_em: manterAtivo ? validoAte : null, atualizado_em: agora }).eq('empresa_id', empresaId).eq('modulo_id', moduloId),
  ]);
  if (assinaturaAtualizada.error || instalacaoAtualizada.error) {
    return NextResponse.json({ erro: true, mensagem: 'A renovação foi cancelada, mas não foi possível registrar o período restante. Tente novamente.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, validoAte: validoAte || null });
}
