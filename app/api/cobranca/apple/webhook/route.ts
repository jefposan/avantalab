import { NextResponse } from 'next/server';
import { criarSupabaseAdmin } from '../../../../lib/admin-server';
import {
  consultarAssinanteRevenueCat,
  REVENUECAT_ENTITLEMENT_PESSOAL,
  salvarEstadoRevenueCat,
} from '../../../../lib/revenuecat-servidor';

export const runtime = 'nodejs';

type EventoRevenueCat = {
  id?: string;
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  product_id?: string;
  entitlement_ids?: string[];
};

export async function POST(request: Request) {
  const segredo = process.env.REVENUECAT_WEBHOOK_AUTH?.trim();
  const recebido = request.headers.get('authorization')?.trim();
  if (!segredo || recebido !== segredo) {
    return NextResponse.json({ erro: true }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const evento = (payload.event || {}) as EventoRevenueCat;
  const eventoId = String(evento.id || '').trim();
  const userId = String(evento.app_user_id || evento.original_app_user_id || '').trim();
  if (!eventoId) return NextResponse.json({ erro: true }, { status: 400 });

  const db = criarSupabaseAdmin();
  const { data: existente } = await db
    .from('revenuecat_webhook_eventos')
    .select('status')
    .eq('revenuecat_event_id', eventoId)
    .maybeSingle();
  if (existente?.status === 'processado' || existente?.status === 'ignorado') {
    return NextResponse.json({ ok: true, duplicado: true });
  }

  const relevante = Boolean(
    userId
    && (
      (evento.entitlement_ids || []).includes(REVENUECAT_ENTITLEMENT_PESSOAL)
      || String(evento.product_id || '').includes('pessoalpremium')
    )
  );
  await db.from('revenuecat_webhook_eventos').upsert({
    revenuecat_event_id: eventoId,
    evento: evento.type || 'UNKNOWN',
    user_id: userId || null,
    produto_id: evento.product_id || null,
    payload,
    status: relevante ? 'pendente' : 'ignorado',
    processado_em: relevante ? null : new Date().toISOString(),
  }, { onConflict: 'revenuecat_event_id' });
  if (!relevante) return NextResponse.json({ ok: true, ignorado: true });

  try {
    // A notificação autenticada desperta a conciliação, mas a permissão é
    // sempre derivada da API da RevenueCat, nunca do payload recebido.
    const estado = await consultarAssinanteRevenueCat(userId);
    await salvarEstadoRevenueCat(db, userId, estado);
    await db.from('revenuecat_webhook_eventos').update({
      status: 'processado',
      erro: null,
      processado_em: new Date().toISOString(),
    }).eq('revenuecat_event_id', eventoId);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    await db.from('revenuecat_webhook_eventos').update({
      status: 'erro',
      erro: mensagem.slice(0, 1000),
      processado_em: new Date().toISOString(),
    }).eq('revenuecat_event_id', eventoId);
    console.error('Falha no webhook RevenueCat:', erro);
    return NextResponse.json({ erro: true }, { status: 503 });
  }
}
