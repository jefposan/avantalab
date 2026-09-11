import { NextResponse } from 'next/server';
import { contextoVozCampo } from '../_auth';
import type { ModoVozCampo } from '@/app/recebimentos/voice/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const empresaId = String(form.get('empresaId') || '').trim();
    const mode = String(form.get('mode') || '') as ModoVozCampo;
    const context = await contextoVozCampo(request, empresaId, mode);
    if (!context) return NextResponse.json({ message: 'Sua sessão expirou ou não possui permissão para esta operação.' }, { status: 403 });
    const audio = form.get('audio');
    if (!(audio instanceof File) || !audio.size) return NextResponse.json({ message: 'Não identificamos áudio. Tente novamente.' }, { status: 400 });
    if (audio.type && !audio.type.toLowerCase().startsWith('audio/')) return NextResponse.json({ message: 'O arquivo recebido não é um áudio válido.' }, { status: 415 });
    if (audio.size > MAX_AUDIO_BYTES) return NextResponse.json({ message: 'O áudio ficou muito longo. Grave uma solicitação mais curta.' }, { status: 413 });
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_AVA || '';
    if (!apiKey) return NextResponse.json({ message: 'A transcrição ainda não está configurada no servidor.' }, { status: 503 });

    const [empresas, subempresas] = await Promise.all([
      context.admin.from('recebimentos_empresas').select('nome,atualizado_em').eq('empresa_id', empresaId).eq('ativo', true).order('atualizado_em', { ascending: false }).limit(36),
      context.admin.from('recebimentos_subempresas').select('nome,atualizado_em').eq('empresa_id', empresaId).eq('ativo', true).order('atualizado_em', { ascending: false }).limit(36),
    ]);
    const nomesUnicos = new Map<string, string>();
    for (const item of [...(empresas.data ?? []), ...(subempresas.data ?? [])]) {
      const nome = String(item.nome || '').trim().replace(/\s+/g, ' ').slice(0, 90);
      const chave = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
      if (nome && !nomesUnicos.has(chave)) nomesUnicos.set(chave, nome);
    }
    // Cadastros novos aparecem primeiro e passam a ajudar a transcrição na
    // chamada seguinte, sem exigir aliases manuais nem enviar outros dados.
    const nomes = [...nomesUnicos.values()].slice(0, 48);
    const keywords = mode === 'recebimentos'
      ? ['recebimento', 'pagamento', 'valor', 'Pix', 'dinheiro', 'cartão', 'boleto']
      : ['serviço', 'registrar', 'executar', 'agendamento', 'rotina', 'interna', 'revisão', 'extra', 'cliente'];
    const transcriptionForm = new FormData();
    transcriptionForm.append('file', audio, audio.name || 'solicitacao-voz.webm');
    transcriptionForm.append('model', process.env.OPENAI_VOICE_TRANSCRIPTION_MODEL || 'gpt-transcribe');
    transcriptionForm.append('languages[]', 'pt');
    transcriptionForm.append('prompt', `Solicitação em português do Brasil no sistema de ${mode}. Nomes comerciais cadastrados recentemente: ${nomes.join(', ')}.`.slice(0, 1400));
    [...keywords, ...nomes].slice(0, 64).forEach((keyword) => transcriptionForm.append('keywords[]', keyword));
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: transcriptionForm,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      console.error('Erro OpenAI na transcrição de Operações em Campo:', result?.error?.message || response.status);
      throw new Error('Não foi possível transcrever o áudio agora.');
    }
    const transcription = String(result?.text || '').trim().slice(0, 1000);
    if (!transcription) return NextResponse.json({ message: 'Não identificamos fala no áudio.' }, { status: 400 });
    return NextResponse.json({ transcription }, { headers: { 'Cache-Control': 'no-store, private' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível transcrever o áudio.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
