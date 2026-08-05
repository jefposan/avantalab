import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const esperado = (process.env.ASAAS_WEBHOOK_TOKEN || '').trim();
  const recebido = (request.headers.get('asaas-access-token') || '').trim();
  if (!esperado || recebido !== esperado) return NextResponse.json({ recebido: false }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !service) return NextResponse.json({ recebido: false }, { status: 500 });
  const corpo = await request.json().catch(() => null);
  const eventoId = String(corpo?.id || '');
  const evento = String(corpo?.event || '');
  const pagamento = corpo?.payment || {};
  const pagamentoId = String(pagamento?.id || '');
  const referencia = String(pagamento?.externalReference || '');
  if (!eventoId || !evento) return NextResponse.json({ recebido: false }, { status: 400 });
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: anterior } = await db.from('carteira_webhook_eventos').select('id,status').eq('evento_id', eventoId).maybeSingle();
  if (anterior?.status === 'processado' || anterior?.status === 'ignorado') return NextResponse.json({ recebido: true, duplicado: true });
  let registroId = anterior?.id;
  if (!registroId) {
    const { data: novo, error } = await db.from('carteira_webhook_eventos').insert({ evento_id: eventoId, evento, gateway_payment_id: pagamentoId || null, payload: corpo }).select('id').single();
    if (error) return NextResponse.json({ recebido: false }, { status: error.code === '23505' ? 200 : 500 });
    registroId = novo.id;
  }
  if (!referencia.startsWith('carteira:')) {
    await db.from('carteira_webhook_eventos').update({ status: 'ignorado', processado_em: new Date().toISOString() }).eq('id', registroId);
    return NextResponse.json({ recebido: true, ignorado: true });
  }
  const [, recargaId] = referencia.split(':');
  try {
    const estados: Record<string, string> = { PAYMENT_OVERDUE: 'vencida', PAYMENT_DELETED: 'cancelada', PAYMENT_REFUNDED: 'estornada', PAYMENT_CHARGEBACK_REQUESTED: 'chargeback', PAYMENT_CHARGEBACK_DISPUTE: 'chargeback' };
    if (evento === 'PAYMENT_CONFIRMED' || evento === 'PAYMENT_RECEIVED') {
      const { error } = await db.rpc('creditar_recarga_carteira', { p_recarga_id: recargaId, p_gateway_payment_id: pagamentoId, p_evento_id: eventoId });
      if (error) throw error;
    } else if (estados[evento]) {
      if (evento === 'PAYMENT_REFUNDED' || evento.startsWith('PAYMENT_CHARGEBACK')) {
        const { error } = await db.rpc('reverter_recarga_carteira', { p_recarga_id: recargaId, p_gateway_payment_id: pagamentoId, p_status: estados[evento] });
        if (error) throw error;
      } else {
        await db.from('carteira_recargas').update({ status: estados[evento], payload: pagamento, atualizado_em: new Date().toISOString() }).eq('id', recargaId).eq('gateway_payment_id', pagamentoId);
      }
    }
    await db.from('carteira_webhook_eventos').update({ status: 'processado', erro: null, processado_em: new Date().toISOString() }).eq('id', registroId);
    return NextResponse.json({ recebido: true });
  } catch {
    await db.from('carteira_webhook_eventos').update({ status: 'erro', erro: 'falha ao aplicar evento' }).eq('id', registroId);
    return NextResponse.json({ recebido: false }, { status: 500 });
  }
}
