const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY_PATTERN = /^[A-Za-z0-9:_-]{8,120}$/;
const headers = Object.freeze({ 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' });
const text = (value) => String(value ?? '').trim();
const reply = (status, body) => Response.json(body, { status, headers });

function publicError(result) {
  const error = Array.isArray(result?.errors) ? result.errors[0] : null;
  const code = text(error?.code) || 'AV-NFE-AUTOMATIC';
  const message = code.includes('CERTIFICATE')
    ? 'O certificado digital não está ativo. Revise em Ajustes > Certificado digital.'
    : text(error?.message) || 'Não foi possível continuar a emissão da NF-e.';
  const status = code.includes('PERMISSION') ? 403
    : code.includes('NOT-FOUND') ? 404
      : code.includes('CERTIFICATE') || code.includes('STATE') || code.includes('VERSION') || code.includes('CONFLICT') || code.includes('RULE-CHANGE') ? 409
        : code.includes('STORAGE') || code.includes('SERVER') || code.includes('LIFECYCLE') || code.includes('SUBMISSION') ? 503
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
    submitted: result?.submitted === true,
    transmitted: result?.transmitted === true,
    authorized: result?.authorized === true,
    processing: result?.processing === true,
    rejected: result?.rejected === true,
    statusCode: text(result?.statusCode),
    statusReason: text(result?.statusReason),
    protocolStored: result?.protocolStored === true,
    receiptConsultationPending: result?.receiptConsultationPending === true,
    externalContentReturned: false,
    sensitiveMaterialReturned: false,
  });
}

export async function handleCommercialNfeAutomaticIssuanceRequest({ request, runtime, companyId, emissionId } = {}) {
  const safeCompanyId = text(companyId);
  const safeEmissionId = text(emissionId);
  if (!request || request.method !== 'POST' || !UUID_PATTERN.test(safeCompanyId) || !UUID_PATTERN.test(safeEmissionId)) {
    return reply(400, { ok: false, code: 'AV-NFE-AUTOMATIC-REQUEST', message: 'A continuação da NF-e solicitada é inválida.' });
  }
  let body;
  try { body = await request.json(); }
  catch { return reply(400, { ok: false, code: 'AV-NFE-AUTOMATIC-BODY', message: 'Atualize a Central Fiscal e tente novamente.' }); }
  const idempotencyKey = text(body?.idempotencyKey);
  const expectedVersion = Number(body?.expectedVersion);
  if (!KEY_PATTERN.test(idempotencyKey) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    return reply(400, { ok: false, code: 'AV-NFE-AUTOMATIC-INPUT', message: 'Atualize a situação fiscal e tente novamente.' });
  }
  if (runtime?.configured !== true || !runtime.accessResolver) {
    return reply(503, { ok: false, code: 'AV-NFE-AUTOMATIC-PENDING', message: 'A emissão automática ainda não está disponível.' });
  }
  let access;
  try { access = await runtime.accessResolver.resolve(request, { companyId: safeCompanyId }); }
  catch { return reply(503, { ok: false, code: 'AV-NFE-AUTOMATIC-ACCESS', message: 'Não foi possível confirmar o acesso neste momento.' }); }
  if (!access?.authenticated) return reply(401, { ok: false, code: 'AV-NFE-AUTOMATIC-SESSION', message: 'Sua sessão precisa ser confirmada novamente.' });
  if (!runtime.nfeAutomaticIssuanceService?.continue) {
    return reply(409, { ok: false, code: 'AV-NFE-AUTOMATIC-CERTIFICATE-PENDING', message: 'O certificado digital não está ativo. Revise em Ajustes > Certificado digital.' });
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
  try { result = await runtime.nfeAutomaticIssuanceService.continue({ context, emissionId: safeEmissionId, expectedVersion, idempotencyKey }); }
  catch { return reply(503, { ok: false, code: 'AV-NFE-AUTOMATIC-UNAVAILABLE', message: 'Não foi possível continuar a emissão. Consulte a Central Fiscal antes de tentar novamente.' }); }
  if (!result?.ok) {
    const error = publicError(result);
    return reply(error.status, { ok: false, code: error.code, message: error.message });
  }
  const emission = publicResult(result.result);
  if (!UUID_PATTERN.test(emission.emissionId) || !['authorized', 'processing', 'rejected'].includes(emission.state)
    || !Number.isSafeInteger(emission.version) || emission.version < 1 || !emission.series
    || !Number.isSafeInteger(emission.number) || emission.number < 1 || !emission.signed
    || !emission.persisted || !emission.submitted || !emission.transmitted) {
    return reply(503, { ok: false, code: 'AV-NFE-AUTOMATIC-RESULT', message: 'O resultado da emissão não pôde ser confirmado com segurança.' });
  }
  return reply(200, { ok: true, emission });
}
