import { NextResponse } from 'next/server';
import { exigirAdmin } from '../../lib/admin-server';
import { resumoDownloadsDasLojas, sincronizarDownloadsDasLojas } from '../../lib/downloads-lojas-servidor';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const { autorizado } = await exigirAdmin(request);
    if (!autorizado) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });
    return NextResponse.json({ janelaDias: 90, lojas: await resumoDownloadsDasLojas() }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Erro ao consultar downloads das lojas:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível consultar os downloads oficiais.' }, { status: 500 });
  }
}

// A tela administrativa não recebe nem conhece o segredo do cron. Quando o
// administrador escolhe uma plataforma, ela chama esta ação autenticada, que
// reutiliza exatamente a mesma sincronização protegida do agendamento diário.
export async function POST(request: Request) {
  try {
    const { autorizado } = await exigirAdmin(request);
    if (!autorizado) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });

    const resultados = await sincronizarDownloadsDasLojas();
    return NextResponse.json({
      ok: resultados.every((resultado) => resultado.ok),
      resultados,
      lojas: await resumoDownloadsDasLojas(),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Erro ao sincronizar downloads das lojas:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível atualizar os downloads oficiais.' }, { status: 500 });
  }
}
