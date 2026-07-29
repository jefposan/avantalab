import { NextResponse } from 'next/server';
import {
  atualizarAssinaturaAsaas,
  listarCobrancasAssinaturaAsaas,
  obterAssinaturaAsaas,
  removerAssinaturaAsaas,
  type CobrancaAssinaturaAsaas,
} from '../../../lib/asaas';
import { PRECOS, type Ciclo, type PlanoPago } from '../../../lib/cobranca';
import { normalizarPlanoComercial } from '../../../lib/planos-comerciais';
import { autenticarPerfilCobranca, resolverEstadoAcessoParaUsuario } from '../../../lib/cobranca-servidor';

export const runtime = 'nodejs';
const STATUS_COM_ASSINATURA = new Set(['ativa', 'inadimplente', 'cancelada']);

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
    .select('id, status, plano, ciclo, gateway_subscription_id, cupom_id')
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
    const faturasGateway = cobrancasGw.data?.data || [];
    if (cobrancasGw.ok && faturasGateway.length > 0) {
      faturas = faturasGateway
        .map(faturaPublica)
        .sort((a, b) => String(b.vencimento || '').localeCompare(String(a.vencimento || '')))
        .slice(0, 12);
    }
  }

  // Um registro de acesso (trial, cortesia ou cupom) não é necessariamente uma
  // assinatura contratada. O app usa esta sinalização para não misturar
  // benefícios gratuitos com valor, renovação e histórico financeiro.
  const temAssinatura = Boolean(
    local?.gateway_subscription_id
    && STATUS_COM_ASSINATURA.has(estado?.status || local.status || ''),
  );
  const faturasDaAssinatura = temAssinatura ? faturas : [];
  const valorGateway = Number(assinatura?.valor || 0);
  const valorFatura = Number(
    faturasDaAssinatura.find((item) => Number(item.valor || 0) > 0)?.valor || 0,
  );
  const planoLocal = normalizarPlanoComercial(local?.plano) as Exclude<PlanoPago, 'empresa'> | null;
  const cicloLocal: Ciclo | null = local?.ciclo === 'mensal'
    ? 'mensal'
    : (local?.ciclo === 'anual' ? 'anual' : null);
  const valorPlano = planoLocal !== null && cicloLocal !== null
    ? PRECOS[planoLocal][cicloLocal]
    : 0;
  const valorContratado = temAssinatura && (valorGateway > 0 || valorFatura > 0 || valorPlano > 0)
    ? (valorGateway > 0 ? valorGateway : (valorFatura > 0 ? valorFatura : valorPlano))
    : null;
  const proximoVencimento = temAssinatura && estado?.status !== 'cancelada'
    ? (
        assinatura?.proximoVencimento
        || faturasDaAssinatura.find((item) => ['PENDING', 'OVERDUE'].includes(item.status))?.vencimento
        || null
      )
    : null;

  // Cortesia vinda de cupom (cupom_id preenchido) é exibida como "Cupom" nas telas.
  const viaCupom = Boolean(local?.cupom_id) && estado?.status === 'cortesia';
  return NextResponse.json({
    ok: true,
    estado,
    assinatura,
    temAssinatura,
    valorContratado,
    proximoVencimento,
    faturas: faturasDaAssinatura,
    viaCupom,
    podeGerenciar: acesso.podeGerenciar,
  });
}

export async function PATCH(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const ciclo = String(corpo.ciclo || '') as Ciclo;
  const planoSolicitado = String(corpo.plano || '').trim();
  if (!empresaId || !['mensal', 'anual'].includes(ciclo)) {
    return NextResponse.json({ erro: true, mensagem: 'Dados inválidos.' }, { status: 400 });
  }
  const acesso = await autenticarPerfilCobranca(request, empresaId, true);
  if (!acesso) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });

  const { data: local } = await acesso.db
    .from('assinaturas')
    .select('status, plano, gateway_subscription_id')
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (!local?.gateway_subscription_id || local.status === 'cancelada') {
    return NextResponse.json({ erro: true, mensagem: 'Não existe uma assinatura ativa para alterar.' }, { status: 409 });
  }
  const planoNormalizado = normalizarPlanoComercial(local.plano);
  const planoAtual: PlanoPago = planoNormalizado === 'pessoal_premium' || planoNormalizado === 'business' || planoNormalizado === 'business_pro'
    ? planoNormalizado
    : 'business';
  let plano: PlanoPago = planoAtual;

  // A troca de plano por aqui é deliberadamente unidirecional: Business pode
  // subir para Business Pro sem cancelar a assinatura atual. Reduções exigem
  // uma revisão dos módulos já instalados e não devem acontecer por engano.
  if (planoSolicitado) {
    if (planoSolicitado !== 'business_pro' || planoAtual !== 'business') {
      return NextResponse.json({ erro: true, mensagem: 'Esta alteração de plano não está disponível.' }, { status: 409 });
    }
    const estado = await resolverEstadoAcessoParaUsuario(empresaId, acesso.usuario.id);
    if (estado?.tipoPerfil !== 'empresa') {
      return NextResponse.json({ erro: true, mensagem: 'Business Pro está disponível apenas para perfis empresariais.' }, { status: 403 });
    }
    plano = 'business_pro';
  }

  const atualizada = await atualizarAssinaturaAsaas(local.gateway_subscription_id, {
    value: PRECOS[plano][ciclo],
    cycle: ciclo === 'anual' ? 'YEARLY' : 'MONTHLY',
    description: `AvantaLab — ${plano} (${ciclo})`,
    // A alteração comercial é imediata: a cobrança pendente acompanha o
    // plano escolhido, evitando liberar Business Pro com uma fatura Business.
    updatePendingPayments: true,
  });
  if (!atualizada.ok) {
    return NextResponse.json({ erro: true, mensagem: atualizada.erro || 'Não foi possível alterar o plano.' }, { status: 502 });
  }

  await acesso.db.from('assinaturas').update({
    plano,
    ciclo,
    atualizado_em: new Date().toISOString(),
  }).eq('empresa_id', empresaId);
  return NextResponse.json({ ok: true, ciclo, plano });
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
