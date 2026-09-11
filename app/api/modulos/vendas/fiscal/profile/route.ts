import { handleCommercialFiscalProfileRequest } from '@/app/vendas/lib/server/commercial-fiscal-profile-http.mjs';
import { getFiscalStatusRuntime } from '@/app/vendas/lib/server/fiscal-status-runtime.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  return handleCommercialFiscalProfileRequest({ request, runtime: await getFiscalStatusRuntime(), companyId: new URL(request.url).searchParams.get('companyId')?.trim() || '' });
}

export async function PATCH(request: Request) {
  return handleCommercialFiscalProfileRequest({ request, runtime: await getFiscalStatusRuntime(), companyId: new URL(request.url).searchParams.get('companyId')?.trim() || '' });
}
