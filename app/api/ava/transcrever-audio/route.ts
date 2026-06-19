import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          erro: true,
          mensagem: 'Transcricao de audio indisponivel no momento.',
        },
        { status: 500 }
      );
    }

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

    if (audio.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          erro: true,
          mensagem: 'O audio esta muito grande. Grave uma mensagem mais curta.',
        },
        { status: 413 }
      );
    }

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
