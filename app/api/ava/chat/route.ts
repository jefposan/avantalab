import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AVA_SYSTEM_PROMPT } from '../../../../supabase/functions/_shared/ava-system-prompt';
import { COBRANCA_ATIVA, podeUsar } from '../../../lib/cobranca';
import { resolverEstadoAcessoParaUsuario } from '../../../lib/cobranca-servidor';

export const runtime = 'nodejs';

function chaveOpenAI() {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY_AVA ||
    ''
  );
}

// A Ava só responde para usuários autenticados (evita uso anônimo/abuso da chave).
// Devolve o id do usuário (ou null se não autenticado).
async function usuarioAutenticado(request: Request): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.getUser(token);
    return !error && data?.user ? data.user.id : null;
  } catch {
    return null;
  }
}

// Cobrança: a Ava é recurso premium. Confirma o vínculo do usuário com o
// perfil e checa o estado de acesso. Fail-open: sem flag, sem empresaId
// (clientes antigos em cache) ou com falha de infra, não bloqueia.
async function avaLiberadaParaPerfil(userId: string, empresaId: string): Promise<boolean> {
  if (!COBRANCA_ATIVA || !empresaId) return true;
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !serviceRole) return true;
    const db = createClient(supabaseUrl, serviceRole);
    const { data: vinculo } = await db
      .from('usuarios_empresa')
      .select('id')
      .eq('user_id', userId)
      .eq('empresa_id', empresaId)
      .limit(1)
      .maybeSingle();
    if (!vinculo) {
      const { data: acessoVendas } = await db
        .from('vendas_mobile_acessos')
        .select('id')
        .eq('user_id', userId)
        .eq('empresa_id', empresaId)
        .eq('status', 'ativo')
        .limit(1)
        .maybeSingle();
      if (!acessoVendas) return false;
      return true;
    }
    const estado = await resolverEstadoAcessoParaUsuario(empresaId, userId);
    return podeUsar('ava', estado);
  } catch {
    return true; // fail-open
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
    const userId = await usuarioAutenticado(request);
    if (!userId) {
      return NextResponse.json(
        { erro: true, mensagem: 'Faça login para conversar com a Ava.' },
        { status: 401 }
      );
    }

    const payload = await request.json();
    const messages = mensagensValidas(payload?.messages);
    const contexto = String(payload?.contexto || '').trim();
    const empresaId = String(payload?.empresaId || '').trim();

    if (!(await avaLiberadaParaPerfil(userId, empresaId))) {
      return NextResponse.json(
        { erro: true, premium: true, mensagem: 'A Ava faz parte do Premium Pessoal. Assine para desbloquear.' },
        { status: 403 }
      );
    }

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
