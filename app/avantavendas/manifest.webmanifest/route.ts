import { manifestoAvantaVendas } from '../manifesto';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(manifestoAvantaVendas, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'CDN-Cache-Control': 'no-store',
      'Cloudflare-CDN-Cache-Control': 'no-store',
      'Content-Type': 'application/manifest+json; charset=utf-8',
    },
  });
}
