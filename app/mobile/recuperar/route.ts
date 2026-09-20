import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const destino = new URL('/mobile', request.url);
  destino.searchParams.set('recuperar', String(Date.now()));

  return NextResponse.redirect(destino, {
    status: 307,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'CDN-Cache-Control': 'no-store',
      'Cloudflare-CDN-Cache-Control': 'no-store',
    },
  });
}
