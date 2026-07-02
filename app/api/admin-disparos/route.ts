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
      .select('id, titulo, mensagem, usuarios, pushes_enviados, total_inscricoes, status, erro, created_at')
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

    const { titulo: tituloRecebido, mensagem: mensagemRecebida } = await request.json();
    const titulo = String(tituloRecebido || '').trim() || 'Novidade no AvantaLab';
    const mensagem = String(mensagemRecebida || '').trim();
    if (!mensagem) return NextResponse.json({ erro: true, mensagem: 'Digite a mensagem.' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const internalToken = process.env.ADMIN_FEEDBACKS_TOKEN || '';
    if (!supabaseUrl || !anon || !internalToken) {
      return NextResponse.json({ erro: true, mensagem: 'Configuração de disparos incompleta.' }, { status: 500 });
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: `Bearer ${anon}` },
      body: JSON.stringify({ token: internalToken, titulo, corpo: mensagem }),
    });
    const result = await response.json().catch(() => ({}));
    const success = response.ok && result.ok;

    const history = {
      titulo,
      mensagem,
      usuarios: Number(result.usuarios || 0),
      pushes_enviados: Number(result.enviados || 0),
      total_inscricoes: Number(result.total || 0),
      status: success ? 'enviado' : 'erro',
      erro: success ? null : String(result.erro || 'Falha no disparo.'),
    };
    const historyResult = await db.from('admin_disparos').insert(history).select().single();

    if (!success) {
      return NextResponse.json({ erro: true, mensagem: history.erro }, { status: response.status || 500 });
    }

    return NextResponse.json({ erro: false, resultado: result, disparo: historyResult.data || history });
  } catch (error) {
    console.error('Erro ao disparar aviso administrativo:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível realizar o disparo.' }, { status: 500 });
  }
}
