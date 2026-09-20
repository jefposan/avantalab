import { NextResponse } from 'next/server';
import { exigirAdmin } from '../../../lib/admin-server';

const APLICATIVOS = new Set(['gestao', 'avantavendas']);
const GATILHOS = new Set(['data_programada', 'apos_cadastro', 'sem_acesso']);
const UNIDADES = new Set(['horas', 'dias', 'semanas']);

function naoAutorizado() {
  return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });
}

export async function GET(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();
    const { data, error } = await db
      .from('admin_disparos_programados')
      .select('id, nome, aplicativo, gatilho, titulo, mensagem, data_programada, intervalo_valor, intervalo_unidade, ativo, ultima_execucao_em, criado_em, atualizado_em')
      .order('criado_em', { ascending: false });
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return NextResponse.json({ erro: false, programacoes: [], configuracaoPendente: true });
      }
      throw error;
    }
    return NextResponse.json({ erro: false, programacoes: data || [] });
  } catch (error) {
    console.error('Erro ao carregar programações de disparos:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível carregar as automações.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();
    const body = await request.json();
    const nome = String(body.nome || '').trim();
    const titulo = String(body.titulo || '').trim();
    const mensagem = String(body.mensagem || '').trim();
    const aplicativo = String(body.aplicativo || 'gestao');
    const gatilho = String(body.gatilho || 'data_programada');
    const intervaloUnidade = body.intervaloUnidade ? String(body.intervaloUnidade) : null;
    const intervaloValor = body.intervaloValor == null ? null : Number(body.intervaloValor);
    const dataProgramada = body.dataProgramada ? new Date(String(body.dataProgramada)) : null;

    if (!nome || !titulo || !mensagem) {
      return NextResponse.json({ erro: true, mensagem: 'Preencha nome, título e mensagem.' }, { status: 400 });
    }
    if (!APLICATIVOS.has(aplicativo) || !GATILHOS.has(gatilho)) {
      return NextResponse.json({ erro: true, mensagem: 'Aplicativo ou gatilho inválido.' }, { status: 400 });
    }
    if (gatilho === 'data_programada' && (!dataProgramada || Number.isNaN(dataProgramada.getTime()))) {
      return NextResponse.json({ erro: true, mensagem: 'Informe uma data e hora válidas.' }, { status: 400 });
    }
    if (gatilho !== 'data_programada' && (
      !Number.isInteger(intervaloValor) || Number(intervaloValor) < 1 || !intervaloUnidade || !UNIDADES.has(intervaloUnidade)
    )) {
      return NextResponse.json({ erro: true, mensagem: 'Informe um intervalo válido.' }, { status: 400 });
    }

    const { data, error } = await db.from('admin_disparos_programados').insert({
      nome,
      aplicativo,
      gatilho,
      titulo,
      mensagem,
      data_programada: gatilho === 'data_programada' ? dataProgramada!.toISOString() : null,
      intervalo_valor: gatilho === 'data_programada' ? null : intervaloValor,
      intervalo_unidade: gatilho === 'data_programada' ? null : intervaloUnidade,
      ativo: true,
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ erro: false, programacao: data });
  } catch (error) {
    console.error('Erro ao criar programação de disparo:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível criar a automação.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();
    const body = await request.json();
    const id = String(body.id || '');
    if (!id) {
      return NextResponse.json({ erro: true, mensagem: 'Programação inválida.' }, { status: 400 });
    }

    let alteracoes: Record<string, unknown>;
    if (typeof body.ativo === 'boolean' && body.nome === undefined) {
      alteracoes = { ativo: body.ativo, atualizado_em: new Date().toISOString() };
    } else {
      const nome = String(body.nome || '').trim();
      const titulo = String(body.titulo || '').trim();
      const mensagem = String(body.mensagem || '').trim();
      const aplicativo = String(body.aplicativo || '');
      const gatilho = String(body.gatilho || '');
      const intervaloUnidade = body.intervaloUnidade ? String(body.intervaloUnidade) : null;
      const intervaloValor = body.intervaloValor == null ? null : Number(body.intervaloValor);
      const dataProgramada = body.dataProgramada ? new Date(String(body.dataProgramada)) : null;

      if (!nome || !titulo || !mensagem) {
        return NextResponse.json({ erro: true, mensagem: 'Preencha nome, título e mensagem.' }, { status: 400 });
      }
      if (!APLICATIVOS.has(aplicativo) || !GATILHOS.has(gatilho)) {
        return NextResponse.json({ erro: true, mensagem: 'Aplicativo ou gatilho inválido.' }, { status: 400 });
      }
      if (gatilho === 'data_programada' && (!dataProgramada || Number.isNaN(dataProgramada.getTime()))) {
        return NextResponse.json({ erro: true, mensagem: 'Informe uma data e hora válidas.' }, { status: 400 });
      }
      if (gatilho !== 'data_programada' && (
        !Number.isInteger(intervaloValor) || Number(intervaloValor) < 1 || Number(intervaloValor) > 999 || !intervaloUnidade || !UNIDADES.has(intervaloUnidade)
      )) {
        return NextResponse.json({ erro: true, mensagem: 'Informe um intervalo válido.' }, { status: 400 });
      }

      alteracoes = {
        nome,
        aplicativo,
        gatilho,
        titulo,
        mensagem,
        data_programada: gatilho === 'data_programada' ? dataProgramada!.toISOString() : null,
        intervalo_valor: gatilho === 'data_programada' ? null : intervaloValor,
        intervalo_unidade: gatilho === 'data_programada' ? null : intervaloUnidade,
        atualizado_em: new Date().toISOString(),
      };
    }

    const { data, error } = await db.from('admin_disparos_programados').update(alteracoes).eq('id', id).select().single();
    if (error) throw error;
    return NextResponse.json({ erro: false, programacao: data });
  } catch (error) {
    console.error('Erro ao atualizar programação de disparo:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível atualizar a automação.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();
    const id = new URL(request.url).searchParams.get('id') || '';
    if (!id) return NextResponse.json({ erro: true, mensagem: 'Programação inválida.' }, { status: 400 });
    const { error } = await db.from('admin_disparos_programados').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ erro: false });
  } catch (error) {
    console.error('Erro ao excluir programação de disparo:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível excluir a automação.' }, { status: 500 });
  }
}
