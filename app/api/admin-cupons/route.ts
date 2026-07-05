import { NextResponse } from 'next/server';
import { exigirAdmin } from '../../lib/admin-server';

const CAMPOS = 'id, codigo, tipo, duracao_valor, duracao_unidade, max_usos, usos, validade, ativo, criado_em';
const UNIDADES = ['dias', 'semanas', 'meses'];

function naoAutorizado() {
  return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });
}

// Lista todos os cupons.
export async function GET(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();

    const { data, error } = await db.from('cupons').select(CAMPOS).order('criado_em', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ erro: false, cupons: data || [] });
  } catch (error) {
    console.error('Erro ao carregar cupons:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível carregar os cupons.' }, { status: 500 });
  }
}

// Cria um cupom.
export async function POST(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();

    const corpo = await request.json().catch(() => ({}));
    const codigo = String(corpo.codigo || '').trim().toUpperCase();
    const tipo = corpo.tipo === 'periodo' ? 'periodo' : 'vitalicio';
    const duracaoValor = tipo === 'periodo' ? (Number(corpo.duracaoValor) || 0) : null;
    const duracaoUnidade = tipo === 'periodo' ? (UNIDADES.includes(corpo.duracaoUnidade) ? corpo.duracaoUnidade : 'meses') : null;
    const maxUsos = corpo.maxUsos ? Math.max(1, Number(corpo.maxUsos)) : null; // null = ilimitado

    if (!codigo) return NextResponse.json({ erro: true, mensagem: 'Informe o código.' }, { status: 400 });
    if (tipo === 'periodo' && (!duracaoValor || duracaoValor < 1)) {
      return NextResponse.json({ erro: true, mensagem: 'Informe a duração do cupom por período.' }, { status: 400 });
    }

    const { data, error } = await db
      .from('cupons')
      .insert({ codigo, tipo, duracao_valor: duracaoValor, duracao_unidade: duracaoUnidade, max_usos: maxUsos, ativo: true })
      .select(CAMPOS)
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ erro: true, mensagem: 'Já existe um cupom com esse código.' }, { status: 409 });
      }
      throw error;
    }
    return NextResponse.json({ erro: false, cupom: data });
  } catch (error) {
    console.error('Erro ao criar cupom:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível criar o cupom.' }, { status: 500 });
  }
}

// Ativa/desativa um cupom.
export async function PATCH(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();

    const { id, ativo } = await request.json();
    if (!id || typeof ativo !== 'boolean') {
      return NextResponse.json({ erro: true, mensagem: 'Dados inválidos.' }, { status: 400 });
    }
    const { error } = await db.from('cupons').update({ ativo, atualizado_em: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ erro: false });
  } catch (error) {
    console.error('Erro ao atualizar cupom:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível atualizar o cupom.' }, { status: 500 });
  }
}
