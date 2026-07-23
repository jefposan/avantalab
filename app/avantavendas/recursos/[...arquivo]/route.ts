import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RAIZ_RECURSOS = path.resolve(process.cwd(), 'app/avantavendas/sistema');

const TIPOS_CONTEUDO: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function respostaNaoEncontrada() {
  return new Response('Recurso não encontrado.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export async function GET(
  request: Request,
  contexto: { params: Promise<{ arquivo: string[] }> },
) {
  const { arquivo: segmentos } = await contexto.params;
  if (!Array.isArray(segmentos) || segmentos.length === 0) return respostaNaoEncontrada();

  const caminhoArquivo = path.resolve(RAIZ_RECURSOS, ...segmentos);
  if (!caminhoArquivo.startsWith(`${RAIZ_RECURSOS}${path.sep}`)) {
    return respostaNaoEncontrada();
  }

  try {
    const informacoes = await stat(caminhoArquivo);
    if (!informacoes.isFile()) return respostaNaoEncontrada();

    const conteudo = await readFile(caminhoArquivo);
    const extensao = path.extname(caminhoArquivo).toLowerCase();
    const recursoVersionado = new URL(request.url).searchParams.has('v');
    return new Response(conteudo, {
      headers: {
        'Cache-Control': recursoVersionado
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=3600, must-revalidate',
        'Content-Type': TIPOS_CONTEUDO[extensao] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return respostaNaoEncontrada();
  }
}
