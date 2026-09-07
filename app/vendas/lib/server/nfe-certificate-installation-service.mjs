import { randomUUID } from 'node:crypto';
import { prepareNfeA1Pkcs12ForProtectedStorage } from './nfe-a1-certificate.mjs';

export const NFE_CERTIFICATE_INSTALLATION_SERVICE_REFERENCE = '2026-09-05';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = (value) => String(value ?? '').trim();
const digits = (value) => clean(value).replace(/\D/g, '');
const issue = (code, field, message) => ({ code, field, message });

function accessError(context) {
  if (!context || !UUID.test(clean(context.companyId)) || !UUID.test(clean(context.actorId))) return issue('AV-NFE-CERTIFICATE-SESSION', 'session', 'Confirme novamente a sessão e a empresa ativa.');
  if (context.moduleId && context.moduleId !== 'vendas') return issue('AV-NFE-CERTIFICATE-MODULE', 'module', 'O acesso não pertence ao módulo Vendas e Serviços.');
  if (!context.active || !context.moduleActive || context.effectivePermissions?.['fiscal.configure'] !== true) return issue('AV-NFE-CERTIFICATE-PERMISSION', 'permission', 'Somente Gestor ou Administrador com permissão fiscal pode instalar o certificado.');
  return null;
}

function publicSummary(summary, connection = null) {
  const active = summary?.status === 'active';
  const installed = active || summary?.status === 'pending_validation';
  const connectionProvided = connection && typeof connection === 'object';
  return Object.freeze({
    status: active ? 'active' : installed ? 'pending_validation' : 'unavailable',
    mode: summary?.mode === 'a1' ? 'Certificado A1' : '',
    subjectDocument: digits(summary?.subjectDocument),
    validFrom: clean(summary?.validFrom),
    validTo: clean(summary?.validTo),
    installedAt: clean(summary?.installedAt),
    fingerprintEnding: clean(summary?.fingerprint).replace(/[^a-f0-9]/gi, '').slice(-12).toUpperCase(),
    certificateInstalled: installed,
    certificateActive: active,
    validationChecked: Boolean(summary?.validationCheckedAt),
    validationCheckedAt: clean(summary?.validationCheckedAt),
    blockers: Object.freeze(Array.isArray(summary?.blockers) ? summary.blockers.map(clean).filter(Boolean).slice(0, 12) : []),
    fiscalConnectionChecked: connectionProvided ? connection.fiscalConnectionChecked === true : summary?.fiscalConnectionChecked === true,
    fiscalConnectionAvailable: connectionProvided ? connection.fiscalConnectionAvailable === true : summary?.fiscalConnectionAvailable === true,
    sensitiveMaterialReturned: false,
  });
}

export function createNfeCertificateInstallationService({ repository, issuerResolver, activationService = null, prepareForStorage = prepareNfeA1Pkcs12ForProtectedStorage, now = () => new Date(), idGenerator = randomUUID } = {}) {
  if (!repository?.install || !repository?.getActiveSummary) throw new TypeError('Informe o repositório protegido dos certificados.');
  if (typeof issuerResolver !== 'function' || typeof prepareForStorage !== 'function') throw new TypeError('Informe os validadores server-side do certificado.');
  return Object.freeze({
    id: 'avantalab-nfe-certificate-installation-v1',
    async status({ context } = {}) {
      const denied = accessError(context);
      if (denied) return { ok: false, errors: [denied] };
      try {
        const summary = await repository.getActiveSummary({ companyId: context.companyId });
        return { ok: true, result: summary ? publicSummary(summary) : Object.freeze({ status: 'unavailable', mode: '', subjectDocument: '', validFrom: '', validTo: '', installedAt: '', fingerprintEnding: '', certificateInstalled: false, certificateActive: false, validationChecked: false, validationCheckedAt: '', blockers: Object.freeze([]), fiscalConnectionChecked: false, fiscalConnectionAvailable: false, sensitiveMaterialReturned: false }), errors: [] };
      } catch {
        return { ok: false, errors: [issue('AV-NFE-CERTIFICATE-STORAGE', 'certificate', 'Não foi possível consultar o certificado digital.')] };
      }
    },
    async activate({ context } = {}) {
      const denied = accessError(context);
      if (denied) return { ok: false, errors: [denied] };
      if (!activationService?.activate) return { ok: false, errors: [issue('AV-NFE-CERTIFICATE-ACTIVATION-PENDING', 'certificate', 'A validação protegida do certificado ainda não está disponível.')] };
      const activation = await activationService.activate({ context });
      if (!activation?.ok) return activation;
      const result = activation.result || {};
      return {
        ok: true,
        result: Object.freeze({
          ...publicSummary(result.summary, result),
          validationChecked: result.validationChecked === true || Boolean(result.summary?.validationCheckedAt),
          blockers: Object.freeze(Array.isArray(result.blockers) ? result.blockers.map(clean).filter(Boolean).slice(0, 12) : []),
        }),
        errors: [],
      };
    },
    async install({ context, pkcs12, passphrase } = {}) {
      const denied = accessError(context);
      if (denied) return { ok: false, errors: [denied] };
      let normalized;
      try {
        const issuer = await issuerResolver({ companyId: context.companyId });
        const expectedDocument = digits(issuer?.document);
        if (expectedDocument.length !== 14 || !clean(issuer?.legalName) || !clean(issuer?.cityCode)) {
          return { ok: false, errors: [issue('AV-NFE-CERTIFICATE-COMPANY', 'company', 'Complete o CNPJ, a razão social e o município da empresa antes de instalar o certificado.')] };
        }
        normalized = await prepareForStorage({ pkcs12, passphrase, expectedDocument, now: now() });
        if (!normalized?.ok) return { ok: false, errors: normalized?.diagnostic?.errors?.length ? normalized.diagnostic.errors : [issue('AV-NFE-CERTIFICATE-INVALID', 'certificate', 'O arquivo ou a senha do certificado não pôde ser validado.')] };
        const certificateId = idGenerator();
        const stored = await repository.install({
          companyId: context.companyId,
          certificateId,
          actorId: context.actorId,
          pkcs12: normalized.protectedPkcs12,
          passphrase: normalized.internalPassphrase,
          metadata: {
            fingerprint: normalized.diagnostic.certificateFingerprint.replace(/:/g, '').toLowerCase(),
            subjectDocument: expectedDocument,
            validFrom: normalized.diagnostic.certificateValidFrom,
            validTo: normalized.diagnostic.certificateValidTo,
          },
        });
        normalized.protectedPkcs12.fill(0);
        normalized.internalPassphrase = '';
        let summary = stored.summary;
        let connection = null;
        if (activationService?.activate) {
          try {
            const activation = await activationService.activate({ context, certificateId });
            if (activation?.ok && activation.result?.summary) {
              summary = activation.result.summary;
              connection = activation.result;
            }
          } catch { /* a instalação permanece válida e pendente se a verificação técnica falhar */ }
        }
        return { ok: true, result: { ...publicSummary(summary, connection), replaced: stored.replaced === true, originalPasswordStored: false }, errors: [] };
      } catch {
        return { ok: false, errors: [issue('AV-NFE-CERTIFICATE-INSTALLATION', 'certificate', 'Não foi possível instalar o certificado. O arquivo e a senha foram descartados.')] };
      } finally {
        if (normalized?.ok) {
          normalized.protectedPkcs12.fill(0);
          normalized.internalPassphrase = '';
        }
        if (Buffer.isBuffer(pkcs12)) pkcs12.fill(0);
      }
    },
  });
}
