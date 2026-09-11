import { NextResponse } from 'next/server';
import { getVoiceSalesContext, isVoiceCommandEnabled } from '@/app/lib/vendas-voice/auth';
import { logVoiceLab } from '@/app/lib/vendas-voice/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accountId = String(body?.accountId || '').trim();
    const context = await getVoiceSalesContext(request, accountId);
    if (!context) return NextResponse.json({ ok: false }, { status: 401 });
    if (!await isVoiceCommandEnabled(context)) return NextResponse.json({ ok: false }, { status: 403 });
    if (body?.event !== 'cancelled') return NextResponse.json({ ok: false }, { status: 400 });
    logVoiceLab({
      event: 'cancelled', userId: context.userId, accountId,
      transcription: String(body?.transcription || '').trim(),
      intent: String(body?.intent || '').trim(), confirmed: false, success: true,
    });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store, private' } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
