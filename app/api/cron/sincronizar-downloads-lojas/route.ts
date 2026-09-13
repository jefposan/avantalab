import { NextResponse } from 'next/server';
import { sincronizarDownloadsDasLojas } from '../../../lib/downloads-lojas-servidor';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  const autorizado = segredo && request.headers.get('authorization') === `Bearer ${segredo}`;
  if (!autorizado) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });
  const resultados = await sincronizarDownloadsDasLojas();
  return NextResponse.json({ ok: resultados.every((resultado) => resultado.ok), resultados });
}
