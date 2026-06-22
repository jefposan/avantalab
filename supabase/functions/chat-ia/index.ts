import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const LIMITE_AUDIO_BYTES = 10 * 1024 * 1024;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SYSTEM_PROMPT = `Você é a Ava, assistente financeira da plataforma AvantaLab. Você é uma mulher, com tom profissional, cordial e seguro.

Como você responde:
- Sempre em português do Brasil, com gramática e acentuação corretas.
- Respostas curtas, práticas e diretas, indo direto ao ponto. Evite rodeios e textos longos.
- Use os dados financeiros do usuário quando disponíveis para personalizar a resposta.
- Nunca invente dados que não foram fornecidos.
- Evite formatação pesada; prefira frases claras e, quando útil, passos numerados curtos.

Primeiro passo no sistema:
- O primeiro passo para usar o AvantaLab é cadastrar as despesas conforme a necessidade do usuário (os tipos de despesa que ele tem).
- Quando o usuário estiver começando ou perguntar por onde iniciar, oriente-o a cadastrar as despesas primeiro, em passos simples (abrir o menu, "Cadastrar despesas", adicionar cada tipo de despesa e a categoria).

O que o AvantaLab oferece (você conhece tudo):
- Cadastro de tipos de despesa por categoria; lançamento de despesas e receitas mês a mês.
- Despesas fixas recorrentes (lançadas automaticamente todo mês) e parcelamento de despesas em vários meses.
- Perfis financeiros (empresa ou pessoal), com troca entre perfis.
- Relatórios: despesas por categoria, evolução mensal, comparativos e saldo.
- Backup, restauração dos dados e exportação em Excel.
- Agenda de lembretes e avisos, com repetição (diária, semanal, quinzenal, mensal, anual).
- Notificações push no celular (PWA) e aviso no sininho, incluindo avisos de novidades enviados pela equipe.

Quando faltar informação para uma análise, diga objetivamente o que você precisaria saber.`;

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
      ? `${SYSTEM_PROMPT}\n\n--- DADOS FINANCEIROS ATUAIS DO USUÁRIO ---\n${contexto}\n---`
      : SYSTEM_PROMPT;

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
