import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

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

function chaveOpenAI() {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY_AVA ||
    process.env.NEXT_PUBLIC_OPENAI_API_KEY ||
    ''
  );
}

function mensagensValidas(messages: unknown) {
  if (!Array.isArray(messages)) return [];

  return messages
    .map((message) => {
      if (!message || typeof message !== 'object') return null;
      const item = message as { role?: unknown; content?: unknown };
      const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null;
      const content = String(item.content || '').trim();
      if (!role || !content) return null;
      return { role, content };
    })
    .filter((message): message is { role: string; content: string } => Boolean(message))
    .slice(-20);
}

async function responderComOpenAI(messages: Array<{ role: string; content: string }>, contexto: string) {
  const apiKey = chaveOpenAI();
  if (!apiKey) return null;

  const systemWithContext = contexto
    ? `${SYSTEM_PROMPT}\n\n--- DADOS FINANCEIROS ATUAIS DO USUARIO ---\n${contexto}\n---`
    : SYSTEM_PROMPT;

  const resposta = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemWithContext },
        ...messages,
      ],
      stream: true,
      max_tokens: 600,
      temperature: 0.4,
    }),
  });

  if (!resposta.ok) {
    const erro = await resposta.text().catch(() => '');
    console.error('Erro OpenAI chat Ava:', erro);

    return NextResponse.json(
      {
        erro: true,
        mensagem: 'A Ava nao conseguiu gerar a resposta agora.',
      },
      { status: 500 }
    );
  }

  return new Response(resposta.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}

async function responderComSupabase(body: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        erro: true,
        mensagem: 'Ava ainda nao configurada no servidor.',
      },
      { status: 500 }
    );
  }

  const resposta = await fetch(`${supabaseUrl}/functions/v1/chat-ia`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body,
  }).catch((error) => {
    console.error('Erro ao chamar chat Ava pelo Supabase:', error);
    return null;
  });

  if (!resposta) {
    return NextResponse.json(
      {
        erro: true,
        mensagem: 'A Ava nao conseguiu se conectar agora.',
      },
      { status: 500 }
    );
  }

  if (!resposta.ok) {
    const erro = await resposta.text().catch(() => '');
    console.error('Erro Supabase chat Ava:', erro);

    return NextResponse.json(
      {
        erro: true,
        mensagem: 'A Ava nao conseguiu gerar a resposta agora.',
      },
      { status: 500 }
    );
  }

  return new Response(resposta.body, {
    headers: {
      'Content-Type': resposta.headers.get('Content-Type') || 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const messages = mensagensValidas(payload?.messages);
    const contexto = String(payload?.contexto || '').trim();

    if (!messages.length) {
      return NextResponse.json(
        {
          erro: true,
          mensagem: 'Envie uma mensagem para a Ava.',
        },
        { status: 400 }
      );
    }

    const body = JSON.stringify({ messages, contexto });
    const respostaOpenAI = await responderComOpenAI(messages, contexto);
    if (respostaOpenAI) return respostaOpenAI;

    return responderComSupabase(body);
  } catch (error) {
    console.error('Erro inesperado no chat Ava:', error);

    return NextResponse.json(
      {
        erro: true,
        mensagem: 'Erro inesperado ao responder com a Ava.',
      },
      { status: 500 }
    );
  }
}
