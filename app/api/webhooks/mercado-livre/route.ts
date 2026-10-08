import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseSaleNotification, queueSaleNotification } from '@/app/modules/marketplaces/services/mercadolivre-sales';

export const runtime = 'nodejs';

/** Callback público: só coloca eventos conhecidos na fila e sempre relê a API do provedor depois. */
export async function POST(request: Request) {
  try {
    const applicationId = (process.env.MERCADOLIVRE_CLIENT_ID || '').trim();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!applicationId || !url || !service) return NextResponse.json({ ok: false }, { status: 503 });
    const notification = parseSaleNotification(await request.json().catch(() => null), applicationId);
    // Eventos de outros tópicos ou de contas já removidas não devem causar retentativa infinita.
    if (!notification) return NextResponse.json({ ok: true });
    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    await queueSaleNotification(db, notification);
    return NextResponse.json({ ok: true });
  } catch {
    // O 503 faz o Mercado Livre reenviar: é preferível a perder uma venda em falha de banco.
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
