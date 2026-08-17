import { NextResponse } from 'next/server';
import {
  atualizarAssinaturaAsaas,
  listarCobrancasAssinaturaAsaas,
  obterAssinaturaAsaas,
  removerAssinaturaAsaas,
  type CobrancaAssinaturaAsaas,
} from '../../../lib/asaas';
import { PRECOS, type Ciclo, type PlanoPago } from '../../../lib/cobranca';
import { calcularFimPeriodoPago } from '../../../lib/cobranca-fluxo';
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
  const { data: perfil } = await acesso.db
    .from('empresas')
    .select('assinatura_origem_empresa_id')
    .eq('id', empresaId)
    .maybeSingle();
  if (perfil?.assinatura_origem_empresa_id) {
    return NextResponse.json({
      ok: true,
      estado,
      assinatura: null,
      temAssinatura: false,
      valorContratado: null,
      proximoVencimento: null,
      faturas: [],
      viaCupom: false,
      podeGerenciar: false,
      origemAssinatura: 'perfil_compartilhado',
      perfilCompartilhado: true,
    });
  }
  const { data: local } = await acesso.db
    .from('assinaturas')
    .select('id, status, plano, ciclo, gateway_subscription_id, cupom_id')
    .eq('empresa_id', empresaId)
    .maybeSingle();
  const { data: assinaturaLoja } = await acesso.db
    .from('assinaturas_loja')
    .select('id, status, ciclo, valido_ate, produto_id, loja')
    .eq('user_id', acesso.usuario.id)
    .eq('loja', 'apple_app_store')
    .eq('entitlement_id', 'pessoal_premium')
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
  const temAssinaturaAsaas = Boolean(
    local?.gateway_subscription_id
    && STATUS_COM_ASSINATURA.has(local.status || ''),
  );
  const temAssinaturaApple = Boolean(
    estado?.tipoPerfil === 'pessoal'
    && assinaturaLoja
    && STATUS_COM_ASSINATURA.has(assinaturaLoja.status || ''),
  );
  const temAssinatura = temAssinaturaAsaas || temAssinaturaApple;
  const origemAssinatura = temAssinaturaApple && !temAssinaturaAsaas
    ? 'apple_app_store'
    : (temAssinaturaAsaas ? 'asaas' : null);
  if (origemAssinatura === 'apple_app_store') {
    assinatura = {
      id: assinaturaLoja?.id || null,
      status: assinaturaLoja?.status || null,
      valor: null,
      ciclo: assinaturaLoja?.ciclo === 'anual' ? 'YEARLY' : 'MONTHLY',
      proximoVencimento: assinaturaLoja?.valido_ate || null,
      formaPagamento: 'APP_STORE',
      produtoId: assinaturaLoja?.produto_id || null,
    };
  }
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
    origemAssinatura,
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

  const { data: perfil } = await acesso.db
    .from('empresas')
    .select('assinatura_origem_empresa_id')
    .eq('id', empresaId)
    .maybeSingle();
  if (perfil?.assinatura_origem_empresa_id) {
    return NextResponse.json({
      erro: true,
      mensagem: 'Este perfil utiliza uma assinatura compartilhada. Altere o plano no perfil assinante.',
    }, { status: 409 });
  }

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

  // O Business Pro já inclui todos os módulos. Antes de elevar a assinatura
  // principal, encerra renovações avulsas para que o cliente nunca seja cobrado
  // duas vezes pelo mesmo acesso.
  const modulosIncluidos: Array<{ id: string; modulo_id: string; gateway_subscription_id: string | null }> = [];
  if (planoAtual === 'business' && plano === 'business_pro') {
    const { data: assinaturasModulos, error: erroConsultaModulos } = await acesso.db
      .from('assinaturas_modulos')
      .select('id, modulo_id, gateway_subscription_id')
      .eq('empresa_id', empresaId)
      .in('status', ['expirada', 'ativa', 'inadimplente']);
    if (erroConsultaModulos) {
      return NextResponse.json({ erro: true, mensagem: 'Não foi possível conferir as assinaturas dos módulos.' }, { status: 500 });
    }
    modulosIncluidos.push(...(assinaturasModulos || []));
    for (const assinaturaModulo of modulosIncluidos) {
      if (!assinaturaModulo.gateway_subscription_id) continue;
      const removida = await removerAssinaturaAsaas(assinaturaModulo.gateway_subscription_id);
      if (!removida.ok && removida.status !== 404) {
        return NextResponse.json({
          erro: true,
          mensagem: 'Não foi possível encerrar uma cobrança de módulo. O plano não foi alterado para evitar cobrança duplicada.',
        }, { status: 502 });
      }
    }
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

  const { error: erroPersistencia } = await acesso.db.from('assinaturas').update({
    plano,
    ciclo,
    atualizado_em: new Date().toISOString(),
  }).eq('empresa_id', empresaId);
  if (erroPersistencia) {
    return NextResponse.json({
      erro: true,
      mensagem: 'A alteração foi enviada à cobrança, mas não pôde ser registrada. Tente novamente.',
    }, { status: 500 });
  }

  if (modulosIncluidos.length) {
    const agora = new Date().toISOString();
    const ids = modulosIncluidos.map((item) => item.id);
    const modulosIds = modulosIncluidos.map((item) => item.modulo_id);
    const [assinaturasAtualizadas, instalacoesAtualizadas] = await Promise.all([
      acesso.db.from('assinaturas_modulos').update({
        status: 'cancelada',
        valido_ate: null,
        cancelamento_solicitado_em: agora,
        atualizado_em: agora,
      }).in('id', ids),
      acesso.db.from('empresa_modulos').update({
        ativo: true,
        origem: 'plano_business_pro',
        expira_em: null,
        atualizado_em: agora,
      }).eq('empresa_id', empresaId).in('modulo_id', modulosIds),
    ]);
    if (assinaturasAtualizadas.error || instalacoesAtualizadas.error) {
      return NextResponse.json({
        ok: true,
        ciclo,
        plano,
        aviso: 'O plano foi alterado e as cobranças avulsas foram encerradas, mas a identificação local dos módulos será conciliada automaticamente.',
      });
    }
  }
  return NextResponse.json({ ok: true, ciclo, plano });
}

