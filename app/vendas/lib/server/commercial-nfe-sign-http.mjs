const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY_PATTERN = /^[A-Za-z0-9:_-]{8,120}$/;
const headers = Object.freeze({ 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' });
const text = (value) => String(value ?? '').trim();
const reply = (status, body) => Response.json(body, { status, headers });

function publicError(result) {
  const error = Array.isArray(result?.errors) ? result.errors[0] : null;
  const code = text(error?.code) || 'AV-NFE-SIGN';
  const message = code.includes('CERTIFICATE')
    ? 'O certificado digital não está ativo. Revise ou adicione novamente o certificado.'
    : text(error?.message) || 'Não foi possível assinar a NF-e.';
  const status = code.includes('PERMISSION') ? 403
    : code.includes('NOT-FOUND') ? 404
      : code.includes('CERTIFICATE') || code.includes('STATE') || code.includes('VERSION') || code.includes('RULE-CHANGE') ? 409
        : code.includes('STORAGE') || code.includes('SERVER') || code.includes('LIFECYCLE') ? 503
          : 400;
  return { status, code, message };
}

function publicResult(result) {
  return Object.freeze({
    emissionId: text(result?.emissionId),
    documentType: 'nfe',
    model: '55',
    environment: 'homologacao',
    state: text(result?.state),
    version: Number(result?.version),
    series: text(result?.series),
    number: Number(result?.number),
    signed: result?.signed === true,
    persisted: result?.persisted === true,
    artifactRegistered: result?.artifactRegistered === true,
    realCertificateInspected: result?.realCertificateInspected === true,
    signatureVerified: result?.signatureVerified === true,
    signedXsdValid: result?.signedXsdValid === true,
    transmitted: false,
    signedContentReturned: false,
    sensitiveMaterialReturned: false,
  });
}

export async function handleCommercialNfeSignRequest({ request, runtime, companyId, emissionId } = {}) {
  const safeCompanyId = text(companyId);
  const safeEmissionId = text(emissionId);
  if (!request || request.method !== 'POST' || !UUID_PATTERN.test(safeCompanyId) || !UUID_PATTERN.test(safeEmissionId)) {
    return reply(400, { ok: false, code: 'AV-NFE-SIGN-REQUEST', message: 'A assinatura da NF-e solicitada é inválida.' });
  }
  let body;
  try { body = await request.json(); }
  catch { return reply(400, { ok: false, code: 'AV-NFE-SIGN-BODY', message: 'Atualize a Central Fiscal e tente novamente.' }); }
  const idempotencyKey = text(body?.idempotencyKey);
  const expectedVersion = Number(body?.expectedVersion);
  if (!KEY_PATTERN.test(idempotencyKey) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    return reply(400, { ok: false, code: 'AV-NFE-SIGN-INPUT', message: 'Atualize a situação fiscal e tente novamente.' });
  }
  if (runtime?.configured !== true || !runtime.accessResolver) {
    return reply(503, { ok: false, code: 'AV-NFE-SIGN-PENDING', message: 'A assinatura da NF-e ainda não está disponível.' });
  }
  let access;
  try { access = await runtime.accessResolver.resolve(request, { companyId: safeCompanyId }); }
  catch { return reply(503, { ok: false, code: 'AV-NFE-SIGN-ACCESS', message: 'Não foi possível confirmar o acesso neste momento.' }); }
  if (!access?.authenticated) return reply(401, { ok: false, code: 'AV-NFE-SIGN-SESSION', message: 'Sua sessão precisa ser confirmada novamente.' });
  if (!runtime.nfeSigningService?.sign) {
    return reply(409, { ok: false, code: 'AV-NFE-SIGN-CERTIFICATE-PENDING', message: 'Adicione e ative o certificado digital da empresa para continuar.' });
  }
  const boundary = access.boundary || {};
  const context = {
    companyId: boundary.companyId,
    actorId: boundary.userId,
    moduleId: boundary.moduleId,
    active: boundary.userActive === true && boundary.membershipActive === true && boundary.companyActive === true,
    moduleActive: boundary.moduleActive === true,
    effectivePermissions: access.effectivePermissions || {},
  };
  let result;
  try { result = await runtime.nfeSigningService.sign({ context, emissionId: safeEmissionId, expectedVersion, idempotencyKey }); }
  catch { return reply(503, { ok: false, code: 'AV-NFE-SIGN-UNAVAILABLE', message: 'Não foi possível assinar a NF-e. Nenhum envio foi realizado.' }); }
  if (!result?.ok) {
    const error = publicError(result);
    return reply(error.status, { ok: false, code: error.code, message: error.message });
  }
  const emission = publicResult(result.result);
  if (!UUID_PATTERN.test(emission.emissionId) || emission.state !== 'signed' || !Number.isSafeInteger(emission.version)
    || emission.version < 1 || !emission.series || !Number.isSafeInteger(emission.number) || emission.number < 1
    || !emission.signed || !emission.persisted || !emission.artifactRegistered || !emission.realCertificateInspected
    || !emission.signatureVerified || !emission.signedXsdValid) {
    return reply(503, { ok: false, code: 'AV-NFE-SIGN-RESULT', message: 'A assinatura não pôde ser confirmada com segurança. Nenhum envio foi realizado.' });
  }
  return reply(200, { ok: true, emission });
}
