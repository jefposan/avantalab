import { NextResponse } from 'next/server';
import { exigirAdmin } from '../../lib/admin-server';
import { resumoDownloadsDasLojas } from '../../lib/downloads-lojas-servidor';

export const runtime = 'nodejs';

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
