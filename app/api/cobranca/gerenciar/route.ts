import { NextResponse } from 'next/server';
import {
  atualizarAssinaturaAsaas,
  listarCobrancasAssinaturaAsaas,
  obterAssinaturaAsaas,
  removerAssinaturaAsaas,
  type CobrancaAssinaturaAsaas,
} from '../../../lib/asaas';
import { PRECOS, type Ciclo, type PlanoPago } from '../../../lib/cobranca';
import { autenticarPerfilCobranca, resolverEstadoAcessoParaUsuario } from '../../../lib/cobranca-servidor';

export const runtime = 'nodejs';

function empresaIdDaRequest(request: Request): string {
  return (new URL(request.url).searchParams.get('empresaId') || '').trim();
}

function faturaPublica(item: CobrancaAssinaturaAsaas) {
  return {
    id: item.id,
    status: item.status || 'UNKNOWN',
    valor: Number(item.value || 0),
    vencimento: item.dueDate || null,
    pagamentoEm: item.paymentDate || item.confirmedDate || null,
    formaPagamento: item.billingType || null,
    invoiceUrl: item.invoiceUrl || null,
  };
}

export async function GET(request: Request) {
  const empresaId = empresaIdDaRequest(request);
  const acesso = await autenticarPerfilCobranca(request, empresaId);
  if (!acesso) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });

  const estado = await resolverEstadoAcessoParaUsuario(empresaId, acesso.usuario.id);
  const { data: local } = await acesso.db
    .from('assinaturas')
    .select('id, gateway_subscription_id, cupom_id')
    .eq('empresa_id', empresaId)
    .maybeSingle();

  let assinatura = null;
  let faturas: ReturnType<typeof faturaPublica>[] = [];
  const { data: faturasLocais } = await acesso.db
    .from('assinatura_faturas')
    .select('gateway_payment_id, status, valor, vencimento, pagamento_em, forma_pagamento, invoice_url')
    .eq('empresa_id', empresaId)
    .order('vencimento', { ascending: false })
    .limit(12);
  faturas = (faturasLocais || []).map((item) => ({
    id: item.gateway_payment_id,
    status: item.status,
    valor: Number(item.valor || 0),
    vencimento: item.vencimento,
    pagamentoEm: item.pagamento_em,
    formaPagamento: item.forma_pagamento,
    invoiceUrl: item.invoice_url,
  }));
  if (local?.gateway_subscription_id) {
    const [assinaturaGw, cobrancasGw] = await Promise.all([
      obterAssinaturaAsaas(local.gateway_subscription_id),
      listarCobrancasAssinaturaAsaas(local.gateway_subscription_id),
    ]);
    if (assinaturaGw.ok && assinaturaGw.data) {
      assinatura = {
        id: assinaturaGw.data.id,
        status: assinaturaGw.data.status || null,
        valor: Number(assinaturaGw.data.value || 0),
        ciclo: assinaturaGw.data.cycle || null,
        proximoVencimento: assinaturaGw.data.nextDueDate || null,
        formaPagamento: assinaturaGw.data.billingType || null,
      };
    }
    if (cobrancasGw.ok) {
      faturas = (cobrancasGw.data?.data || [])
        .map(faturaPublica)
        .sort((a, b) => String(b.vencimento || '').localeCompare(String(a.vencimento || '')))
        .slice(0, 12);
    }
  }

  // Cortesia vinda de cupom (cupom_id preenchido) é exibida como "Cupom" nas telas.
  const viaCupom = Boolean(local?.cupom_id) && estado?.status === 'cortesia';
  return NextResponse.json({ ok: true, estado, assinatura, faturas, viaCupom, podeGerenciar: acesso.podeGerenciar });
}

export async function PATCH(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const ciclo = String(corpo.ciclo || '') as Ciclo;
  if (!empresaId || !['mensal', 'anual'].includes(ciclo)) {
    return NextResponse.json({ erro: true, mensagem: 'Dados inválidos.' }, { status: 400 });
  }
  const acesso = await autenticarPerfilCobranca(request, empresaId, true);
  if (!acesso) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });

  const { data: empresa } = await acesso.db.from('empresas').select('tipo_perfil').eq('id', empresaId).maybeSingle();
  const plano: PlanoPago = empresa?.tipo_perfil === 'pessoal' ? 'pessoal_premium' : 'empresa';
  const { data: local } = await acesso.db
    .from('assinaturas')
    .select('status, gateway_subscription_id')
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (!local?.gateway_subscription_id || local.status === 'cancelada') {
    return NextResponse.json({ erro: true, mensagem: 'Não existe uma assinatura ativa para alterar.' }, { status: 409 });
  }

  const atualizada = await atualizarAssinaturaAsaas(local.gateway_subscription_id, {
    value: PRECOS[plano][ciclo],
    cycle: ciclo === 'anual' ? 'YEARLY' : 'MONTHLY',
    description: `AvantaLab — ${plano} (${ciclo})`,
    updatePendingPayments: false,
  });
  if (!atualizada.ok) {
    return NextResponse.json({ erro: true, mensagem: atualizada.erro || 'Não foi possível alterar o plano.' }, { status: 502 });
  }

  await acesso.db.from('assinaturas').update({
    plano,
    ciclo,
    atualizado_em: new Date().toISOString(),
  }).eq('empresa_id', empresaId);
  return NextResponse.json({ ok: true, ciclo });
}

export async function DELETE(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  if (!empresaId) return NextResponse.json({ erro: true, mensagem: 'Perfil inválido.' }, { status: 400 });
  const acesso = await autenticarPerfilCobranca(request, empresaId, true);
  if (!acesso) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });

  const { data: local } = await acesso.db
    .from('assinaturas')
    .select('status, ciclo, gateway_subscription_id')
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (!local) return NextResponse.json({ erro: true, mensagem: 'Assinatura não encontrada.' }, { status: 404 });
  if (local.status === 'cancelada') return NextResponse.json({ ok: true, jaCancelada: true });

  let acessoAte: string | null = null;
  if (local.gateway_subscription_id) {
    const cobrancas = await listarCobrancasAssinaturaAsaas(local.gateway_subscription_id);
    const preservarPeriodoPago = ['ativa', 'inadimplente'].includes(local.status);
    if (preservarPeriodoPago && cobrancas.ok) {
      const paga = (cobrancas.data?.data || [])
        .filter((item) => ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(item.status || '') && item.dueDate)
        .sort((a, b) => String(b.dueDate).localeCompare(String(a.dueDate)))[0];
      if (paga?.dueDate) {
        const fim = new Date(`${paga.dueDate}T23:59:59-03:00`);
        if (local.ciclo === 'anual') fim.setFullYear(fim.getFullYear() + 1);
        else fim.setMonth(fim.getMonth() + 1);
        if (fim > new Date()) acessoAte = fim.toISOString();
      }
    }

    const removida = await removerAssinaturaAsaas(local.gateway_subscription_id);
    if (!removida.ok && removida.status !== 404) {
      return NextResponse.json({ erro: true, mensagem: removida.erro || 'Não foi possível cancelar a assinatura.' }, { status: 502 });
    }
  }

  await acesso.db.from('assinaturas').update({
    status: 'cancelada',
    valido_ate: acessoAte || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  }).eq('empresa_id', empresaId);
  return NextResponse.json({ ok: true, acessoAte });
}
