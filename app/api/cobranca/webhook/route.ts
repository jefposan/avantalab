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
  // (trim tolera espaço/quebra de linha acidental ao colar o valor)
  const tokenEsperado = (process.env.ASAAS_WEBHOOK_TOKEN || '').trim();
  const tokenRecebido = (request.headers.get('asaas-access-token') || '').trim();
  const autorizado = Boolean(tokenEsperado) && tokenRecebido === tokenEsperado;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const corpo = await request.json().catch(() => null);
  const evento: string | null = corpo?.event ? String(corpo.event) : null;
  const assinaturaGw: string | null = corpo?.payment?.subscription || null;

  // LOG de diagnóstico (TEMPORÁRIO): registra toda chamada, mesmo recusada.
  if (supabaseUrl && serviceRole) {
    try {
      await createClient(supabaseUrl, serviceRole).from('cobranca_webhook_log').insert({
        evento,
        assinatura_gw: assinaturaGw,
        esperado_len: tokenEsperado.length,
        recebido_len: tokenRecebido.length,
        autorizado,
      });
    } catch { /* ignora falha de log */ }
  }

  // 1) Autenticidade
  if (!autorizado) {
    return NextResponse.json({
      erro: true,
      mensagem: 'não autorizado',
      debug: { esperadoLen: tokenEsperado.length, recebidoLen: tokenRecebido.length },
    }, { status: 401 });
  }

  if (!supabaseUrl || !serviceRole) return NextResponse.json({ erro: true }, { status: 500 });
  if (!corpo || !evento) return NextResponse.json({ recebido: true });
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

  if (!novoStatus) return NextResponse.json({ recebido: true });

  const db = createClient(supabaseUrl, serviceRole);
  await db
    .from('assinaturas')
    .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
    .eq('gateway_subscription_id', assinaturaGw);

  return NextResponse.json({ recebido: true });
}
