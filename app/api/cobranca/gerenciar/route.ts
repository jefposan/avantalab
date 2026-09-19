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
import { normalizarPlanoComercial, PLANOS_COMERCIAIS } from '../../../lib/planos-comerciais';
import { criarReferenciaAssinatura } from '../../../lib/cobranca-referencia';
import { autenticarPerfilCobranca, resolverEstadoAcessoParaUsuario } from '../../../lib/cobranca-servidor';
import {
  classificarAlteracaoAssinatura,
  ehCicloComercial,
  ehPlanoEmpresarial,
} from '../../../lib/assinatura-transicoes';

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
    const cortesiaCompartilhada = estado?.status === 'cortesia';
    return NextResponse.json({
      ok: true,
      estado,
      assinatura: null,
      temAssinatura: false,
      valorContratado: null,
      proximoVencimento: null,
      faturas: [],
      viaCupom: false,
      podeGerenciar: acesso.podeGerenciar,
      podeCriarAssinaturaPropria: acesso.podeGerenciar && !cortesiaCompartilhada,
      origemAssinatura: 'perfil_compartilhado',
      perfilCompartilhado: true,
      cortesiaCompartilhada,
    });
  }
  const { data: local } = await acesso.db
    .from('assinaturas')
    .select('id, status, plano, ciclo, gateway_subscription_id, cupom_id, plano_agendado, ciclo_agendado, alteracao_agendada_para')
    .eq('empresa_id', empresaId)
    .maybeSingle();
  const { data: assinaturasLoja } = await acesso.db
    .from('assinaturas_loja')
    .select('id, status, ciclo, valido_ate, produto_id, loja')
    .eq('user_id', acesso.usuario.id)
    .in('loja', ['apple_app_store', 'google_play'])
    .eq('entitlement_id', 'pessoal_premium')
    .order('atualizado_em', { ascending: false });
  const assinaturaLoja = (assinaturasLoja || []).find((item) => STATUS_COM_ASSINATURA.has(item.status || '')) || null;

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
    if (!assinaturaGw.ok || !cobrancasGw.ok) {
      console.warn('[cobranca/gerenciar] Falha ao consultar assinatura no gateway', {
        assinaturaStatus: assinaturaGw.status,
        assinaturaErro: assinaturaGw.erro,
        cobrancasStatus: cobrancasGw.status,
        cobrancasErro: cobrancasGw.erro,
      });
    }
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
  const temAssinaturaLoja = Boolean(
    estado?.tipoPerfil === 'pessoal'
    && assinaturaLoja
    && STATUS_COM_ASSINATURA.has(assinaturaLoja.status || ''),
  );
  const temAssinatura = temAssinaturaAsaas || temAssinaturaLoja;
  const origemAssinatura = temAssinaturaLoja && !temAssinaturaAsaas
    ? assinaturaLoja?.loja || null
    : (temAssinaturaAsaas ? 'asaas' : null);
  if (origemAssinatura === 'apple_app_store' || origemAssinatura === 'google_play') {
    assinatura = {
      id: assinaturaLoja?.id || null,
      status: assinaturaLoja?.status || null,
      valor: null,
      ciclo: assinaturaLoja?.ciclo === 'anual' ? 'YEARLY' : 'MONTHLY',
      proximoVencimento: assinaturaLoja?.valido_ate || null,
      formaPagamento: origemAssinatura === 'google_play' ? 'GOOGLE_PLAY' : 'APP_STORE',
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
  const temAlteracaoAgendada = Boolean(local?.plano_agendado && local?.ciclo_agendado && local?.alteracao_agendada_para);
  const valorContratado = temAssinatura && (valorGateway > 0 || valorFatura > 0 || valorPlano > 0)
    ? (temAlteracaoAgendada && valorPlano > 0 ? valorPlano : (valorGateway > 0 ? valorGateway : (valorFatura > 0 ? valorFatura : valorPlano)))
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
    alteracaoAgendada: local?.plano_agendado && local?.ciclo_agendado && local?.alteracao_agendada_para
      ? {
          plano: local.plano_agendado,
          ciclo: local.ciclo_agendado,
          efetivaEm: local.alteracao_agendada_para,
          valor: PRECOS[local.plano_agendado as Exclude<PlanoPago, 'empresa'>]?.[local.ciclo_agendado as Ciclo] ?? null,
        }
      : null,
  });
}

