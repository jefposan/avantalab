import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { atualizarAssinaturaAsaas } from '../../../lib/asaas';
import { fimDaCarencia, somarUmMesData } from '../../../lib/ponto-facial-cobranca-servidor';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const tokenEsperado = (process.env.ASAAS_WEBHOOK_TOKEN || '').trim();
  const tokenRecebido = (request.headers.get('asaas-access-token') || '').trim();
  if (!tokenEsperado || tokenRecebido !== tokenEsperado) {
    return NextResponse.json({ erro: true, mensagem: 'não autorizado' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRole) return NextResponse.json({ erro: true }, { status: 500 });

  const corpo = await request.json().catch(() => null);
  if (!corpo?.event || !corpo?.id) {
    return NextResponse.json({ erro: true, mensagem: 'evento inválido' }, { status: 400 });
  }

  const db = createClient(supabaseUrl, serviceRole);
  const eventoId = String(corpo.id);
  const evento = String(corpo.event);
  const pagamento = corpo.payment || {};
  const assinaturaPayload = corpo.subscription || {};
  const referenciaExterna = String(pagamento.externalReference || assinaturaPayload.externalReference || '');
  const empresaIdFacial = referenciaExterna.match(/^ponto_facial:([0-9a-f-]{36})$/i)?.[1]
    || referenciaExterna.match(/^ponto_facial_empresa:([0-9a-f-]{36})$/i)?.[1]
    || null;
  const alteracaoFacialId = referenciaExterna.match(/^ponto_facial_alteracao:([0-9a-f-]{36})$/i)?.[1] || null;
  const empresaId: string | null = /^[0-9a-f-]{36}$/i.test(referenciaExterna) ? referenciaExterna : empresaIdFacial;
  const assinaturaGw: string | null = pagamento.subscription || assinaturaPayload.id || null;
  const pagamentoGw: string | null = pagamento.id || null;

  const { data: recebido } = await db
    .from('cobranca_webhook_eventos')
    .select('id, status')
    .eq('asaas_event_id', eventoId)
    .maybeSingle();
  if (recebido?.status === 'processado') {
    return NextResponse.json({ recebido: true, duplicado: true });
  }

  let registroEventoId = recebido?.id || null;
  if (!registroEventoId) {
    const { data: inserido, error: erroInsercao } = await db
      .from('cobranca_webhook_eventos')
      .insert({
        asaas_event_id: eventoId,
        evento,
        empresa_id: empresaId,
        gateway_subscription_id: assinaturaGw,
        gateway_payment_id: pagamentoGw,
        payload: corpo,
        status: 'pendente',
      })
      .select('id')
      .single();
    if (erroInsercao) {
      if (erroInsercao.code === '23505') return NextResponse.json({ recebido: true, duplicado: true });
      return NextResponse.json({ erro: true, mensagem: 'falha ao persistir evento' }, { status: 500 });
    }
    registroEventoId = inserido.id;
  }

  try {
    const resultadoFacial = await processarCobrancaFacial({
      db, evento, pagamento, assinaturaGw, pagamentoGw, empresaIdFacial, alteracaoFacialId,
    });
    if (resultadoFacial) {
      await db.from('cobranca_webhook_eventos').update({ status: 'processado', erro: null, processado_em: new Date().toISOString() }).eq('id', registroEventoId);
      return NextResponse.json({ recebido: true, facial: true });
    }

    // Assinatura de módulo: é independente da assinatura principal e só libera
    // o módulo após a confirmação do pagamento pela Asaas.
    const { data: assinaturaModulo } = assinaturaGw
      ? await db
          .from('assinaturas_modulos')
          .select('id, empresa_id, modulo_id, status, valido_ate')
          .eq('gateway_subscription_id', assinaturaGw)
          .maybeSingle()
      : { data: null };
    if (assinaturaModulo) {
      let novoStatus: 'ativa' | 'inadimplente' | 'cancelada' | null = null;
      let validoAte: string | null = assinaturaModulo.valido_ate || null;
      if (evento === 'PAYMENT_CONFIRMED' || evento === 'PAYMENT_RECEIVED') novoStatus = 'ativa';
      else if (evento === 'PAYMENT_OVERDUE') novoStatus = 'inadimplente';
      else if (evento === 'PAYMENT_REFUNDED' || evento === 'PAYMENT_CHARGEBACK_REQUESTED' || evento === 'SUBSCRIPTION_INACTIVATED' || evento === 'SUBSCRIPTION_DELETED') novoStatus = 'cancelada';

      if (novoStatus === 'inadimplente') {
        const fim = new Date();
        fim.setDate(fim.getDate() + 3);
        validoAte = fim.toISOString();
      } else if (novoStatus === 'cancelada') {
        validoAte = new Date().toISOString();
      } else if (novoStatus === 'ativa') {
        validoAte = null;
      }
      if (novoStatus) {
        await db.from('assinaturas_modulos').update({ status: novoStatus, valido_ate: validoAte, atualizado_em: new Date().toISOString() }).eq('id', assinaturaModulo.id);
        await db.from('empresa_modulos').upsert({
          empresa_id: assinaturaModulo.empresa_id,
          modulo_id: assinaturaModulo.modulo_id,
          ativo: novoStatus === 'ativa',
          origem: 'assinatura_modulo',
          atualizado_em: new Date().toISOString(),
        }, { onConflict: 'empresa_id,modulo_id' });
      }
      await db.from('cobranca_webhook_eventos').update({ status: 'processado', erro: null, processado_em: new Date().toISOString() }).eq('id', registroEventoId);
      return NextResponse.json({ recebido: true, modulo: true });
    }

    let consulta = db.from('assinaturas').select('id, empresa_id, status, valido_ate');
    if (empresaId && assinaturaGw) consulta = consulta.eq('empresa_id', empresaId).eq('gateway_subscription_id', assinaturaGw);
    else if (empresaId) consulta = consulta.eq('empresa_id', empresaId);
    else if (assinaturaGw) consulta = consulta.eq('gateway_subscription_id', assinaturaGw);
    else {
      await db.from('cobranca_webhook_eventos').update({ status: 'processado', processado_em: new Date().toISOString() }).eq('id', registroEventoId);
      return NextResponse.json({ recebido: true });
    }
    const { data: assinaturaAtual } = await consulta.maybeSingle();

    if (assinaturaAtual && pagamentoGw) {
      await db.from('assinatura_faturas').upsert({
        empresa_id: assinaturaAtual.empresa_id,
        assinatura_id: assinaturaAtual.id,
        gateway_payment_id: pagamentoGw,
        gateway_subscription_id: assinaturaGw,
        status: pagamento.status || evento.replace(/^PAYMENT_/, ''),
        valor: Number(pagamento.value || 0),
        vencimento: pagamento.dueDate || null,
        pagamento_em: pagamento.paymentDate || pagamento.confirmedDate || null,
        forma_pagamento: pagamento.billingType || null,
        invoice_url: pagamento.invoiceUrl || null,
        payload: pagamento,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'gateway_payment_id' });
    }

    if (assinaturaAtual && assinaturaAtual.status !== 'cortesia') {
      let novoStatus: string | null = null;
      let validoAte: string | null = null;
      if (evento === 'PAYMENT_CONFIRMED' || evento === 'PAYMENT_RECEIVED') novoStatus = 'ativa';
      else if (evento === 'PAYMENT_OVERDUE') novoStatus = 'inadimplente';
      else if (evento === 'PAYMENT_REFUNDED' || evento === 'PAYMENT_CHARGEBACK_REQUESTED') novoStatus = 'cancelada';
      else if (evento === 'SUBSCRIPTION_INACTIVATED' || evento === 'SUBSCRIPTION_DELETED') novoStatus = 'cancelada';

      if (assinaturaAtual.status === 'cancelada') novoStatus = null;
      if (novoStatus === 'inadimplente') {
        if (assinaturaAtual.status === 'inadimplente' && assinaturaAtual.valido_ate) {
          validoAte = assinaturaAtual.valido_ate;
        } else {
          const fimCarencia = new Date();
          fimCarencia.setDate(fimCarencia.getDate() + 3);
          validoAte = fimCarencia.toISOString();
        }
      } else if (novoStatus === 'cancelada') {
        validoAte = new Date().toISOString();
      }

      if (novoStatus) {
        await db.from('assinaturas').update({
          status: novoStatus,
          valido_ate: validoAte,
          atualizado_em: new Date().toISOString(),
        }).eq('id', assinaturaAtual.id);
      } else if (evento === 'SUBSCRIPTION_UPDATED') {
        const ciclo = assinaturaPayload.cycle === 'YEARLY' ? 'anual' : assinaturaPayload.cycle === 'MONTHLY' ? 'mensal' : null;
        if (ciclo) await db.from('assinaturas').update({ ciclo, atualizado_em: new Date().toISOString() }).eq('id', assinaturaAtual.id);
      }
    }

    await db.from('cobranca_webhook_eventos').update({
      status: 'processado',
      erro: null,
      processado_em: new Date().toISOString(),
    }).eq('id', registroEventoId);
    return NextResponse.json({ recebido: true });
  } catch (erro) {
    await db.from('cobranca_webhook_eventos').update({
      status: 'erro',
      erro: erro instanceof Error ? erro.message : 'erro desconhecido',
    }).eq('id', registroEventoId);
    return NextResponse.json({ erro: true, mensagem: 'falha ao processar evento' }, { status: 500 });
  }
}

async function processarCobrancaFacial({
  db,
  evento,
  pagamento,
  assinaturaGw,
  pagamentoGw,
  empresaIdFacial,
  alteracaoFacialId,
}: {
  // O webhook opera com service role e tabelas adicionadas por migração, que
  // ainda não fazem parte de um schema TypeScript gerado neste projeto.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  evento: string;
  pagamento: Record<string, unknown>;
  assinaturaGw: string | null;
  pagamentoGw: string | null;
  empresaIdFacial: string | null;
  alteracaoFacialId: string | null;
}) {
  let alteracao: Record<string, unknown> | null = null;
  if (alteracaoFacialId) {
    const { data } = await db.from('ponto_facial_alteracoes_cobranca')
      .select('id, empresa_id, assinatura_id, tipo, status, quantidade_nova, funcionarios_adicionados')
      .eq('id', alteracaoFacialId).maybeSingle();
    alteracao = data;
  } else if (pagamentoGw) {
    const { data } = await db.from('ponto_facial_alteracoes_cobranca')
      .select('id, empresa_id, assinatura_id, tipo, status, quantidade_nova, funcionarios_adicionados')
      .eq('gateway_payment_id', pagamentoGw).maybeSingle();
    alteracao = data;
  }

  let assinatura: Record<string, unknown> | null = null;
  if (alteracao?.assinatura_id) {
    const { data } = await db.from('ponto_facial_assinaturas')
      .select('id, empresa_id, status, quantidade_atual, quantidade_proxima, valor_mensal_centavos, gateway_subscription_id, proximo_vencimento, valido_ate')
      .eq('id', String(alteracao.assinatura_id)).maybeSingle();
    assinatura = data;
  } else if (assinaturaGw) {
    const { data } = await db.from('ponto_facial_assinaturas')
      .select('id, empresa_id, status, quantidade_atual, quantidade_proxima, valor_mensal_centavos, gateway_subscription_id, proximo_vencimento, valido_ate')
      .eq('gateway_subscription_id', assinaturaGw).maybeSingle();
    assinatura = data;
  } else if (empresaIdFacial) {
    const { data } = await db.from('ponto_facial_assinaturas')
      .select('id, empresa_id, status, quantidade_atual, quantidade_proxima, valor_mensal_centavos, gateway_subscription_id, proximo_vencimento, valido_ate')
      .eq('empresa_id', empresaIdFacial).maybeSingle();
    assinatura = data;
  }
  if (!assinatura) return false;

  const empresaId = String(assinatura.empresa_id);
  const assinaturaId = String(assinatura.id);
  const statusPagamento = String(pagamento.status || evento.replace(/^PAYMENT_/, '') || 'UNKNOWN');
  if (pagamentoGw) {
    await db.from('ponto_facial_faturas').upsert({
      empresa_id: empresaId,
      assinatura_id: assinaturaId,
      alteracao_id: alteracao?.id || null,
      gateway_payment_id: pagamentoGw,
      gateway_subscription_id: assinaturaGw || assinatura.gateway_subscription_id || null,
      status: statusPagamento,
      valor_centavos: Math.round(Number(pagamento.value || 0) * 100),
      vencimento: pagamento.dueDate || null,
      pagamento_em: pagamento.paymentDate || pagamento.confirmedDate || null,
      forma_pagamento: pagamento.billingType || null,
      invoice_url: pagamento.invoiceUrl || null,
      payload: pagamento,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'gateway_payment_id' });
  }
  if (alteracao?.id && (pagamentoGw || pagamento.invoiceUrl)) {
    await db.from('ponto_facial_alteracoes_cobranca').update({
      gateway_payment_id: pagamentoGw || undefined,
      invoice_url: pagamento.invoiceUrl || undefined,
      vencimento: pagamento.dueDate || undefined,
      atualizado_em: new Date().toISOString(),
    }).eq('id', String(alteracao.id));
  }

  const pago = evento === 'PAYMENT_CONFIRMED' || evento === 'PAYMENT_RECEIVED';
  const vencido = evento === 'PAYMENT_OVERDUE';
  const revertido = evento === 'PAYMENT_REFUNDED' || evento === 'PAYMENT_CHARGEBACK_REQUESTED';
  const assinaturaEncerrada = evento === 'SUBSCRIPTION_INACTIVATED' || evento === 'SUBSCRIPTION_DELETED';
  const agora = new Date().toISOString();

  if (pago) {
    const quantidadeNova = Number(alteracao?.quantidade_nova ?? assinatura.quantidade_proxima ?? assinatura.quantidade_atual ?? 0);
    const vencimentoPago = String(pagamento.dueDate || assinatura.proximo_vencimento || '').slice(0, 10);
    const proximoVencimento = vencimentoPago ? somarUmMesData(vencimentoPago) : assinatura.proximo_vencimento || null;

    if (alteracao?.status === 'pendente_pagamento') {
      await db.from('ponto_facial_funcionarios').update({ status: 'pendente_cadastro', removido_em: null, atualizado_em: agora })
        .eq('empresa_id', empresaId).eq('status', 'pendente_pagamento');
      await db.from('ponto_facial_funcionarios').update({ status: 'ativo', removido_em: null, atualizado_em: agora })
        .eq('empresa_id', empresaId).eq('status', 'pendente_cadastro').not('referencia_provedor_id', 'is', null);
      await db.from('ponto_facial_alteracoes_cobranca').update({ status: 'aplicada', aplicado_em: agora, atualizado_em: agora })
        .eq('id', String(alteracao.id));
      if (alteracao.tipo === 'aumento' && assinatura.gateway_subscription_id) {
        const atualizada = await atualizarAssinaturaAsaas(String(assinatura.gateway_subscription_id), {
          value: Number(assinatura.valor_mensal_centavos || 0) / 100,
          description: `AvantaLab — reconhecimento facial (${quantidadeNova} funcionário${quantidadeNova === 1 ? '' : 's'})`,
          updatePendingPayments: false,
        });
        if (!atualizada.ok) throw new Error(atualizada.erro || 'Falha ao atualizar a recorrência facial.');
      }
    }

    await db.from('ponto_facial_assinaturas').update({
      status: 'ativa', quantidade_atual: quantidadeNova, quantidade_proxima: quantidadeNova,
      valor_mensal_centavos: quantidadeNova * 1490, proximo_vencimento: proximoVencimento,
      valido_ate: null, desativacao_imediata: false, atualizado_em: agora,
    }).eq('id', assinaturaId);
    await db.from('ponto_config').update({ reconhecimento_facial_status: quantidadeNova ? 'ativo' : 'desativado', atualizado_em: agora }).eq('empresa_id', empresaId);
    if (alteracao?.id) await db.from('ponto_auditoria').insert({
      empresa_id: empresaId, ator_user_id: null, evento: 'reconhecimento_facial_cobranca_confirmada',
      origem: 'asaas_webhook', motivo: 'Pagamento do reconhecimento facial confirmado.',
      dados: { alteracao_id: alteracao.id, quantidade: quantidadeNova, pagamento_id: pagamentoGw },
    });
  } else if (vencido) {
    const validoAte = fimDaCarencia(String(pagamento.dueDate || '') || null);
    await db.from('ponto_facial_assinaturas').update({ status: 'inadimplente', valido_ate: validoAte, atualizado_em: agora }).eq('id', assinaturaId);
  } else if (revertido) {
    await db.from('ponto_facial_assinaturas').update({ status: 'suspensa', valido_ate: agora, atualizado_em: agora }).eq('id', assinaturaId);
    await db.from('ponto_config').update({ reconhecimento_facial_status: 'suspenso', atualizado_em: agora }).eq('empresa_id', empresaId);
  } else if (assinaturaEncerrada && assinatura.status !== 'cancelamento_programado') {
    await db.from('ponto_facial_assinaturas').update({ status: 'cancelada', valido_ate: agora, atualizado_em: agora }).eq('id', assinaturaId);
    await db.from('ponto_config').update({ reconhecimento_facial_status: 'suspenso', atualizado_em: agora }).eq('empresa_id', empresaId);
  }
  return true;
}
