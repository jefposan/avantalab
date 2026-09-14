import { listVoiceTranscriptionHints } from '@/app/lib/vendas-voice/data';

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const TRANSCRIPTION_CONTEXT = 'Transcrição de uma solicitação comercial em português do Brasil para o Avanta Vendas.';
const TRANSCRIPTION_KEYWORDS = ['pedido', 'consignado', 'consignação', 'pagamento', 'Pix', 'transferência', 'cartão', 'dinheiro', 'cliente', 'produto', 'quantidade'];

type VoiceDatabase = Parameters<typeof listVoiceTranscriptionHints>[0];

export type VoiceTranscriptionResult = {
  transcription: string;
  transcriptionMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  audioSeconds: number | null;
  hintsMs: number;
};

export class VoiceTranscriptionError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
    this.name = 'VoiceTranscriptionError';
  }
}

export function validateVoiceAudio(audio: FormDataEntryValue | null): { audio: File } | { message: string; status: number } {
  if (!(audio instanceof File) || audio.size === 0) return { message: 'Não identificamos áudio. Tente novamente.', status: 400 };
  if (audio.type && !audio.type.toLocaleLowerCase().startsWith('audio/')) return { message: 'O arquivo recebido não é um áudio válido.', status: 415 };
  if (audio.size > MAX_AUDIO_BYTES) return { message: 'O áudio ficou muito longo. Grave uma solicitação mais curta.', status: 413 };
  return { audio };
}

/** Uma única fonte de transcrição para os fluxos normal e combinado. */
export async function transcribeVoiceAudio({ audio, db, accountId }: { audio: File; db: VoiceDatabase; accountId: string }): Promise<VoiceTranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_AVA || '';
  if (!apiKey) throw new VoiceTranscriptionError('A transcrição ainda não está configurada no servidor.', 503);
  const transcriptionForm = new FormData();
  transcriptionForm.append('file', audio, audio.name || 'solicitacao-voz.webm');
  // Modelo especializado de alta precisão. O contexto é curto: não envia
  // clientes nem linhas do catálogo, somente poucos termos já validados.
  transcriptionForm.append('model', process.env.OPENAI_VOICE_TRANSCRIPTION_MODEL || 'gpt-transcribe');
  transcriptionForm.append('language', 'pt');
  const hintsStartedAt = performance.now();
  const learnedHints = await listVoiceTranscriptionHints(db, accountId, 24).catch(() => [] as string[]);
  const hintsMs = Math.round(performance.now() - hintsStartedAt);
  const baseContext = process.env.OPENAI_VOICE_TRANSCRIPTION_CONTEXT || TRANSCRIPTION_CONTEXT;
  transcriptionForm.append('prompt', learnedHints.length
    ? `${baseContext} Termos relevantes desta conta: ${learnedHints.join(', ')}.`
    : baseContext);
  [...TRANSCRIPTION_KEYWORDS, ...learnedHints].slice(0, 40)
    .forEach((keyword) => transcriptionForm.append('keywords[]', keyword));
  const startedAt = performance.now();
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: transcriptionForm,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    console.error('Erro OpenAI na transcrição do laboratório de voz:', result?.error?.message || response.status);
    throw new VoiceTranscriptionError('Não foi possível transcrever o áudio agora.');
  }
  const transcription = String(result?.text || '').trim().slice(0, 1000);
  if (!transcription) throw new VoiceTranscriptionError('Não identificamos fala no áudio.', 400);
  const usage = result?.usage || {};
  return {
    transcription,
    transcriptionMs: Math.round(performance.now() - startedAt),
    inputTokens: Number.isFinite(usage.input_tokens) ? usage.input_tokens : null,
    outputTokens: Number.isFinite(usage.output_tokens) ? usage.output_tokens : null,
    totalTokens: Number.isFinite(usage.total_tokens) ? usage.total_tokens : null,
    audioSeconds: Number.isFinite(usage.seconds) ? usage.seconds : null,
    hintsMs,
  };
}
