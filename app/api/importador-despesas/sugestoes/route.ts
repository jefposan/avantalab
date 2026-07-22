import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

type ItemRecebido = { id?: unknown; descricao?: unknown };

function clienteAutenticado(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !anon) return null;
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizarDescricao(valor: unknown) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(?:cartao|compra|lancamento)\b/g, ' ')
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, ' ')
    .replace(/\b\d{4,}\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
    const itens = Array.isArray(corpo?.itens) ? corpo.itens as ItemRecebido[] : [];
    if (!empresaId || !itens.length || itens.length > 500 || itens.some((item) => typeof item.id !== 'string' || !item.id.trim() || typeof item.descricao !== 'string' || item.descricao.length > 500)) {
      return NextResponse.json({ erro: true, mensagem: 'A lista de descrições para sugestão é inválida.' }, { status: 400 });
    }

    const { data: acesso, error: erroAcesso } = await supabase
      .from('usuarios_empresa')
      .select('user_id')
      .eq('empresa_id', empresaId)
      .eq('user_id', autenticacao.user.id)
      .eq('status', 'ativo')
      .in('perfil', ['gestor_master', 'administrador', 'operador_completo', 'operador_simples'])
      .maybeSingle();
    if (erroAcesso || !acesso) {
      return NextResponse.json({ erro: true, mensagem: 'Você não tem permissão para consultar este perfil.' }, { status: 403 });
    }

    const chavesSolicitadas = new Set(itens.map((item) => normalizarDescricao(item.descricao)).filter(Boolean));
    if (!chavesSolicitadas.size) return NextResponse.json({ erro: false, sugestoes: [] });

    const { data: historico, error: erroHistorico } = await supabase
      .from('lancamentos')
      .select('descricao, despesa_nome')
      .eq('empresa_id', empresaId)
      .not('despesa_nome', 'is', null)
      .order('id', { ascending: false })
      .range(0, 4999);
    if (erroHistorico) {
      console.error('Erro ao consultar histórico do importador:', erroHistorico.message);
      return NextResponse.json({ erro: true, mensagem: 'Não foi possível consultar o histórico de lançamentos.' }, { status: 400 });
    }

    const votos = new Map<string, Map<string, number>>();
    for (const lancamento of historico || []) {
      const chave = normalizarDescricao(lancamento.descricao);
      const tipo = typeof lancamento.despesa_nome === 'string' ? lancamento.despesa_nome.trim() : '';
      if (!chavesSolicitadas.has(chave) || !tipo) continue;
      const porTipo = votos.get(chave) || new Map<string, number>();
      porTipo.set(tipo, (porTipo.get(tipo) || 0) + 1);
      votos.set(chave, porTipo);
    }

    const sugestoes = itens.flatMap((item) => {
      const porTipo = votos.get(normalizarDescricao(item.descricao));
      if (!porTipo?.size) return [];
      const ordenados = [...porTipo.entries()].sort((a, b) => b[1] - a[1]);
      const [tipo, ocorrencias] = ordenados[0];
      const total = ordenados.reduce((soma, [, quantidade]) => soma + quantidade, 0);
      if ((ocorrencias / total) < 0.8 || (ordenados[1]?.[1] === ocorrencias)) return [];
      return [{ id: String(item.id), tipo, ocorrencias }];
    });

    return NextResponse.json({ erro: false, sugestoes });
  } catch (error) {
    console.error('Erro inesperado ao sugerir tipos de despesa:', error instanceof Error ? error.message : error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível sugerir os tipos agora.' }, { status: 500 });
  }
}
