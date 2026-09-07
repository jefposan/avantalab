import { NextResponse } from 'next/server';
import { getVoiceSalesContext, isVoiceCommandEnabled } from '@/app/lib/vendas-voice/auth';
import { logVoiceLab } from '@/app/lib/vendas-voice/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const accountId = String(request.headers.get('x-avanta-vendas-account') || '').trim();
    const context = await getVoiceSalesContext(request, accountId);
    if (!context) return NextResponse.json({ message: 'Faça login no Avanta Vendas para usar o laboratório.' }, { status: 401 });
    if (!await isVoiceCommandEnabled(context)) return NextResponse.json({ message: 'Ative a Solicitação por Voz nas Configurações do Avanta Vendas.' }, { status: 403 });
    const form = await request.formData();
    const audio = form.get('audio');
    if (!(audio instanceof File) || audio.size === 0) return NextResponse.json({ message: 'Não identificamos áudio. Tente novamente.' }, { status: 400 });
    if (audio.type && !audio.type.toLocaleLowerCase().startsWith('audio/')) return NextResponse.json({ message: 'O arquivo recebido não é um áudio válido.' }, { status: 415 });
    if (audio.size > MAX_AUDIO_BYTES) return NextResponse.json({ message: 'O áudio ficou muito longo. Grave uma solicitação mais curta.' }, { status: 413 });

    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_AVA || '';
    if (!apiKey) return NextResponse.json({ message: 'A transcrição ainda não está configurada no servidor.' }, { status: 503 });
    const transcriptionForm = new FormData();
    transcriptionForm.append('file', audio, audio.name || 'solicitacao-voz.webm');
    transcriptionForm.append('model', 'whisper-1');
    transcriptionForm.append('language', 'pt');
    const startedAt = performance.now();
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: transcriptionForm,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      console.error('Erro OpenAI na transcrição do laboratório de voz:', result?.error?.message || response.status);
      throw new Error('Não foi possível transcrever o áudio agora.');
    }
    const transcription = String(result?.text || '').trim().slice(0, 1000);
    if (!transcription) return NextResponse.json({ message: 'Não identificamos fala no áudio.' }, { status: 400 });
    const transcriptionMs = Math.round(performance.now() - startedAt);
    logVoiceLab({ event: 'transcribed', userId: context.userId, accountId, transcription, success: true });
    return NextResponse.json({ transcription, transcriptionMs }, { headers: { 'Cache-Control': 'no-store, private' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado ao transcrever o áudio.';
    logVoiceLab({ event: 'transcription_error', success: false, error: message });
    return NextResponse.json({ message }, { status: 500 });
  }
}
