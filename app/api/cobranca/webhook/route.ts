import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────
// Webhook da Asaas — recebe os avisos de pagamento e atualiza a
// tabela `assinaturas`. É a FONTE DA VERDADE da liberação.
//
// Segurança: a Asaas envia um token no header `asaas-access-token`
// (que configuramos no painel dela). Comparamos com o nosso segredo
// ASAAS_WEBHOOK_TOKEN. Sem casar, recusamos (401).
//
// A escrita usa a service role do Supabase (ignora RLS).
// ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // 1) Autenticidade: só aceita se o token bater com o nosso segredo.
  const tokenEsperado = process.env.ASAAS_WEBHOOK_TOKEN || '';
  const tokenRecebido = request.headers.get('asaas-access-token') || '';
  if (!tokenEsperado || tokenRecebido !== tokenEsperado) {
    return NextResponse.json({ erro: true, mensagem: 'não autorizado' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    return NextResponse.json({ erro: true }, { status: 500 });
  }

  const corpo = await request.json().catch(() => null);
  if (!corpo || !corpo.event) {
    // Responde 200 pra Asaas não reenviar; simplesmente não há o que fazer.
    return NextResponse.json({ recebido: true });
  }

  const evento = String(corpo.event);
  const pagamento = corpo.payment || {};
  const assinaturaGw: string | null = pagamento.subscription || null; // id da assinatura na Asaas

  // Só tratamos eventos ligados a uma assinatura nossa.
  if (!assinaturaGw) return NextResponse.json({ recebido: true });

  // Mapeia o evento da Asaas para o status da nossa assinatura.
  let novoStatus: string | null = null;
  if (evento === 'PAYMENT_CONFIRMED' || evento === 'PAYMENT_RECEIVED') {
    novoStatus = 'ativa';
  } else if (evento === 'PAYMENT_OVERDUE') {
    novoStatus = 'inadimplente';
  } else if (
    evento === 'PAYMENT_DELETED' ||
    evento === 'PAYMENT_REFUNDED' ||
    evento === 'PAYMENT_CHARGEBACK_REQUESTED'
  ) {
    novoStatus = 'cancelada';
  }

  // Evento que ainda não tratamos → apenas confirma o recebimento.
  if (!novoStatus) return NextResponse.json({ recebido: true });

  const db = createClient(supabaseUrl, serviceRole);
  // Atualização idempotente: reprocessar o mesmo evento não causa efeito colateral.
  await db
    .from('assinaturas')
    .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
    .eq('gateway_subscription_id', assinaturaGw);

  return NextResponse.json({ recebido: true });
}
