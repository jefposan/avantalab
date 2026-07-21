import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
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
    'vendas.avantalab.com.br': '/mobile/vendas',
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
  matcher: '/',
};