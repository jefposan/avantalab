import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

type LancamentoRecebido = {
  data?: unknown;
  tipo_despesa?: unknown;
  descricao?: unknown;
  valor?: unknown;
  item_chave?: unknown;
};

function clienteAutenticado(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !anon) return null;
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: Request) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const supabase = clienteAutenticado(token);
    if (!token || !supabase) {
      return NextResponse.json({ erro: true, mensagem: 'Sua sessão expirou. Entre novamente.' }, { status: 401 });
    }

    const { data: autenticacao, error: erroAutenticacao } = await supabase.auth.getUser(token);
    if (erroAutenticacao || !autenticacao.user) {
      return NextResponse.json({ erro: true, mensagem: 'Sua sessão expirou. Entre novamente.' }, { status: 401 });
    }

    const corpo = await request.json().catch(() => null);
    const empresaId = typeof corpo?.empresaId === 'string' ? corpo.empresaId.trim() : '';
    const loteChave = typeof corpo?.loteChave === 'string' ? corpo.loteChave.trim() : '';
    const lancamentos = Array.isArray(corpo?.lancamentos) ? corpo.lancamentos as LancamentoRecebido[] : [];
    if (!empresaId || !loteChave || !lancamentos.length || lancamentos.length > 500) {
      return NextResponse.json({ erro: true, mensagem: 'O lote de despesas está incompleto ou excede 500 lançamentos.' }, { status: 400 });
    }

    const invalido = lancamentos.some((item) =>
      typeof item.data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.data)
      || typeof item.tipo_despesa !== 'string' || !item.tipo_despesa.trim()
      || typeof item.descricao !== 'string'
      || typeof item.item_chave !== 'string' || !item.item_chave.trim()
      || typeof item.valor !== 'number' || !Number.isFinite(item.valor) || item.valor <= 0
    );
    if (invalido) {
      return NextResponse.json({ erro: true, mensagem: 'Revise data, tipo, descrição e valor antes de confirmar.' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('importar_lancamentos_despesas_rpc', {
      p_empresa_id: empresaId,
      p_lote_chave: loteChave,
      p_lancamentos: lancamentos,
    });
    if (error) {
      console.error('Erro ao confirmar importação de despesas:', error.message);
      return NextResponse.json({ erro: true, mensagem: error.message || 'Não foi possível criar os lançamentos.' }, { status: 400 });
    }

    return NextResponse.json({ erro: false, resultado: data });
  } catch (error) {
    console.error('Erro inesperado ao confirmar importação:', error instanceof Error ? error.message : error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível criar os lançamentos agora.' }, { status: 500 });
  }
}

