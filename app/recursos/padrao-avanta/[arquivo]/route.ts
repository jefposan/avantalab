import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';

const RECURSOS = new Map([
  ['avanta-voice-actions.js', 'application/javascript; charset=utf-8'],
  ['avanta-voice-actions.css', 'text/css; charset=utf-8'],
]);

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ arquivo: string }> },
) {
  const { arquivo } = await params;
  const contentType = RECURSOS.get(arquivo);
  if (!contentType) return new NextResponse('Recurso não encontrado.', { status: 404 });

  const caminho = path.resolve(process.cwd(), 'app/padrao-avanta/acoes-por-voz', arquivo);
  const conteudo = await readFile(caminho);
  return new NextResponse(conteudo, {
    headers: {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Content-Type': contentType,
    },
  });
}
