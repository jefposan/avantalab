import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────
// Webhook da Asaas — recebe os avisos de pagamento e atualiza a
// tabela `assinaturas`. É a FONTE DA VERDADE da liberação.
//
// Segurança: a Asaas envia um token no header `asaas-access-token`
// (configurado no painel dela). Comparamos com ASAAS_WEBHOOK_TOKEN.
// A escrita usa a service role do Supabase (ignora RLS).
// ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // 1) Autenticidade (trim tolera espaço/quebra de linha acidental).
  const tokenEsperado = (process.env.ASAAS_WEBHOOK_TOKEN || '').trim();
  const tokenRecebido = (request.headers.get('asaas-access-token') || '').trim();
  if (!tokenEsperado || tokenRecebido !== tokenEsperado) {
    return NextResponse.json({ erro: true, mensagem: 'não autorizado' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRole) return NextResponse.json({ erro: true }, { status: 500 });

  const corpo = await request.json().catch(() => null);
  if (!corpo || !corpo.event) return NextResponse.json({ recebido: true });

  const evento = String(corpo.event);
  const pagamento = corpo.payment || {};
  const empresaId: string | null = pagamento.externalReference || null; // = empresa_id do nosso sistema
  const assinaturaGw: string | null = pagamento.subscription || null;
  if (!empresaId && !assinaturaGw) return NextResponse.json({ recebido: true });

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
  if (!novoStatus) return NextResponse.json({ recebido: true });

  // Quando os dois identificadores vêm no evento, ambos precisam pertencer à
  // assinatura atual. Assim um webhook atrasado de uma assinatura antiga não
  // altera o estado da cobrança nova do mesmo perfil.
  const db = createClient(supabaseUrl, serviceRole);
  const atualizacao = { status: novoStatus, atualizado_em: new Date().toISOString() };
  if (empresaId && assinaturaGw) {
    await db
      .from('assinaturas')
      .update(atualizacao)
      .eq('empresa_id', empresaId)
      .eq('gateway_subscription_id', assinaturaGw);
  } else if (empresaId) {
    await db.from('assinaturas').update(atualizacao).eq('empresa_id', empresaId);
  } else {
    await db.from('assinaturas').update(atualizacao).eq('gateway_subscription_id', assinaturaGw);
  }

  return NextResponse.json({ recebido: true });
}
