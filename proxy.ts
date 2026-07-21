import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const host = (
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    ''
  )
    .split(':')[0]
    .toLowerCase();

  if (host === 'admin.avantalab.com.br' && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';

    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/',
};