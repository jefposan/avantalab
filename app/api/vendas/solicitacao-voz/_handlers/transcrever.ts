import { NextResponse } from 'next/server';
import { getVoiceSalesContext, isVoiceCommandEnabled } from '@/app/lib/vendas-voice/auth';
import { logVoiceLab } from '@/app/lib/vendas-voice/logger';
import { transcribeVoiceAudio, validateVoiceAudio, VoiceTranscriptionError } from '@/app/lib/vendas-voice/transcription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const requestStartedAt = performance.now();
  try {
    const accountId = String(request.headers.get('x-avanta-vendas-account') || '').trim();
    const authStartedAt = performance.now();
    const context = await getVoiceSalesContext(request, accountId);
    if (!context) return NextResponse.json({ message: 'Faça login no Avanta Vendas para usar o laboratório.' }, { status: 401 });
    if (!await isVoiceCommandEnabled(context)) return NextResponse.json({ message: 'Ative a Solicitação por Voz nas Configurações do Avanta Vendas.' }, { status: 403 });
    const authMs = Math.round(performance.now() - authStartedAt);
    const form = await request.formData();
    const checkedAudio = validateVoiceAudio(form.get('audio'));
    if ('message' in checkedAudio) return NextResponse.json({ message: checkedAudio.message }, { status: checkedAudio.status });
    const result = await transcribeVoiceAudio({ audio: checkedAudio.audio, db: context.db, accountId });
    logVoiceLab({
      event: 'transcribed', userId: context.userId, accountId, transcription: result.transcription, success: true,
      interpretationMs: result.transcriptionMs, inputTokens: result.inputTokens, outputTokens: result.outputTokens,
      totalTokens: result.totalTokens, audioSeconds: result.audioSeconds,
    });
    const totalMs = Math.round(performance.now() - requestStartedAt);
    return NextResponse.json({ transcription: result.transcription, transcriptionMs: result.transcriptionMs }, {
      headers: {
        'Cache-Control': 'no-store, private',
        'Server-Timing': `auth;dur=${authMs}, hints;dur=${result.hintsMs}, transcribe;dur=${result.transcriptionMs}, total;dur=${totalMs}`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado ao transcrever o áudio.';
    logVoiceLab({ event: 'transcription_error', success: false, error: message });
    return NextResponse.json({ message }, { status: error instanceof VoiceTranscriptionError ? error.status : 500 });
  }
}
