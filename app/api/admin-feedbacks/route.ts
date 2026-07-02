import { NextResponse } from 'next/server';
import { exigirAdmin } from '../../lib/admin-server';

const STATUS_VALIDOS = ['novo', 'em_analise', 'respondido', 'arquivado'];

function naoAutorizado() {
  return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });
}

export async function GET(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();

    const { data, error } = await db
      .from('feedbacks')
      .select('id, empresa_id, usuario_id, acesso_id, nome_empresa, nome_usuario, email_usuario, tipo, mensagem, status, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ erro: false, feedbacks: data || [] });
  } catch (error) {
    console.error('Erro ao carregar feedbacks administrativos:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível carregar os feedbacks.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();

    const { id, status } = await request.json();
    if (!id || !STATUS_VALIDOS.includes(status)) {
      return NextResponse.json({ erro: true, mensagem: 'Feedback ou status inválido.' }, { status: 400 });
    }

    const { data, error } = await db
      .from('feedbacks')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ erro: false, feedback: data });
  } catch (error) {
    console.error('Erro ao atualizar feedback:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível atualizar o feedback.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ erro: true, mensagem: 'Feedback não informado.' }, { status: 400 });

    const { error } = await db.from('feedbacks').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ erro: false });
  } catch (error) {
    console.error('Erro ao apagar feedback:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível apagar o feedback.' }, { status: 500 });
  }
}
