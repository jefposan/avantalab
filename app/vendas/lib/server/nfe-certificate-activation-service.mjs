export const NFE_CERTIFICATE_ACTIVATION_SERVICE_REFERENCE = '2026-09-05';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = (value) => String(value ?? '').trim();
const digits = (value) => clean(value).replace(/\D/g, '');
const issue = (code, field, message) => ({ code, field, message });

function accessError(context) {
  if (!context || !UUID.test(clean(context.companyId)) || !UUID.test(clean(context.actorId))) return issue('AV-NFE-CERTIFICATE-SESSION', 'session', 'Confirme novamente a sessão e a empresa ativa.');
  if (context.moduleId && context.moduleId !== 'vendas') return issue('AV-NFE-CERTIFICATE-MODULE', 'module', 'O acesso não pertence ao módulo Vendas e Serviços.');
  if (!context.active || !context.moduleActive || context.effectivePermissions?.['fiscal.configure'] !== true) return issue('AV-NFE-CERTIFICATE-PERMISSION', 'permission', 'Somente Gestor ou Administrador com permissão fiscal pode ativar o certificado.');
  return null;
}

function pendingResult(summary, diagnostic = null) {
  return Object.freeze({
    status: 'pending_validation',
    certificateInstalled: true,
    certificateActive: false,
    validationChecked: Boolean(diagnostic?.realCertificateInspected),
    blockers: Object.freeze((diagnostic?.errors || []).map((item) => clean(item?.code)).filter(Boolean).slice(0, 12)),
    summary,
  });
}

function activationEvidence(diagnostic, checkedAt) {
  return Object.freeze({
    checkedAt: checkedAt.toISOString(),
    ownerVerified: diagnostic.ownerVerified === true,
    validityVerified: diagnostic.validityVerified === true,
    keyUsageVerified: diagnostic.keyUsageVerified === true,
    chainVerified: diagnostic.chainVerified === true,
    rootPinned: diagnostic.rootPinned === true,
    revocationVerified: diagnostic.revocationVerified === true,
    signingAvailable: diagnostic.signingAvailable === true,
    mutualTlsAvailable: diagnostic.mutualTlsAvailable === true,
    keyType: clean(diagnostic.keyType).slice(0, 20),
    keyBits: Number.isSafeInteger(diagnostic.keyBits) ? diagnostic.keyBits : 0,
    fingerprint: clean(diagnostic.certificateFingerprint).replace(/[^a-f0-9]/gi, '').toLowerCase(),
    blockers: Object.freeze((diagnostic?.errors || []).map((item) => clean(item?.code)).filter(Boolean).slice(0, 12)),
  });
}

function fiscalConnectionStatus(diagnostic) {
  return Object.freeze({
    fiscalConnectionChecked: diagnostic?.responseReceived === true,
    fiscalConnectionAvailable: diagnostic?.valid === true && diagnostic?.serviceOperational === true,
  });
}

export function createNfeCertificateActivationService({ repository, issuerResolver, certificateAdapter, availabilityService = null, now = () => new Date() } = {}) {
  if (!repository?.getPendingBinding || !repository?.activate) throw new TypeError('Informe o repositório protegido do certificado.');
  if (typeof issuerResolver !== 'function' || !certificateAdapter?.inspectBinding) throw new TypeError('Informe os validadores server-side do certificado.');
  return Object.freeze({
    id: 'avantalab-nfe-certificate-activation-v1',
    async activate({ context, certificateId } = {}) {
      const denied = accessError(context);
      if (denied) return { ok: false, errors: [denied] };
      if (certificateId && !UUID.test(clean(certificateId))) return { ok: false, errors: [issue('AV-NFE-CERTIFICATE-ID', 'certificate', 'O certificado instalado não pôde ser identificado.')] };
      try {
        const issuer = await issuerResolver({ companyId: context.companyId });
        const expectedDocument = digits(issuer?.document);
        if (expectedDocument.length !== 14) return { ok: false, errors: [issue('AV-NFE-CERTIFICATE-COMPANY', 'company', 'Complete o CNPJ da empresa antes de validar o certificado.')] };
        const binding = await repository.getPendingBinding({ companyId: context.companyId, certificateId: clean(certificateId) || undefined });
        if (!binding) return { ok: false, errors: [issue('AV-NFE-CERTIFICATE-PENDING', 'certificate', 'Nenhum certificado instalado aguarda validação.')] };
        const checkedAt = now();
        const diagnostic = await certificateAdapter.inspectBinding({
          secureReference: binding.secureReference,
          expectedDocument,
          expectedMode: binding.expectedMode,
          now: checkedAt,
        });
        if (!diagnostic?.valid || !diagnostic.readyForXmlSignature || !diagnostic.readyForMutualTls
          || !diagnostic.ownerVerified || !diagnostic.validityVerified || !diagnostic.keyUsageVerified
          || !diagnostic.chainVerified || !diagnostic.rootPinned || !diagnostic.revocationVerified) {
          const recorded = repository.recordValidation
            ? await repository.recordValidation({ companyId: context.companyId, certificateId: binding.certificateId, actorId: context.actorId, evidence: activationEvidence(diagnostic, checkedAt) })
            : null;
          return { ok: true, result: pendingResult(recorded?.summary || binding.summary, diagnostic), errors: [] };
        }
        const activated = await repository.activate({
          companyId: context.companyId,
          certificateId: binding.certificateId,
          actorId: context.actorId,
          evidence: activationEvidence(diagnostic, checkedAt),
        });
        let connection = fiscalConnectionStatus(null);
        if (availabilityService?.checkAvailability) {
          try {
            const availability = await availabilityService.checkAvailability({
              secureReference: binding.secureReference,
              expectedDocument,
              expectedMode: binding.expectedMode,
            });
            connection = fiscalConnectionStatus(availability);
          } catch { /* indisponibilidade do autorizador não invalida o certificado */ }
        }
        return {
          ok: true,
          result: Object.freeze({
            status: 'active',
            certificateInstalled: true,
            certificateActive: true,
            validationChecked: true,
            blockers: Object.freeze([]),
            ...connection,
            summary: activated.summary,
          }),
          errors: [],
        };
      } catch {
        return { ok: false, errors: [issue('AV-NFE-CERTIFICATE-ACTIVATION', 'certificate', 'Não foi possível concluir a validação do certificado. Ele continuará instalado e inativo.')] };
      }
    },
  });
}
