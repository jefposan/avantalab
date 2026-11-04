import { NextRequest, NextResponse } from 'next/server';
import { protegerApiPorLiberacao } from './app/lib/acessos-usuario-servidor';

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    try { return await protegerApiPorLiberacao(request) || NextResponse.next(); }
    catch { return NextResponse.json({ mensagem: 'Não foi possível verificar suas liberações. Tente novamente.' }, { status: 503 }); }
  }
  const host = (
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    ''
  )
    .split(':')[0]
    .toLowerCase();

  const pathname = request.nextUrl.pathname;

  const subdominios: Record<string, string> = {
    'admin.avantalab.com.br': '/admin',
    'ponto.avantalab.com.br': '/ponto',
    'recebimentos.avantalab.com.br': '/recebimentos',
    'vendas.avantalab.com.br': '/avantavendas',
  };

  const destino = subdominios[host];

  if (destino && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = destino;

    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/api/:path*'],
};
