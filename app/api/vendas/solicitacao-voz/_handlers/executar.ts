import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { canOperateVoiceSales, getVoiceSalesContext, isVoiceCommandEnabled } from '@/app/lib/vendas-voice/auth';
import { customerBalance } from '@/app/lib/vendas-voice/data';
import { logVoiceLab } from '@/app/lib/vendas-voice/logger';
import type { VoiceConfirmationAction } from '@/app/lib/vendas-voice/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const moneyCents = (value: unknown) => Math.round(Number(value || 0) * 100);
const APPOINTMENT_TYPES = new Set(['Visita', 'Entrega', 'Recebimento', 'Cobrar', 'Outro']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function validIsoDate(value: unknown) {
  const text = String(value || '');
  if (!ISO_DATE.test(text)) return false;
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validateAction(value: unknown): VoiceConfirmationAction | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const action = value as VoiceConfirmationAction;
  if (!['create_order', 'create_consignment', 'register_payment', 'create_appointment'].includes(action.intent)) return null;
  if (![action.operationId, action.accountId, action.customerId].every((id) => UUID.test(String(id || '')))) return null;
  if (!Array.isArray(action.items) || action.items.length > 20) return null;
  if (['create_order', 'create_consignment'].includes(action.intent) && (!action.items.length || action.items.some((item) => !UUID.test(String(item.productId || '')) || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0))) return null;
  if (action.intent === 'register_payment' && (!Number.isFinite(Number(action.amount)) || Number(action.amount) <= 0)) return null;
  const discountAmount = Number(action.discountAmount || 0);
  const discountPercent = action.discountPercent == null ? null : Number(action.discountPercent);
  if (!Number.isFinite(discountAmount) || discountAmount < 0) return null;
  if (discountPercent !== null && (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100)) return null;
  if (action.intent === 'create_appointment') {
    if (!validIsoDate(action.scheduledDate)) return null;
    if (action.scheduledTime && !CLOCK_TIME.test(String(action.scheduledTime))) return null;
    if (!APPOINTMENT_TYPES.has(String(action.appointmentType || ''))) return null;
  }
  const voiceLearnings = Array.isArray(action.voiceLearnings)
    ? action.voiceLearnings.slice(0, 20).flatMap((learning) => {
      const type = String(learning?.type || '');
      const id = String(learning?.id || '');
      const reference = String(learning?.reference || '').trim().slice(0, 160);
      return ['product', 'customer'].includes(type) && UUID.test(id) && reference
        ? [{ type: type as 'product' | 'customer', id, reference }]
        : [];
    })
    : [];
  return { ...action, discountAmount: Math.round(discountAmount * 100) / 100, discountPercent, voiceLearnings };
}

function confirmedDiscount(action: VoiceConfirmationAction, base: number) {
  const requested = action.discountPercent == null
    ? Number(action.discountAmount || 0)
    : base * Number(action.discountPercent) / 100;
  return Math.min(Math.max(0, Math.round(requested * 100) / 100), Math.max(0, Math.round(base * 100) / 100));
}

async function confirmVoiceLearnings(
  db: SupabaseClient,
  action: VoiceConfirmationAction,
  productIds: string[] = [],
) {
  const allowedProducts = new Set(productIds);
  const learnings = (action.voiceLearnings || []).filter((learning) => learning.type === 'customer'
    ? learning.id === action.customerId
    : allowedProducts.has(learning.id));
  if (!learnings.length) return;
  const { error } = await db.rpc('vendas_mobile_confirmar_aprendizado_busca_voz_rpc', {
    p_conta_id: action.accountId,
    p_operacao_id: action.operationId,
    p_aprendizados: learnings,
  });
  if (error) console.warn('[voice-learning] O lançamento foi concluído, mas o aprendizado será tentado novamente.', error.message);
}

export async function POST(request: Request) {
  let userId = '';
  let accountId = '';
  let intent = '';
  try {
    const body = await request.json();
    accountId = String(body?.accountId || '').trim();
    const action = validateAction(body?.action);
    if (!action || action.accountId !== accountId) return NextResponse.json({ message: 'A confirmação não é válida. Prepare a solicitação novamente.' }, { status: 400 });
    intent = action.intent;
    const context = await getVoiceSalesContext(request, accountId);
    if (!context) return NextResponse.json({ message: 'Sua sessão do Avanta Vendas expirou.' }, { status: 401 });
    if (!await isVoiceCommandEnabled(context)) return NextResponse.json({ message: 'A Solicitação por Voz está desativada nesta conta.' }, { status: 403 });
    userId = context.userId;
    if (!canOperateVoiceSales(context)) return NextResponse.json({ message: 'Seu acesso permite consultas, mas não lançamentos.' }, { status: 403 });
    const { data: customer, error: customerError } = await context.db.from('vendas_mobile_clientes')
      .select('id,nome,ativo').eq('conta_id', accountId).eq('id', action.customerId).eq('ativo', true).maybeSingle();
    if (customerError || !customer) return NextResponse.json({ message: 'O cliente não está mais disponível. Prepare a solicitação novamente.' }, { status: 409 });

    if (action.intent === 'create_appointment') {
      const appointmentType = String(action.appointmentType);
      const appointmentDate = String(action.scheduledDate);
      const appointmentTime = action.scheduledTime ? String(action.scheduledTime) : null;
      const notes = String(action.appointmentNotes || '').trim().slice(0, 1000) || null;
      const { data, error } = await context.db.from('vendas_mobile_agenda').insert({
        id: action.operationId,
        user_id: context.userId,
        conta_id: accountId,
        cliente_id: customer.id,
        cliente_nome: customer.nome,
        tipo: appointmentType,
        data: appointmentDate,
        horario: appointmentTime,
        observacoes: notes,
        status: 'pendente',
      }).select('id,conta_id,cliente_id,cliente_nome,tipo,data,horario,observacoes,status,criado_em').single();
      if (error) throw new Error(error.message || 'O agendamento não pôde ser criado.');
      if (!data?.id || data.cliente_id !== customer.id || data.conta_id !== accountId || data.data !== appointmentDate) {
        throw new Error('O servidor não confirmou o agendamento integralmente.');
      }
      const { data: verifiedAppointment, error: verificationError } = await context.db.from('vendas_mobile_agenda')
        .select('id,conta_id,cliente_id,cliente_nome,tipo,data,horario,observacoes,status,criado_em')
        .eq('conta_id', accountId).eq('id', data.id).maybeSingle();
      if (verificationError || !verifiedAppointment
        || verifiedAppointment.cliente_id !== customer.id
        || verifiedAppointment.data !== appointmentDate
        || verifiedAppointment.tipo !== appointmentType) {
        throw new Error('O agendamento foi enviado, mas o servidor não conseguiu conferir sua gravação. Consulte a Agenda antes de tentar novamente.');
      }
      await confirmVoiceLearnings(context.db, action);
      logVoiceLab({ event: 'executed', userId, accountId, intent, confirmed: true, success: true });
      return NextResponse.json({
        title: 'Agendamento criado com sucesso',
        message: `${appointmentType} para ${customer.nome} em ${new Intl.DateTimeFormat('pt-BR').format(new Date(`${appointmentDate}T12:00:00`))}${appointmentTime ? `, às ${appointmentTime}` : ''}.`,
        recordId: verifiedAppointment.id,
        evidence: {
          recordId: verifiedAppointment.id,
          recordType: 'Agendamento',
          customerName: customer.nome,
          status: 'Pendente',
          createdAt: verifiedAppointment.criado_em,
          verifiedAt: new Date().toISOString(),
          verification: 'Registro relido do banco após a gravação',
        },
      }, { headers: { 'Cache-Control': 'no-store, private' } });
    }

    if (['create_order', 'create_consignment'].includes(action.intent)) {
      const consignment = action.intent === 'create_consignment';
      const productIds = [...new Set(action.items.map((item) => item.productId))];
      const { data: products, error: productsError } = await context.db.from('vendas_mobile_produtos')
        .select('id,nome,sku,preco,preco_custo,ativo').eq('conta_id', accountId).in('id', productIds).eq('ativo', true);
      if (productsError || (products || []).length !== productIds.length) return NextResponse.json({ message: 'Um produto não está mais disponível. Prepare o pedido novamente.' }, { status: 409 });
      const byId = new Map((products || []).map((product) => [product.id, product]));
      const items = action.items.map((confirmedItem) => {
        const product = byId.get(confirmedItem.productId)!;
        const quantity = Math.round(Number(confirmedItem.quantity) * 1000) / 1000;
        const unitPrice = Number(product.preco || 0);
        return {
          produto_id: product.id, produto_nome: product.nome, produto_sku: product.sku || null,
          quantidade: quantity, preco_unitario: unitPrice,
          preco_custo: product.preco_custo == null ? null : Number(product.preco_custo),
          desconto: 0, total: Math.round(quantity * unitPrice * 100) / 100,
        };
      });
      const subtotal = Math.round(items.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
      const discount = confirmedDiscount(action, subtotal);
      const total = Math.round((subtotal - discount) * 100) / 100;
      if (moneyCents(discount) !== moneyCents(action.discountAmount)) return NextResponse.json({ message: 'O desconto mudou. Revise e confirme o pedido novamente.' }, { status: 409 });
      if (moneyCents(total) !== moneyCents(action.expectedTotal)) return NextResponse.json({ message: 'O preço de um produto mudou. Revise e confirme o pedido novamente.' }, { status: 409 });
      const order = {
        id: action.operationId, conta_id: accountId, cliente_id: customer.id, status: 'concluida',
        subtotal, desconto: discount, total, forma_pagamento: consignment ? 'Consignado' : 'Venda',
        observacoes: JSON.stringify({ avantalab_pedido: true, tipo: consignment ? 'consignado' : 'venda', descricao: consignment ? 'Pedido consignado' : 'Pedido de venda', desconto_tipo: action.discountPercent == null ? 'valor' : 'percentual', desconto_percentual: action.discountPercent || 0, origem: 'solicitacao_por_voz' }), criado_em: new Date().toISOString(),
      };
      const { data, error } = await context.db.rpc('salvar_pedido_vendas_mobile_rpc', { p_pedido: order, p_itens: items, p_novo: true });
      if (error) throw new Error(error.message || 'O pedido não pôde ser criado.');
      if (!data?.id || String(data.conta_id || '') !== accountId || !Array.isArray(data.itens)) throw new Error('O servidor não confirmou o pedido integralmente.');
      const { data: verifiedOrder, error: verificationError } = await context.db.from('vendas_mobile_pedidos')
        .select('id,conta_id,cliente_id,status,total,criado_em,itens:vendas_mobile_pedido_itens(id)')
        .eq('conta_id', accountId).eq('id', data.id).maybeSingle();
      if (verificationError || !verifiedOrder
        || verifiedOrder.cliente_id !== customer.id
        || moneyCents(verifiedOrder.total) !== moneyCents(total)
        || !Array.isArray(verifiedOrder.itens)
        || verifiedOrder.itens.length !== items.length) {
        throw new Error('O pedido foi enviado, mas o servidor não conseguiu conferir sua gravação. Consulte os pedidos antes de tentar novamente.');
      }
      await confirmVoiceLearnings(context.db, action, productIds);
      logVoiceLab({ event: 'executed', userId, accountId, intent, confirmed: true, success: true });
      return NextResponse.json({
        title: consignment ? 'Consignado criado com sucesso' : 'Pedido criado com sucesso',
        message: `${consignment ? 'Consignado' : 'Pedido'} de ${customer.nome} confirmado no valor de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}.`,
        recordId: verifiedOrder.id,
        evidence: {
          recordId: verifiedOrder.id,
          recordType: consignment ? 'Consignado' : 'Pedido',
          customerName: customer.nome,
          amount: Number(verifiedOrder.total),
          status: verifiedOrder.status === 'concluida' ? 'Concluído' : String(verifiedOrder.status || 'Gravado'),
          createdAt: verifiedOrder.criado_em,
          verifiedAt: new Date().toISOString(),
          verification: 'Registro relido do banco após a gravação',
        },
      }, { headers: { 'Cache-Control': 'no-store, private' } });
    }

    const financial = await customerBalance(context.db, accountId, customer.id);
    if (moneyCents(financial.balance) !== moneyCents(action.expectedBalance)) return NextResponse.json({ message: 'O saldo do cliente mudou. Revise e confirme o pagamento novamente.' }, { status: 409 });
    const amount = Math.round(Number(action.amount) * 100) / 100;
    const discount = confirmedDiscount(action, financial.balance);
    if (moneyCents(discount) !== moneyCents(action.discountAmount)) return NextResponse.json({ message: 'O desconto mudou. Revise e confirme o pagamento novamente.' }, { status: 409 });
    const finalBalance = Math.max(0, Math.round((financial.balance - amount - discount) * 100) / 100);
    const paymentDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const payload = {
      id: action.operationId, user_id: context.userId, conta_id: accountId, cliente_id: customer.id,
      tipo: 'pagamento', forma_pagamento: action.paymentMethod || 'Pix', valor: amount, desconto: discount,
      saldo_anterior: financial.balance, saldo_final: finalBalance, data_pagamento: paymentDate,
      observacoes: JSON.stringify({ avantalab_pagamento: true, comprovante_financeiro_confirmado: true, desconto: discount, desconto_tipo: action.discountPercent == null ? 'valor' : 'percentual', desconto_percentual: action.discountPercent || 0, saldo_anterior: financial.balance, saldo_final: finalBalance, origem: 'solicitacao_por_voz' }),
    };
    const { data, error } = await context.db.from('vendas_mobile_pagamentos').upsert(payload, { onConflict: 'id' }).select().single();
    if (error) throw new Error(error.message || 'O pagamento não pôde ser registrado.');
    if (!data?.id || data.cliente_id !== customer.id || moneyCents(data.valor) !== moneyCents(amount) || moneyCents(data.desconto) !== moneyCents(discount)) throw new Error('O servidor não confirmou o pagamento integralmente.');
    const { data: verifiedPayment, error: verificationError } = await context.db.from('vendas_mobile_pagamentos')
      .select('id,conta_id,cliente_id,tipo,valor,desconto,saldo_final,data_pagamento,criado_em')
      .eq('conta_id', accountId).eq('id', data.id).maybeSingle();
    if (verificationError || !verifiedPayment
      || verifiedPayment.cliente_id !== customer.id
      || verifiedPayment.tipo !== 'pagamento'
      || moneyCents(verifiedPayment.valor) !== moneyCents(amount)
      || moneyCents(verifiedPayment.desconto) !== moneyCents(discount)
      || moneyCents(verifiedPayment.saldo_final) !== moneyCents(finalBalance)) {
      throw new Error('O pagamento foi enviado, mas o servidor não conseguiu conferir sua gravação. Consulte os pagamentos antes de tentar novamente.');
    }
    await confirmVoiceLearnings(context.db, action);
    logVoiceLab({ event: 'executed', userId, accountId, intent, confirmed: true, success: true });
    return NextResponse.json({
      title: 'Pagamento registrado com sucesso',
      message: `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)} recebidos de ${customer.nome}.`,
      recordId: verifiedPayment.id,
      evidence: {
        recordId: verifiedPayment.id,
        recordType: 'Pagamento',
        customerName: customer.nome,
        amount: Number(verifiedPayment.valor),
        status: 'Registrado',
        createdAt: verifiedPayment.criado_em,
        verifiedAt: new Date().toISOString(),
        verification: 'Registro relido do banco após a gravação',
      },
    }, { headers: { 'Cache-Control': 'no-store, private' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível executar a solicitação.';
    logVoiceLab({ event: 'execution_error', userId, accountId, intent, confirmed: true, success: false, error: message });
    return NextResponse.json({ message }, { status: 500 });
  }
}
