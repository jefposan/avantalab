export const FISCAL_DURABLE_STORAGE_POLICY_REFERENCE = '2026-09-03';
export const FISCAL_DOCUMENT_DOWNLOAD_PERMISSIONS = Object.freeze({
  processed_xml: 'fiscal.documents.xml.download',
  danfe_pdf: 'fiscal.documents.danfe.download',
});

const MAX_SIGNED_READ_TTL_SECONDS = 300;
const MAX_RESTORE_TEST_AGE_DAYS = 93;
const SENSITIVE_CONFIGURATION_KEY = /(password|senha|secret|token|service.?role|private.?key|credential|certificate|certificado)/i;

function error(code, field, message) {
  return { code, field, message };
}

function text(value) {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function validDate(value) {
  const parsed = Date.parse(text(value));
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function sensitivePaths(value, path = 'configuration', found = []) {
  if (!value || typeof value !== 'object') return found;
  for (const [key, nested] of Object.entries(value)) {
    const current = `${path}.${key}`;
    if (SENSITIVE_CONFIGURATION_KEY.test(key)) found.push(current);
    if (nested && typeof nested === 'object') sensitivePaths(nested, current, found);
  }
  return found;
}

function daysBetween(later, earlier) {
  return Math.floor((later.getTime() - earlier.getTime()) / 86_400_000);
}

export function validateFiscalDurableStorageConfiguration(input = {}, options = {}) {
  const now = validDate(options.now) || new Date();
  const restoreTestedAt = validDate(input.backup?.restoreTestedAt);
  const maxRestoreTestAgeDays = Number(input.backup?.maxRestoreTestAgeDays ?? MAX_RESTORE_TEST_AGE_DAYS);
  const maxTtlSeconds = Number(input.signedRead?.maxTtlSeconds);
  const normalized = {
    id: text(input.id),
    environment: text(input.environment),
    provider: text(input.provider),
    configured: input.configured === true,
    privateAccess: input.privateAccess === true,
    directBrowserAccess: input.directBrowserAccess === true,
    encryptionAtRest: input.encryption?.atRest === true,
    encryptionInTransit: input.encryption?.inTransit === true,
    encryptionMode: text(input.encryption?.mode),
    versioning: input.immutability?.versioning === true,
    writeOnce: input.immutability?.writeOnce === true,
    checksumAlgorithm: text(input.immutability?.checksumAlgorithm).toLowerCase(),
    signedReadEnabled: input.signedRead?.enabled === true,
    signedReadServerSideOnly: input.signedRead?.serverSideOnly === true,
    maxSignedReadTtlSeconds: maxTtlSeconds,
    backupEnabled: input.backup?.enabled === true,
    backupEncrypted: input.backup?.encrypted === true,
    backupImmutable: input.backup?.immutable === true,
    backupSeparateFailureDomain: input.backup?.separateFailureDomain === true,
    restoreTestedAt: restoreTestedAt?.toISOString() || '',
    maxRestoreTestAgeDays,
    retentionEnforced: input.retention?.enforced === true,
    legalHoldSupported: input.retention?.legalHoldSupported === true,
  };
  const errors = [];
  if (sensitivePaths(input).length) errors.push(error('AV-FISCAL-STORAGE-CONFIG-SECRET', 'configuration', 'A configuração validável não pode receber credenciais ou segredos.'));
  if (!normalized.id || !normalized.provider || normalized.environment !== 'production' || !normalized.configured) errors.push(error('AV-FISCAL-STORAGE-CONFIG-PROVIDER', 'provider', 'O provedor durável de produção precisa estar identificado e configurado.'));
  if (!normalized.privateAccess || normalized.directBrowserAccess) errors.push(error('AV-FISCAL-STORAGE-CONFIG-PRIVATE', 'privateAccess', 'O armazenamento fiscal precisa ser privado e sem acesso direto do navegador.'));
  if (!normalized.encryptionAtRest || !normalized.encryptionInTransit || !['provider_managed', 'customer_managed'].includes(normalized.encryptionMode)) errors.push(error('AV-FISCAL-STORAGE-CONFIG-ENCRYPTION', 'encryption', 'Criptografia em repouso e em trânsito precisa estar ativa.'));
  if (!normalized.versioning || !normalized.writeOnce || normalized.checksumAlgorithm !== 'sha256') errors.push(error('AV-FISCAL-STORAGE-CONFIG-IMMUTABLE', 'immutability', 'Versionamento, gravação imutável e SHA-256 são obrigatórios.'));
  if (!normalized.signedReadEnabled || !normalized.signedReadServerSideOnly || !Number.isInteger(maxTtlSeconds) || maxTtlSeconds < 30 || maxTtlSeconds > MAX_SIGNED_READ_TTL_SECONDS) errors.push(error('AV-FISCAL-STORAGE-CONFIG-READ', 'signedRead', 'A leitura deve ser autorizada no servidor por no máximo 300 segundos.'));
  if (!normalized.backupEnabled || !normalized.backupEncrypted || !normalized.backupImmutable || !normalized.backupSeparateFailureDomain) errors.push(error('AV-FISCAL-STORAGE-CONFIG-BACKUP', 'backup', 'O backup precisa ser criptografado, imutável e separado do domínio de falha principal.'));
  if (!Number.isInteger(maxRestoreTestAgeDays) || maxRestoreTestAgeDays < 1 || maxRestoreTestAgeDays > MAX_RESTORE_TEST_AGE_DAYS || !restoreTestedAt || restoreTestedAt > now || daysBetween(now, restoreTestedAt) > maxRestoreTestAgeDays) errors.push(error('AV-FISCAL-STORAGE-CONFIG-RESTORE', 'backup.restoreTestedAt', 'A restauração precisa ter sido aprovada dentro da janela operacional configurada, limitada a 93 dias.'));
  if (!normalized.retentionEnforced || !normalized.legalHoldSupported) errors.push(error('AV-FISCAL-STORAGE-CONFIG-RETENTION', 'retention', 'A retenção e o bloqueio jurídico de descarte precisam ser suportados.'));
  return Object.freeze({
    valid: errors.length === 0,
    productionReady: errors.length === 0,
    configuration: Object.freeze(normalized),
    errors: Object.freeze(errors),
  });
}

function utcDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function latestDate(dates) {
  return dates.reduce((latest, current) => (!latest || current > latest ? current : latest), null);
}

export function evaluateNfeArtifactRetention(input = {}, options = {}) {
  const authorizedAt = validDate(input.authorizedAt);
  const now = validDate(options.now) || new Date();
  if (!authorizedAt) return { valid: false, deletionAllowed: false, errors: [error('AV-FISCAL-RETENTION-AUTHORIZATION', 'authorizedAt', 'A data de autorização da NF-e é obrigatória para calcular a retenção.')] };
  const baselineUntil = new Date(Date.UTC(authorizedAt.getUTCFullYear() + 6, 0, 1));
  const configuredUntil = validDate(input.retainUntil);
  const legalHoldUntil = validDate(input.legalHoldUntil);
  const indefiniteLegalHold = input.indefiniteLegalHold === true;
  const effectiveUntil = latestDate([baselineUntil, configuredUntil, legalHoldUntil].filter(Boolean));
  return Object.freeze({
    valid: true,
    rule: 'operational_baseline_first_day_sixth_following_year',
    baselineUntil: utcDateOnly(baselineUntil),
    effectiveUntil: utcDateOnly(effectiveUntil),
    indefiniteLegalHold,
    deletionAllowed: !indefiniteLegalHold && now >= effectiveUntil,
    requiresLegalReviewBeforeDeletion: true,
    errors: [],
  });
}
