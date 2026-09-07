import { NFE_A1_MAX_PKCS12_BYTES } from './nfe-a1-certificate.mjs';

export const NFE_CERTIFICATE_INSTALLATION_HTTP_REFERENCE = '2026-09-05';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REQUEST_BYTES = NFE_A1_MAX_PKCS12_BYTES + (128 * 1024);
const headers = Object.freeze({ 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' });
const clean = (value) => String(value ?? '').trim();
const reply = (status, body) => Response.json(body, { status, headers });

function secureTransport(request) {
  const url = new URL(request.url);
  if (url.protocol === 'https:') return true;
  if (process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname)) return true;
  return request.headers.get('x-forwarded-proto')?.toLowerCase() === 'https';
}

async function accessContext(request, runtime, companyId) {
  if (!runtime?.configured || !runtime.accessResolver) return { error: reply(503, { ok: false, code: 'AV-NFE-CERTIFICATE-PENDING', message: 'A instalação protegida do certificado ainda não está disponível.' }) };
  let access;
  try { access = await runtime.accessResolver.resolve(request, { companyId }); }
  catch { return { error: reply(503, { ok: false, code: 'AV-NFE-CERTIFICATE-ACCESS', message: 'Não foi possível confirmar o acesso neste momento.' }) }; }
  if (!access?.authenticated) return { error: reply(401, { ok: false, code: 'AV-NFE-CERTIFICATE-SESSION', message: 'Sua sessão precisa ser confirmada novamente.' }) };
  const boundary = access.boundary || {};
  return { context: { companyId: boundary.companyId, actorId: boundary.userId, moduleId: boundary.moduleId, active: boundary.userActive === true && boundary.membershipActive === true && boundary.companyActive === true, moduleActive: boundary.moduleActive === true, effectivePermissions: access.effectivePermissions || {} } };
}

function failure(result, fallback) {
  const error = result?.errors?.[0];
  const code = clean(error?.code) || 'AV-NFE-CERTIFICATE';
  const status = code.includes('PERMISSION') ? 403 : code.includes('COMPANY') || code.includes('INVALID') ? 422 : 503;
  return reply(status, { ok: false, code, message: clean(error?.message) || fallback });
}

export async function handleNfeCertificateStatusRequest({ request, runtime, companyId } = {}) {
  const company = clean(companyId);
  if (!request || request.method !== 'GET' || !UUID.test(company)) return reply(400, { ok: false, code: 'AV-NFE-CERTIFICATE-REQUEST', message: 'Selecione novamente a empresa ativa.' });
  const access = await accessContext(request, runtime, company);
  if (access.error) return access.error;
  if (!runtime.certificateInstallationService?.status) return reply(503, { ok: false, code: 'AV-NFE-CERTIFICATE-STORAGE-PENDING', message: 'O armazenamento protegido do certificado ainda não foi ativado.' });
  const result = await runtime.certificateInstallationService.status({ context: access.context });
  return result?.ok ? reply(200, { ok: true, certificate: result.result }) : failure(result, 'Não foi possível consultar o certificado digital.');
}

export async function handleNfeCertificateInstallationRequest({ request, runtime, companyId } = {}) {
  const company = clean(companyId);
  if (!request || request.method !== 'POST' || !UUID.test(company)) return reply(400, { ok: false, code: 'AV-NFE-CERTIFICATE-REQUEST', message: 'Selecione novamente a empresa ativa.' });
  if (!secureTransport(request)) return reply(403, { ok: false, code: 'AV-NFE-CERTIFICATE-TRANSPORT', message: 'O certificado só pode ser instalado por uma conexão protegida.' });
  const access = await accessContext(request, runtime, company);
  if (access.error) return access.error;
  if (!runtime.certificateInstallationService?.install) return reply(503, { ok: false, code: 'AV-NFE-CERTIFICATE-STORAGE-PENDING', message: 'O armazenamento protegido do certificado ainda não foi ativado.' });
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) return reply(413, { ok: false, code: 'AV-NFE-CERTIFICATE-SIZE', message: 'Selecione um certificado de até 5 MB.' });
  if (!clean(request.headers.get('content-type')).toLowerCase().includes('multipart/form-data')) return reply(415, { ok: false, code: 'AV-NFE-CERTIFICATE-FORM', message: 'Envie o certificado pelo formulário protegido.' });
  let formData;
  try { formData = await request.formData(); }
  catch { return reply(400, { ok: false, code: 'AV-NFE-CERTIFICATE-BODY', message: 'Não foi possível ler o certificado selecionado.' }); }
  const certificate = formData.get('certificate');
  const passphrase = formData.get('passphrase');
  if (!(certificate instanceof File) || !/\.(?:pfx|p12)$/i.test(certificate.name) || certificate.size < 1 || certificate.size > NFE_A1_MAX_PKCS12_BYTES) return reply(400, { ok: false, code: 'AV-NFE-CERTIFICATE-FILE', message: 'Selecione um certificado A1 .pfx ou .p12 de até 5 MB.' });
  if (typeof passphrase !== 'string' || passphrase.length < 1 || passphrase.length > 256) return reply(400, { ok: false, code: 'AV-NFE-CERTIFICATE-PASSWORD', message: 'Informe a senha do certificado.' });
  const pkcs12 = Buffer.from(await certificate.arrayBuffer());
  try {
    const result = await runtime.certificateInstallationService.install({ context: access.context, pkcs12, passphrase });
    return result?.ok ? reply(201, { ok: true, certificate: result.result, message: result.result?.certificateActive ? 'Certificado adicionado e ativado com segurança.' : 'Certificado adicionado. A validação continuará automaticamente.' }) : failure(result, 'Não foi possível instalar o certificado digital.');
  } finally {
    pkcs12.fill(0);
  }
}

export async function handleNfeCertificateActivationRequest({ request, runtime, companyId } = {}) {
  const company = clean(companyId);
  if (!request || request.method !== 'PATCH' || !UUID.test(company)) return reply(400, { ok: false, code: 'AV-NFE-CERTIFICATE-REQUEST', message: 'Selecione novamente a empresa ativa.' });
  if (!secureTransport(request)) return reply(403, { ok: false, code: 'AV-NFE-CERTIFICATE-TRANSPORT', message: 'O certificado só pode ser validado por uma conexão protegida.' });
  const access = await accessContext(request, runtime, company);
  if (access.error) return access.error;
  if (!runtime.certificateInstallationService?.activate) return reply(503, { ok: false, code: 'AV-NFE-CERTIFICATE-ACTIVATION-PENDING', message: 'A validação protegida do certificado ainda não está disponível.' });
  const result = await runtime.certificateInstallationService.activate({ context: access.context });
  if (!result?.ok) return failure(result, 'Não foi possível validar novamente o certificado digital.');
  return reply(200, {
    ok: true,
    certificate: result.result,
    message: result.result?.certificateActive
      ? 'Certificado ativado com segurança.'
      : 'A validação foi concluída, mas ainda existem verificações pendentes.',
  });
}
