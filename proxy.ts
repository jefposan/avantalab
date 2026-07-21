import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const hostname =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    '';

  const host = hostname.split(':')[0].toLowerCase();
  const pathname = request.nextUrl.pathname;

  if (request.nextUrl.searchParams.get('debug-host') === '1') {
  return NextResponse.json({
    host: request.headers.get('host'),
    forwardedHost: request.headers.get('x-forwarded-host'),
    hostname: request.nextUrl.hostname,
    url: request.url,
  });
}

  if (host === 'admin.avantalab.com.br' && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';

    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/',
};