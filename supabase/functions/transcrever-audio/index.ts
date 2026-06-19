import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const LIMITE_AUDIO_BYTES = 10 * 1024 * 1024;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ erro: true, mensagem: 'Metodo nao permitido.' }, 405);
  }

  try {
    if (!OPENAI_API_KEY) {
      return json(
        { erro: true, mensagem: 'Transcricao de audio ainda nao configurada no servidor.' },
        500
      );
    }

    const formData = await req.formData();
    const audio = formData.get('audio');

    if (!(audio instanceof File) || audio.size === 0) {
      return json({ erro: true, mensagem: 'Envie um audio valido para transcrever.' }, 400);
    }

    if (audio.size > LIMITE_AUDIO_BYTES) {
      return json(
        { erro: true, mensagem: 'O audio esta muito grande. Grave uma mensagem mais curta.' },
        413
      );
    }

    const transcricaoForm = new FormData();
    transcricaoForm.append('file', audio, audio.name || 'ava-audio.webm');
    transcricaoForm.append('model', 'whisper-1');
    transcricaoForm.append('language', 'pt');

    const resposta = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: transcricaoForm,
    });

    const resultado = await resposta.json().catch(() => null);

    if (!resposta.ok) {
      console.error('Erro ao transcrever audio Ava:', resultado);
      return json(
        {
          erro: true,
          mensagem: resultado?.error?.message || 'Nao foi possivel transcrever o audio.',
        },
        500
      );
    }

    const texto = String(resultado?.text || '').trim();

    if (!texto) {
      return json({ erro: true, mensagem: 'Nao identificamos fala no audio.' }, 400);
    }

    return json({ erro: false, texto });
  } catch (err) {
    console.error('Erro inesperado na transcricao de audio Ava:', err);
    return json({ erro: true, mensagem: 'Erro inesperado ao transcrever o audio.' }, 500);
  }
});
