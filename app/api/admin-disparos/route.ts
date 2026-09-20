import { NextResponse } from 'next/server';
import { exigirAdmin } from '../../lib/admin-server';

function naoAutorizado() {
  return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });
}

export async function GET(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();

    const { data, error } = await db
      .from('admin_disparos')
      .select('id, titulo, mensagem, usuarios, pushes_enviados, total_inscricoes, status, erro, aplicativo, origem, programacao_id, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return NextResponse.json({ erro: false, disparos: [], configuracaoPendente: true });
      }
      throw error;
    }

    return NextResponse.json({ erro: false, disparos: data || [] });
  } catch (error) {
    console.error('Erro ao carregar histórico de disparos:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível carregar o histórico.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();

    const {
      titulo: tituloRecebido,
      mensagem: mensagemRecebida,
      aplicativo: aplicativoRecebido,
      usuarioId: usuarioIdRecebido,
    } = await request.json();
    const titulo = String(tituloRecebido || '').trim() || 'Novidade no AvantaLab';
    const mensagem = String(mensagemRecebida || '').trim();
    const aplicativo = aplicativoRecebido === 'avantavendas' ? 'avantavendas' : 'gestao';
    const usuarioId = String(usuarioIdRecebido || '').trim();
    if (!mensagem) return NextResponse.json({ erro: true, mensagem: 'Digite a mensagem.' }, { status: 400 });
    if (usuarioId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(usuarioId)) {
      return NextResponse.json({ erro: true, mensagem: 'O usuário selecionado é inválido.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const internalToken = process.env.ADMIN_FEEDBACKS_TOKEN || '';
    if (!supabaseUrl || !anon || !internalToken) {
      return NextResponse.json({ erro: true, mensagem: 'Configuração de disparos incompleta.' }, { status: 500 });
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: `Bearer ${anon}` },
      body: JSON.stringify({
        token: internalToken,
        titulo,
        corpo: mensagem,
        aplicativo,
        ...(usuarioId ? { usuariosIds: [usuarioId] } : {}),
      }),
    });
    const result = await response.json().catch(() => ({}));
    const destinatarioEncontrado = !usuarioId || Number(result.usuarios || 0) === 1;
    const success = response.ok && result.ok && destinatarioEncontrado;

    const history = {
      titulo,
      mensagem,
      usuarios: Number(result.usuarios || 0),
      pushes_enviados: Number(result.enviados || 0),
      total_inscricoes: Number(result.total || 0),
      status: success ? 'enviado' : 'erro',
      erro: success ? null : String(result.erro || (usuarioId && !destinatarioEncontrado ? 'O usuário não possui acesso ativo ao aplicativo selecionado.' : 'Falha no disparo.')),
      aplicativo,
      origem: 'manual',
    };
    const historyResult = await db.from('admin_disparos').insert(history).select().single();

    if (!success) {
      return NextResponse.json({ erro: true, mensagem: history.erro }, { status: usuarioId && !destinatarioEncontrado ? 404 : response.status || 500 });
    }

    return NextResponse.json({ erro: false, resultado: result, disparo: historyResult.data || history });
  } catch (error) {
    console.error('Erro ao disparar aviso administrativo:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível realizar o disparo.' }, { status: 500 });
  }
}
