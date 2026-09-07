import { NextResponse } from 'next/server';
import { getVoiceSalesContext, isVoiceCommandEnabled } from '@/app/lib/vendas-voice/auth';
import { buildVoiceResponse } from '@/app/lib/vendas-voice/data';
import { interpretVoiceCommand } from '@/app/lib/vendas-voice/interpreter';
import { logVoiceLab } from '@/app/lib/vendas-voice/logger';
import { validateVoiceIntentPayload } from '@/app/lib/vendas-voice/schema';
import type { VoiceEntityCandidate, VoiceEntitySelection, VoiceIntentPayload, VoiceMetrics } from '@/app/lib/vendas-voice/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validCandidates(value: unknown): VoiceEntityCandidate[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 6).flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const row = candidate as Record<string, unknown>;
    const label = String(row.label || '').trim().slice(0, 160);
    const detail = String(row.detail || '').trim().slice(0, 240);
    return label ? [{ id: '', label, detail }] : [];
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validSelection(value: unknown): VoiceEntitySelection | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const type = String(row.type || '');
  const reference = String(row.reference || '').trim().slice(0, 160);
  const id = String(row.id || '').trim();
  if (!['customer', 'product'].includes(type) || !reference || !UUID.test(id)) return null;
  return { type: type as VoiceEntitySelection['type'], reference, id };
}

export async function POST(request: Request) {
  let userId = '';
  let accountId = '';
  let transcription = '';
  try {
    const body = await request.json();
    accountId = String(body?.accountId || '').trim();
    transcription = String(body?.transcription || '').trim().slice(0, 1000);
    if (!transcription) return NextResponse.json({ message: 'Fale sua solicitação para continuar.' }, { status: 400 });
    const context = await getVoiceSalesContext(request, accountId);
    if (!context) return NextResponse.json({ message: 'Sua sessão do Avanta Vendas expirou.' }, { status: 401 });
    if (!await isVoiceCommandEnabled(context)) return NextResponse.json({ message: 'Ative a Solicitação por Voz nas Configurações do Avanta Vendas.' }, { status: 403 });
    userId = context.userId;
    const previousDraft = body?.previousDraft ? validateVoiceIntentPayload(body.previousDraft) : null;
    const selection = validSelection(body?.selection);
    let intent: VoiceIntentPayload;
    let metrics: VoiceMetrics;
    if (selection && previousDraft) {
      intent = previousDraft;
      metrics = { interpretationMs: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    } else {
      const interpreted = await interpretVoiceCommand({
        transcription,
        previousDraft,
        candidates: validCandidates(body?.candidates),
      });
      intent = interpreted.intent;
      metrics = interpreted.metrics;
    }
    const result = await buildVoiceResponse({ db: context.db, accountId, draft: intent, transcription, metrics, selection });
    logVoiceLab({
      event: 'interpreted', userId, accountId, transcription, intent: intent.intent,
      interpretationMs: metrics.interpretationMs, disambiguation: result.kind === 'clarification',
      inputTokens: metrics.inputTokens, outputTokens: metrics.outputTokens, totalTokens: metrics.totalTokens,
      success: true,
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store, private' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível entender sua solicitação.';
    logVoiceLab({ event: 'interpretation_error', userId, accountId, transcription, success: false, error: message });
    return NextResponse.json({ message }, { status: 500 });
  }
}
