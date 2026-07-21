import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const hostname = request.headers
    .get('host')
    ?.split(':')[0]
    .toLowerCase();

  const pathname = request.nextUrl.pathname;

  if (
    hostname === 'admin.avantalab.com.br' &&
    !pathname.startsWith('/admin')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname === '/' ? '' : pathname}`;

    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|.*\\..*).*)',
  ],
};