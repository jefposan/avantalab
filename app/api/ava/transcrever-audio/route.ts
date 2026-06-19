import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const LIMITE_AUDIO_BYTES = 10 * 1024 * 1024;

function chaveOpenAI() {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY_AVA ||
    process.env.NEXT_PUBLIC_OPENAI_API_KEY ||
    ''
  );
}

async function transcreverComOpenAI(audio: File, apiKey: string) {
  const transcricaoForm = new FormData();
  transcricaoForm.append('file', audio, audio.name || 'ava-audio.webm');
  transcricaoForm.append('model', 'whisper-1');
  transcricaoForm.append('language', 'pt');

  const resposta = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: transcricaoForm,
  });

  const resultado = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    console.error('Erro ao transcrever audio Ava:', resultado);

    return NextResponse.json(
      {
        erro: true,
        mensagem:
          resultado?.error?.message ||
          'Nao foi possivel transcrever o audio.',
      },
      { status: 500 }
    );
  }

  const texto = String(resultado?.text || '').trim();

  if (!texto) {
    return NextResponse.json(
      {
        erro: true,
        mensagem: 'Nao identificamos fala no audio.',
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    erro: false,
    texto,
  });
}

async function transcreverComSupabase(audio: File) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) return null;

  const respostaDireta = await chamarTranscricaoSupabase(
    `${supabaseUrl}/functions/v1/transcrever-audio`,
    audio,
    supabaseAnonKey
  );

  if (respostaDireta) return respostaDireta;

  return chamarTranscricaoSupabase(
    `${supabaseUrl}/functions/v1/chat-ia?acao=transcrever-audio`,
    audio,
    supabaseAnonKey
  );
}

async function chamarTranscricaoSupabase(url: string, audio: File, supabaseAnonKey: string) {
  const formData = new FormData();
  formData.append('audio', audio, audio.name || 'ava-audio.webm');

  const resposta = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: formData,
  }).catch((error) => {
    console.error('Erro ao chamar transcricao Ava pelo Supabase:', error);
    return null;
  });

  if (!resposta) return null;

  const resultado = await resposta.json().catch(() => null);

  if (!resposta.ok || !resultado?.texto) {
    console.error('Erro ao transcrever audio Ava pelo Supabase:', resultado);
    return null;
  }

  return NextResponse.json({
    erro: false,
    texto: String(resultado.texto || '').trim(),
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get('audio');

    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json(
        {
          erro: true,
          mensagem: 'Envie um audio valido para transcrever.',
        },
        { status: 400 }
      );
    }

    if (audio.size > LIMITE_AUDIO_BYTES) {
      return NextResponse.json(
        {
          erro: true,
          mensagem: 'O audio esta muito grande. Grave uma mensagem mais curta.',
        },
        { status: 413 }
      );
    }

    const apiKey = chaveOpenAI();

    if (apiKey) {
      return transcreverComOpenAI(audio, apiKey);
    }

    const respostaSupabase = await transcreverComSupabase(audio);
    if (respostaSupabase) return respostaSupabase;

    return NextResponse.json(
      {
        erro: true,
        mensagem: 'Transcricao de audio ainda nao configurada no servidor.',
      },
      { status: 500 }
    );
  } catch (error) {
    console.error('Erro inesperado na transcricao de audio Ava:', error);

    return NextResponse.json(
      {
        erro: true,
        mensagem: 'Erro inesperado ao transcrever o audio.',
      },
      { status: 500 }
    );
  }
}
