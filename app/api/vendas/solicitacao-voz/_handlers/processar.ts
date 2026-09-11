import { after, NextResponse } from 'next/server';
import { getVoiceSalesContext, isVoiceCommandEnabled } from '@/app/lib/vendas-voice/auth';
import { buildVoiceResponse } from '@/app/lib/vendas-voice/data';
import { interpretVoiceCommand } from '@/app/lib/vendas-voice/interpreter';
import { logVoiceLab } from '@/app/lib/vendas-voice/logger';
import { validateVoiceIntentPayload } from '@/app/lib/vendas-voice/schema';
import type { VoiceEntityCandidate, VoiceEntitySelection, VoiceIntentPayload, VoiceMetrics } from '@/app/lib/vendas-voice/types';
import { enrichPendingCatalogForAccount } from '@/app/lib/vendas-voice/catalog-index';

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

function validSelections(value: unknown): VoiceEntitySelection[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, VoiceEntitySelection>();
  for (const candidate of value.slice(0, 12)) {
    const selection = validSelection(candidate);
    if (selection) unique.set(`${selection.type}:${selection.reference.toLocaleLowerCase('pt-BR')}`, selection);
  }
  return [...unique.values()];
}

function mergeSelection(selections: VoiceEntitySelection[], current: VoiceEntitySelection | null) {
  if (!current) return selections;
  const reference = current.reference.toLocaleLowerCase('pt-BR');
  return [
    ...selections.filter((selection) => selection.type !== current.type
      || selection.reference.toLocaleLowerCase('pt-BR') !== reference),
    current,
  ].slice(-12);
}

export async function POST(request: Request) {
  let userId = '';
  let accountId = '';
  let transcription = '';
  try {
    const body = await request.json();
    accountId = String(body?.accountId || '').trim();
    transcription = String(body?.transcription || '').trim().slice(0, 1000);
    const context = await getVoiceSalesContext(request, accountId);
    if (!context) return NextResponse.json({ message: 'Sua sessão do Avanta Vendas expirou.' }, { status: 401 });
    if (!await isVoiceCommandEnabled(context)) return NextResponse.json({ message: 'Ative a Solicitação por Voz nas Configurações do Avanta Vendas.' }, { status: 403 });
    userId = context.userId;
    const previousDraft = body?.previousDraft ? validateVoiceIntentPayload(body.previousDraft) : null;
    const manualDraft = body?.manualEdit === true && body?.manualDraft
      ? validateVoiceIntentPayload(body.manualDraft)
      : null;
    if (!transcription && !manualDraft) return NextResponse.json({ message: 'Fale sua solicitação para continuar.' }, { status: 400 });
    if (body?.manualEdit === true && (!previousDraft || !manualDraft
      || !['create_order', 'create_consignment'].includes(previousDraft.intent)
      || manualDraft.intent !== previousDraft.intent
      || manualDraft.customerReference !== previousDraft.customerReference)) {
      return NextResponse.json({ message: 'A edição do pedido não passou pela validação. Tente novamente.' }, { status: 400 });
    }
    const selection = validSelection(body?.selection);
    const selections = mergeSelection(validSelections(body?.selections), selection);
    let intent: VoiceIntentPayload;
    let metrics: VoiceMetrics;
    if (manualDraft && previousDraft) {
      intent = manualDraft;
      metrics = { interpretationMs: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    } else if (selection && previousDraft) {
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
    const result = await buildVoiceResponse({ db: context.db, accountId, draft: intent, transcription, metrics, selections });
    logVoiceLab({
      event: 'interpreted', userId, accountId, transcription, intent: intent.intent,
      interpretationMs: metrics.interpretationMs, disambiguation: result.kind === 'clarification',
      inputTokens: metrics.inputTokens, outputTokens: metrics.outputTokens, totalTokens: metrics.totalTokens,
      success: true,
    });
    after(async () => {
      try { await enrichPendingCatalogForAccount(context.admin, accountId, 8); }
      catch (error) { console.warn('[voice-catalog-index] Atualização oportunista adiada.', error instanceof Error ? error.message : error); }
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store, private' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível entender sua solicitação.';
    logVoiceLab({ event: 'interpretation_error', userId, accountId, transcription, success: false, error: message });
    return NextResponse.json({ message }, { status: 500 });
  }
}
