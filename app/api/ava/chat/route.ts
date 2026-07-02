import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AVA_SYSTEM_PROMPT } from '../../../../supabase/functions/_shared/ava-system-prompt';

export const runtime = 'nodejs';

function chaveOpenAI() {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY_AVA ||
    ''
  );
}

// A Ava só responde para usuários autenticados (evita uso anônimo/abuso da chave).
async function usuarioAutenticado(request: Request): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.getUser(token);
    return Boolean(!error && data?.user);
  } catch {
    return false;
  }
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
    ? `${AVA_SYSTEM_PROMPT}\n\n--- DADOS FINANCEIROS ATUAIS DO USUARIO ---\n${contexto}\n---`
    : AVA_SYSTEM_PROMPT;

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
    if (!(await usuarioAutenticado(request))) {
      return NextResponse.json(
        { erro: true, mensagem: 'Faça login para conversar com a Ava.' },
        { status: 401 }
      );
    }

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
