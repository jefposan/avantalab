import { NextResponse } from 'next/server';
import { exigirAdmin } from '../../lib/admin-server';

const TIPOS = ['versao', 'melhorias', 'atualizacoes', 'participe', 'orientacao', 'seguranca', 'dica'];

function naoAutorizado() {
  return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });
}

function tabelaPendente(error: { code?: string } | null) {
  return error?.code === '42P01' || error?.code === 'PGRST205';
}

export async function GET(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();
    const { data, error } = await db
      .from('vendas_mobile_conteudos')
      .select('id, pagina, tipo, titulo, descricao, ativo, criado_em, atualizado_em')
      .eq('pagina', 'informacoes')
      .order('criado_em', { ascending: false });
    if (tabelaPendente(error)) return NextResponse.json({ erro: false, conteudos: [], configuracaoPendente: true });
    if (error) throw error;
    return NextResponse.json({ erro: false, conteudos: data || [], configuracaoPendente: false });
  } catch (error) {
    console.error('Erro ao carregar conteúdos do Vendas:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível carregar os conteúdos.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();
    const corpo = await request.json();
    const pagina = String(corpo.pagina || '').trim();
    const tipo = String(corpo.tipo || '').trim();
    const titulo = String(corpo.titulo || '').trim();
    const descricao = String(corpo.descricao || '').trim();
    if (pagina !== 'informacoes' || !TIPOS.includes(tipo) || !titulo || !descricao) {
      return NextResponse.json({ erro: true, mensagem: 'Preencha tipo, título e descrição.' }, { status: 400 });
    }
    const { data, error } = await db
      .from('vendas_mobile_conteudos')
      .insert({ empresa_id: null, pagina, tipo, titulo, descricao, ativo: true })
      .select('id, pagina, tipo, titulo, descricao, ativo, criado_em, atualizado_em')
      .single();
    if (tabelaPendente(error)) return NextResponse.json({ erro: true, mensagem: 'Execute a migração de conteúdos do Vendas no Supabase.' }, { status: 503 });
    if (error) throw error;
    return NextResponse.json({ erro: false, conteudo: data });
  } catch (error) {
    console.error('Erro ao publicar conteúdo do Vendas:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível publicar o conteúdo.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ erro: true, mensagem: 'Conteúdo não informado.' }, { status: 400 });
    const { error } = await db.from('vendas_mobile_conteudos').delete().eq('id', id).eq('pagina', 'informacoes');
    if (error) throw error;
    return NextResponse.json({ erro: false });
  } catch (error) {
    console.error('Erro ao apagar conteúdo do Vendas:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível apagar o conteúdo.' }, { status: 500 });
  }
}