export async function DELETE(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  if (!empresaId) return NextResponse.json({ erro: true, mensagem: 'Perfil inválido.' }, { status: 400 });
  const acesso = await autenticarPerfilCobranca(request, empresaId, true);
  if (!acesso) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });

  const { data: perfil } = await acesso.db
    .from('empresas')
    .select('assinatura_origem_empresa_id')
    .eq('id', empresaId)
    .maybeSingle();
  if (perfil?.assinatura_origem_empresa_id) {
    return NextResponse.json({
      erro: true,
      mensagem: 'Este perfil utiliza uma assinatura compartilhada. Cancele somente pelo perfil assinante.',
    }, { status: 409 });
  }

  const { data: local } = await acesso.db
    .from('assinaturas')
    .select('status, ciclo, trial_fim, valido_ate, gateway_subscription_id')
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (!local) return NextResponse.json({ erro: true, mensagem: 'Assinatura não encontrada.' }, { status: 404 });
  if (local.status === 'cancelada') return NextResponse.json({ ok: true, jaCancelada: true });
  if (!local.gateway_subscription_id) {
    return NextResponse.json({ erro: true, mensagem: 'Não existe uma renovação paga para cancelar.' }, { status: 409 });
  }

  let acessoAte: string | null = null;
  if (local.gateway_subscription_id) {
    const cobrancas = await listarCobrancasAssinaturaAsaas(local.gateway_subscription_id);
    const preservarPeriodoPago = ['ativa', 'inadimplente'].includes(local.status);
    if (preservarPeriodoPago && !cobrancas.ok) {
      return NextResponse.json({
        erro: true,
        mensagem: 'Não foi possível confirmar o período já pago. Nenhum cancelamento foi realizado.',
      }, { status: 502 });
    }
    if (preservarPeriodoPago) {
      acessoAte = calcularFimPeriodoPago(
        cobrancas.data?.data || [],
        local.ciclo === 'anual' ? 'anual' : 'mensal',
        local.valido_ate,
      );
    }

    const removida = await removerAssinaturaAsaas(local.gateway_subscription_id);
    if (!removida.ok && removida.status !== 404) {
      return NextResponse.json({ erro: true, mensagem: removida.erro || 'Não foi possível cancelar a assinatura.' }, { status: 502 });
    }
  }

  const trialVigente = local.status === 'trial'
    && !!local.trial_fim
    && new Date(local.trial_fim) > new Date();
  const { error: erroPersistencia } = await acesso.db.from('assinaturas').update({
    status: trialVigente ? 'trial' : 'cancelada',
    valido_ate: trialVigente ? null : acessoAte || new Date().toISOString(),
    ...(trialVigente ? { gateway_subscription_id: null } : {}),
    atualizado_em: new Date().toISOString(),
  }).eq('empresa_id', empresaId);
  if (erroPersistencia) {
    return NextResponse.json({
      erro: true,
      mensagem: 'A renovação foi cancelada, mas o estado local não pôde ser atualizado. Tente novamente.',
    }, { status: 500 });
  }
  return NextResponse.json({ ok: true, acessoAte: trialVigente ? local.trial_fim : acessoAte, trialPreservado: trialVigente });
}
