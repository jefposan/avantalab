import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AVA_SYSTEM_PROMPT } from '../_shared/ava-system-prompt.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const LIMITE_AUDIO_BYTES = 10 * 1024 * 1024;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

async function transcreverAudio(req: Request) {
  if (!OPENAI_API_KEY) {
    return jsonResponse(
      { erro: true, mensagem: 'Transcricao de audio ainda nao configurada no servidor.' },
      500
    );
  }

  const formData = await req.formData();
  const audio = formData.get('audio');

  if (!(audio instanceof File) || audio.size === 0) {
    return jsonResponse({ erro: true, mensagem: 'Envie um audio valido para transcrever.' }, 400);
  }

  if (audio.size > LIMITE_AUDIO_BYTES) {
    return jsonResponse(
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
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: transcricaoForm,
  });

  const resultado = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    return jsonResponse(
      {
        erro: true,
        mensagem: resultado?.error?.message || 'Nao foi possivel transcrever o audio.',
      },
      500
    );
  }

  const texto = String(resultado?.text || '').trim();

  if (!texto) {
    return jsonResponse({ erro: true, mensagem: 'Nao identificamos fala no audio.' }, 400);
  }

  return jsonResponse({ erro: false, texto });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const contentType = req.headers.get('content-type') || '';

    if (url.searchParams.get('acao') === 'transcrever-audio' || contentType.indexOf('multipart/form-data') >= 0) {
      return await transcreverAudio(req);
    }

    const { messages, contexto } = await req.json();

    const systemWithContext = contexto
      ? `${AVA_SYSTEM_PROMPT}\n\n--- DADOS FINANCEIROS ATUAIS DO USUÁRIO ---\n${contexto}\n---`
      : AVA_SYSTEM_PROMPT;

    const openaiMessages = [
      { role: 'system', content: systemWithContext },
      ...messages,
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: openaiMessages,
        stream: true,
        max_tokens: 600,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const erro = await response.text();
      return new Response(JSON.stringify({ erro: `OpenAI error: ${erro}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Repassar o stream da OpenAI diretamente ao cliente
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ erro: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
