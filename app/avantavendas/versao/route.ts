import { APP_VERSION } from '../../lib/version';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(
    { versao: APP_VERSION },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'CDN-Cache-Control': 'no-store',
        'Cloudflare-CDN-Cache-Control': 'no-store',
      },
    },
  );
}
