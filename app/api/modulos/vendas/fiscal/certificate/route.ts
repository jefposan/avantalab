import { getFiscalStatusRuntime } from '@/app/vendas/lib/server/fiscal-status-runtime.mjs';
import {
  handleNfeCertificateActivationRequest,
  handleNfeCertificateInstallationRequest,
  handleNfeCertificateStatusRequest,
} from '@/app/vendas/lib/server/nfe-certificate-installation-http.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function companyId(request: Request) {
  return new URL(request.url).searchParams.get('companyId')?.trim() || '';
}

export async function GET(request: Request) {
  const company = companyId(request);
  return handleNfeCertificateStatusRequest({ request, runtime: await getFiscalStatusRuntime(), companyId: company });
}

export async function POST(request: Request) {
  const company = companyId(request);
  return handleNfeCertificateInstallationRequest({ request, runtime: await getFiscalStatusRuntime(), companyId: company });
}

export async function PATCH(request: Request) {
  const company = companyId(request);
  return handleNfeCertificateActivationRequest({ request, runtime: await getFiscalStatusRuntime(), companyId: company });
}