export async function PATCH(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const cicloSolicitadoBruto = String(corpo.ciclo || '').trim();
  const planoSolicitado = String(corpo.plano || '').trim();
  const cancelarAlteracaoAgendada = corpo.cancelarAlteracaoAgendada === true;
  if (!empresaId || (!cancelarAlteracaoAgendada && !ehCicloComercial(cicloSolicitadoBruto))) {
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
    .select('status, plano, ciclo, valido_ate, gateway_subscription_id, plano_agendado, ciclo_agendado, alteracao_agendada_para')
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (!local?.gateway_subscription_id || local.status === 'cancelada') {
    return NextResponse.json({ erro: true, mensagem: 'Não existe uma assinatura ativa para alterar.' }, { status: 409 });
  }
  const planoNormalizado = normalizarPlanoComercial(local.plano);
  const planoAtual: PlanoPago = planoNormalizado === 'pessoal_premium' || planoNormalizado === 'business' || planoNormalizado === 'business_pro' || planoNormalizado === 'business_premium'
    ? planoNormalizado
    : 'business';
  const cicloAtual: Ciclo = local.ciclo === 'anual' ? 'anual' : 'mensal';

  if (cancelarAlteracaoAgendada) {
    if (!local.plano_agendado) return NextResponse.json({ ok: true, jaCancelada: true });
    const restaurada = await atualizarAssinaturaAsaas(local.gateway_subscription_id, {
      value: PRECOS[planoAtual][cicloAtual],
      cycle: cicloAtual === 'anual' ? 'YEARLY' : 'MONTHLY',
      description: `AvantaLab — ${PLANOS_COMERCIAIS[planoAtual].nome} (${cicloAtual})`,
      externalReference: criarReferenciaAssinatura({
        empresaId,
        plano: planoAtual as Exclude<PlanoPago, 'empresa'>,
        ciclo: cicloAtual,
      }),
      updatePendingPayments: true,
    });
    if (!restaurada.ok) {
      return NextResponse.json({ erro: true, mensagem: restaurada.erro || 'Não foi possível cancelar a alteração agendada.' }, { status: 502 });
    }
    const { error } = await acesso.db.from('assinaturas').update({
      plano_agendado: null,
      ciclo_agendado: null,
      alteracao_agendada_para: null,
      alteracao_agendada_em: null,
      atualizado_em: new Date().toISOString(),
    }).eq('empresa_id', empresaId);
    if (error) {
      return NextResponse.json({ erro: true, mensagem: 'A cobrança foi restaurada, mas o agendamento local não pôde ser removido.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, alteracaoAgendadaCancelada: true });
  }

  const ciclo = cicloSolicitadoBruto as Ciclo;
  const plano = planoSolicitado || planoAtual;
  const estado = await resolverEstadoAcessoParaUsuario(empresaId, acesso.usuario.id);
  if (estado?.tipoPerfil === 'empresa' && !ehPlanoEmpresarial(plano)) {
    return NextResponse.json({ erro: true, mensagem: 'Plano empresarial inválido.' }, { status: 400 });
  }
  if (estado?.tipoPerfil !== 'empresa' && plano !== 'pessoal_premium') {
    return NextResponse.json({ erro: true, mensagem: 'Este plano está disponível apenas para perfis empresariais.' }, { status: 403 });
  }

  // A assinatura pessoal ainda não troca de nível. Sua mudança de ciclo
  // preserva o comportamento já existente, sem afetar a matriz Business.
  const tipoAlteracao = ehPlanoEmpresarial(planoAtual) && ehPlanoEmpresarial(plano)
    ? classificarAlteracaoAssinatura({
        planoAtual,
        cicloAtual,
        planoSolicitado: plano,
        cicloSolicitado: ciclo,
      })
    : (plano === planoAtual && ciclo === cicloAtual ? 'sem_alteracao' : 'upgrade_imediato');

  if (tipoAlteracao === 'sem_alteracao') {
    return NextResponse.json({ ok: true, plano: planoAtual, ciclo: cicloAtual, semAlteracao: true });
  }

  if (tipoAlteracao === 'alteracao_agendada') {
    const cobrancas = await listarCobrancasAssinaturaAsaas(local.gateway_subscription_id);
    if (!cobrancas.ok) {
      return NextResponse.json({
        erro: true,
        mensagem: 'Não foi possível confirmar o período já pago. Nenhuma alteração foi realizada.',
      }, { status: 502 });
    }
    const efetivaEm = calcularFimPeriodoPago(
      cobrancas.data?.data || [],
      cicloAtual,
      local.valido_ate,
    );
    if (!efetivaEm) {
      return NextResponse.json({
        erro: true,
        mensagem: 'Não foi possível identificar a validade atual. A assinatura permaneceu sem alterações.',
      }, { status: 409 });
    }
    const atualizada = await atualizarAssinaturaAsaas(local.gateway_subscription_id, {
      value: PRECOS[plano as PlanoPago][ciclo],
      cycle: ciclo === 'anual' ? 'YEARLY' : 'MONTHLY',
      description: `AvantaLab — ${PLANOS_COMERCIAIS[plano as keyof typeof PLANOS_COMERCIAIS].nome} (${ciclo})`,
      externalReference: criarReferenciaAssinatura({
        empresaId,
        plano: plano as Exclude<PlanoPago, 'empresa'>,
        ciclo,
      }),
      updatePendingPayments: true,
    });
    if (!atualizada.ok) {
      return NextResponse.json({ erro: true, mensagem: atualizada.erro || 'Não foi possível agendar a alteração.' }, { status: 502 });
    }
    const agora = new Date().toISOString();
    const { error } = await acesso.db.from('assinaturas').update({
      plano_agendado: plano,
      ciclo_agendado: ciclo,
      alteracao_agendada_para: efetivaEm,
      alteracao_agendada_em: agora,
      atualizado_em: agora,
    }).eq('empresa_id', empresaId);
    if (error) {
      await atualizarAssinaturaAsaas(local.gateway_subscription_id, {
        value: PRECOS[planoAtual][cicloAtual],
        cycle: cicloAtual === 'anual' ? 'YEARLY' : 'MONTHLY',
        description: `AvantaLab — ${PLANOS_COMERCIAIS[planoAtual].nome} (${cicloAtual})`,
        externalReference: criarReferenciaAssinatura({
          empresaId,
          plano: planoAtual as Exclude<PlanoPago, 'empresa'>,
          ciclo: cicloAtual,
        }),
        updatePendingPayments: true,
      });
      return NextResponse.json({ erro: true, mensagem: 'Não foi possível registrar o agendamento. A cobrança anterior foi restaurada.' }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      agendada: true,
      efetivaEm,
      planoAtual,
      cicloAtual,
      planoAgendado: plano,
      cicloAgendado: ciclo,
      mensagem: `Alteração agendada para ${new Date(efetivaEm).toLocaleDateString('pt-BR')}. Até lá, o plano atual permanece disponível.`,
    });
  }

  // Business Pro e Premium incluem todos os módulos. Antes de elevar a
  // assinatura principal, encerra renovações avulsas para não cobrar duas vezes.
  const modulosIncluidos: Array<{ id: string; modulo_id: string; gateway_subscription_id: string | null }> = [];
  if (planoAtual === 'business' && (plano === 'business_pro' || plano === 'business_premium')) {
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
    value: PRECOS[plano as PlanoPago][ciclo],
    cycle: ciclo === 'anual' ? 'YEARLY' : 'MONTHLY',
    description: `AvantaLab — ${PLANOS_COMERCIAIS[plano as keyof typeof PLANOS_COMERCIAIS].nome} (${ciclo})`,
    externalReference: criarReferenciaAssinatura({
      empresaId,
      plano: plano as Exclude<PlanoPago, 'empresa'>,
      ciclo,
    }),
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
    plano_agendado: null,
    ciclo_agendado: null,
    alteracao_agendada_para: null,
    alteracao_agendada_em: null,
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
    plano_agendado: null,
    ciclo_agendado: null,
    alteracao_agendada_para: null,
    alteracao_agendada_em: null,
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
