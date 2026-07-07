import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  const empresaId: string | null = pagamento.externalReference || assinaturaPayload.externalReference || null;
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

    if (assinaturaAtual) {
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
