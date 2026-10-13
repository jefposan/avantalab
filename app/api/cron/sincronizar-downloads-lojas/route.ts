import { NextResponse } from 'next/server';
import { sincronizarDownloadsDasLojas } from '../../../lib/downloads-lojas-servidor';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  const autorizado = segredo && request.headers.get('authorization') === `Bearer ${segredo}`;
  if (!autorizado) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });
  const resultados = await sincronizarDownloadsDasLojas();
  const falhas = resultados.filter((resultado) => !resultado.ok || !resultado.configurado);
  if (falhas.length) {
    console.error('Sincronização agendada de downloads das lojas incompleta:', falhas);
  }
  return NextResponse.json({ ok: falhas.length === 0, resultados }, { status: falhas.length ? 502 : 200 });
}
