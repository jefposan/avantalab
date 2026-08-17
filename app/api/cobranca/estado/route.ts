import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolverEstadoAcessoParaUsuario } from '../../../lib/cobranca-servidor';
import { precisaPaywallEmpresa, precisaUpgradePessoal, PRECOS } from '../../../lib/cobranca';
import { listarCobrancasAssinaturaAsaas, obterAssinaturaAsaas } from '../../../lib/asaas';
import { calcularFimCarencia, calcularFimPeriodoPago, STATUS_FATURA_PAGA, STATUS_FATURA_PAGAVEL } from '../../../lib/cobranca-fluxo';

export const runtime = 'nodejs';

// Informa ao app o estado de acesso (trial/ativa/expirada...) de um perfil.
// Exige usuário autenticado e vínculo ativo na Gestão ou no Vendas.
export async function GET(request: Request) {
  const empresaId = (new URL(request.url).searchParams.get('empresaId') || '').trim();
  if (!empresaId) {
    return NextResponse.json({ erro: true, mensagem: 'empresaId ausente' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !anonKey || !serviceRole) {
    return NextResponse.json({ erro: true }, { status: 500 });
  }

  // 1) Autentica o usuário pelo token da sessão.
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return NextResponse.json({ erro: true }, { status: 401 });

  let userId = '';
  try {
    const sb = createClient(supabaseUrl, anonKey);
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return NextResponse.json({ erro: true }, { status: 401 });
    userId = data.user.id;
  } catch {
    return NextResponse.json({ erro: true }, { status: 401 });
  }

  // 2) Confirma que o usuário pertence ao perfil pela Gestão ou possui acesso
  // ativo ao Vendas. A segunda opção permite que o próprio AvantaVendas
  // consulte a assinatura sem ampliar o acesso a outros perfis.
  const admin = createClient(supabaseUrl, serviceRole);
  const [{ data: vinculoGestao }, { data: vinculoVendas }] = await Promise.all([
    admin
      .from('usuarios_empresa')
      .select('id')
      .eq('user_id', userId)
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo')
      .limit(1)
      .maybeSingle(),
    admin
      .from('vendas_mobile_acessos')
      .select('id')
      .eq('user_id', userId)
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo')
      .limit(1)
      .maybeSingle(),
  ]);
  if (!vinculoGestao && !vinculoVendas) {
    return NextResponse.json({ erro: true, mensagem: 'sem acesso a este perfil' }, { status: 403 });
  }

  let faturaPendente: { invoiceUrl: string; valor: number | null; vencimento: string | null; status: string | null } | null = null;
  const { data: assinatura } = await admin
    .from('assinaturas')
    .select('id, gateway_subscription_id, status, ciclo, trial_fim, valido_ate')
    .eq('empresa_id', empresaId)
    .maybeSingle();

  if (assinatura?.gateway_subscription_id) {
    let assinaturaAtivaAposConciliacao = assinatura.status === 'ativa';
    const [assinaturaGw, cobrancas] = await Promise.all([
      obterAssinaturaAsaas(assinatura.gateway_subscription_id),
      listarCobrancasAssinaturaAsaas(assinatura.gateway_subscription_id),
    ]);
    const pagamentos = cobrancas.ok ? (cobrancas.data?.data || []) : [];

    for (const pagamento of pagamentos) {
      if (!pagamento?.id) continue;
      await admin.from('assinatura_faturas').upsert({
        empresa_id: empresaId,
        assinatura_id: assinatura.id,
        gateway_payment_id: pagamento.id,
        gateway_subscription_id: assinatura.gateway_subscription_id,
        status: pagamento.status || 'UNKNOWN',
        valor: Number(pagamento.value || 0),
        vencimento: pagamento.dueDate || null,
        pagamento_em: pagamento.paymentDate || pagamento.confirmedDate || null,
        forma_pagamento: pagamento.billingType || null,
        invoice_url: pagamento.invoiceUrl || null,
        payload: pagamento,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'gateway_payment_id' });
    }

    if (assinatura.status !== 'cortesia' && assinatura.status !== 'cancelada') {
      const temPaga = pagamentos.some((item) => STATUS_FATURA_PAGA.has(item.status || ''));
      const temVencida = pagamentos.some((item) => item.status === 'OVERDUE');
      let novoStatus: string | null = null;
      let validoAte: string | null = assinatura.valido_ate || null;
      let limparCheckoutTrial = false;
      const assinaturaRemotaEncerrada = assinaturaGw.status === 404
        || (assinaturaGw.ok && (assinaturaGw.data?.status === 'INACTIVE' || assinaturaGw.data?.status === 'EXPIRED'));
      if (assinaturaRemotaEncerrada) {
        const trialVigente = assinatura.status === 'trial'
          && !!assinatura.trial_fim
          && new Date(assinatura.trial_fim) > new Date();
        novoStatus = trialVigente ? 'trial' : 'cancelada';
        validoAte = trialVigente
          ? null
          : calcularFimPeriodoPago(
            pagamentos,
            assinatura.ciclo === 'anual' ? 'anual' : 'mensal',
            assinatura.valido_ate,
          ) || new Date().toISOString();
        limparCheckoutTrial = trialVigente;
      } else if (temVencida) {
        novoStatus = 'inadimplente';
        if (assinatura.status !== 'inadimplente' || !assinatura.valido_ate) {
          validoAte = calcularFimCarencia(new Date(), assinatura.trial_fim);
        }
      } else if (temPaga) {
        novoStatus = 'ativa';
        validoAte = null;
      }
      const ciclo = assinaturaGw.ok && assinaturaGw.data?.cycle === 'YEARLY'
        ? 'anual'
        : assinaturaGw.ok && assinaturaGw.data?.cycle === 'MONTHLY'
          ? 'mensal'
          : null;
      if (novoStatus === 'ativa') {
        const { data: ativacao, error: erroAtivacao } = await admin.rpc('ativar_assinatura_propria_perfil', {
          p_empresa_id: empresaId,
          p_gateway_subscription_id: assinatura.gateway_subscription_id,
          p_ciclo: ciclo,
        });
        if (erroAtivacao || ativacao?.ok === false) {
          console.error('Erro ao ativar assinatura própria:', erroAtivacao?.message || ativacao?.codigo);
          assinaturaAtivaAposConciliacao = false;
        } else {
          assinaturaAtivaAposConciliacao = true;
        }
      } else if (novoStatus || ciclo) {
        const { error: erroAtualizacao } = await admin.from('assinaturas').update({
          ...(novoStatus ? { status: novoStatus, valido_ate: validoAte } : {}),
          ...(limparCheckoutTrial ? { gateway_subscription_id: null } : {}),
          ...(ciclo ? { ciclo } : {}),
          atualizado_em: new Date().toISOString(),
        }).eq('id', assinatura.id);
        if (erroAtualizacao) {
          console.error('Erro ao persistir conciliação da assinatura:', erroAtualizacao.message);
        }
        if (novoStatus) assinaturaAtivaAposConciliacao = false;
      }
    }

    if (assinaturaAtivaAposConciliacao) {
      const { error: erroReconciliacao } = await admin.rpc('reconciliar_perfis_quota', {
        p_origem_empresa_id: empresaId,
      });
      if (erroReconciliacao) {
        console.error('Erro ao reconciliar perfis da assinatura ativa:', erroReconciliacao.message);
      }
    }

    const cobranca = cobrancas.ok
      ? pagamentos.find((item) => item.invoiceUrl && STATUS_FATURA_PAGAVEL.has(item.status || ''))
      : null;
    if (cobranca?.invoiceUrl) {
      faturaPendente = {
        invoiceUrl: cobranca.invoiceUrl,
        valor: cobranca.value === null || cobranca.value === undefined ? null : Number(cobranca.value),
        vencimento: cobranca.dueDate || null,
        status: cobranca.status || null,
      };
    }
  }

  if (!assinatura?.gateway_subscription_id) {
    const { data: faturas } = await admin
    .from('assinatura_faturas')
    .select('invoice_url, valor, vencimento, status, atualizado_em')
    .eq('empresa_id', empresaId)
    .not('invoice_url', 'is', null)
    .order('atualizado_em', { ascending: false })
    .limit(8);
    const fatura = (faturas || []).find((item) => item.invoice_url && STATUS_FATURA_PAGAVEL.has(item.status || ''));
    if (fatura?.invoice_url) {
      faturaPendente = {
        invoiceUrl: fatura.invoice_url,
        valor: fatura.valor === null || fatura.valor === undefined ? null : Number(fatura.valor),
        vencimento: fatura.vencimento || null,
        status: fatura.status || null,
      };
    }
  }

  // 3) Resolve e devolve o estado depois da conciliacao imediata com a Asaas.
  //    `precisaPaywall` é calculado no servidor (já considera a flag COBRANCA_ATIVA).
  const estado = await resolverEstadoAcessoParaUsuario(empresaId, userId);
  return NextResponse.json({
    estado,
    precisaPaywall: precisaPaywallEmpresa(estado),
    precisaUpgradeVendas: precisaUpgradePessoal('vendas_mobile', estado),
    precos: PRECOS,
    faturaPendente,
  });
}
