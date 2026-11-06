import { handleFiscalCheckoutRequest } from '@/app/vendas/lib/server/fiscal-checkout.mjs';
import { getFiscalStatusRuntime } from '@/app/vendas/lib/server/fiscal-status-runtime.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request) {
  return handleFiscalCheckoutRequest({ request, runtime: await getFiscalStatusRuntime() });
}
