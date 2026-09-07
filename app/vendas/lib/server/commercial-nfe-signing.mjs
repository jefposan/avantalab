import { buildSignedNfeArtifact, persistSignedNfeArtifact } from './nfe-signed-artifact.mjs';
import { reconstructCommercialNfeSigningDocument } from './commercial-nfe-signing-preparation.mjs';

export const COMMERCIAL_NFE_SIGNING_REFERENCE = '2026-09-05';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,120}$/;
const clean = (value) => String(value ?? '').trim();
const issue = (code, field, message) => ({ code, field, message });

function accessError(context) {
  if (!context || !UUID.test(clean(context.companyId)) || !UUID.test(clean(context.actorId))) return issue('AV-COMMERCIAL-SESSION', 'session', 'Confirme novamente a sessão e a empresa ativa.');
  if (context.moduleId && context.moduleId !== 'vendas') return issue('AV-COMMERCIAL-MODULE', 'module', 'O acesso não pertence ao módulo Vendas e Serviços.');
  if (!context.active || !context.moduleActive || context.effectivePermissions?.['fiscal.issue'] !== true) return issue('AV-COMMERCIAL-PERMISSION', 'permission', 'Seu acesso não permite confirmar a emissão da nota.');
  return null;
}

export function createCommercialNfeSigningService({
  repository,
  fiscalRuleResolver,
  schemaValidator,
  certificateBindingResolver,
  certificateAdapter,
  signingProvider,
  artifactStorage,
  lifecycle,
} = {}) {
  if (!repository?.load) throw new TypeError('Informe o repositório server-side da assinatura comercial.');
  if (typeof fiscalRuleResolver !== 'function' || typeof certificateBindingResolver !== 'function') throw new TypeError('Informe os resolvedores internos da assinatura comercial.');
  if (!certificateAdapter?.inspectBinding || !signingProvider?.signXml) throw new TypeError('Informe os adaptadores protegidos do certificado A1.');
  if (!artifactStorage?.putImmutable || !lifecycle?.commitSignature) throw new TypeError('Informe o armazenamento imutável e o ciclo fiscal transacional.');
  return Object.freeze({
    id: 'avantalab-commercial-nfe-signing-v1',
    async sign({ context, emissionId, expectedVersion, idempotencyKey } = {}) {
      const denied = accessError(context);
      if (denied) return { ok: false, errors: [denied] };
      const normalizedEmissionId = clean(emissionId);
      const normalizedKey = clean(idempotencyKey);
      if (!UUID.test(normalizedEmissionId) || !Number.isInteger(expectedVersion) || expectedVersion < 1 || !KEY.test(normalizedKey)) return { ok: false, errors: [issue('AV-NFE-SIGN-INPUT', 'emission', 'Atualize a Central Fiscal e tente novamente.')] };
      try {
        const data = await repository.load({ companyId: context.companyId, emissionId: normalizedEmissionId });
        const reconstructed = await reconstructCommercialNfeSigningDocument({ data, expectedVersion, context, idempotencyKey: normalizedKey, fiscalRuleResolver, schemaValidator });
        if (!reconstructed.ok) return reconstructed;
        const binding = await certificateBindingResolver({ companyId: context.companyId, establishmentId: data.emission.establishmentId, documentType: 'nfe' });
        if (!binding?.secureReference) return { ok: false, errors: [issue('AV-NFE-SIGN-CERTIFICATE', 'certificate', 'Adicione e ative o certificado digital da empresa antes de assinar a NF-e.')] };
        const readiness = await certificateAdapter.inspectBinding({ secureReference: binding.secureReference, expectedDocument: data.draft.issuerSnapshot.document, expectedMode: binding.expectedMode || 'Certificado A1' });
        if (!readiness?.valid || readiness.realCertificateInspected !== true || readiness.readyForXmlSignature !== true) return { ok: false, errors: [issue('AV-NFE-SIGN-CERTIFICATE-READINESS', 'certificate', 'O certificado digital não está ativo para assinatura. Revise validade, titularidade, cadeia e revogação.')] };
        const signed = await signingProvider.signXml({ reference: binding.secureReference, unsignedXml: reconstructed.generated.xml, expectedAccessKey: reconstructed.generated.accessKey, expectedIssuerDocument: data.draft.issuerSnapshot.document });
        if (!signed?.signedXml || signed.accessKey !== reconstructed.generated.accessKey || signed.signatureVerified !== true || signed.signedXsdValid !== true) return { ok: false, errors: [issue('AV-NFE-SIGN-CRYPTOGRAPHY', 'signature', 'A assinatura protegida não pôde ser confirmada.')] };
        const artifact = await buildSignedNfeArtifact({ signedXml: signed.signedXml, expectedAccessKey: reconstructed.generated.accessKey, expectedIssuerDocument: data.draft.issuerSnapshot.document });
        if (!artifact.valid || artifact.checksum !== signed.checksum) return { ok: false, errors: [issue('AV-NFE-SIGN-ARTIFACT', 'signature', 'O documento assinado não passou pela conferência final de integridade.')] };
        const stored = await persistSignedNfeArtifact({ artifact, provider: artifactStorage });
        if (!stored.valid || !stored.persisted) return { ok: false, errors: stored.errors };
        const committed = await lifecycle.commitSignature({
          companyId: context.companyId,
          emissionId: normalizedEmissionId,
          expectedVersion,
          operationKey: normalizedKey,
          actorId: context.actorId,
          accessKey: artifact.accessKey,
          artifact: { artifactType: 'signed_xml', storageReference: stored.storageReference, storageVersion: stored.storageVersion, checksum: artifact.checksum, byteLength: artifact.byteLength, contentType: 'application/xml', createdAt: stored.storedAt },
          publicPayload: { signerFingerprint: artifact.signerFingerprint, signatureVerified: true, schemaPackage: artifact.schemaPackage, storageImmutable: true },
        });
        if (!committed?.ok) return committed;
        return {
          ok: true,
          result: {
            emissionId: committed.emission.id,
            state: committed.emission.state,
            version: committed.emission.version,
            series: committed.emission.series,
            number: committed.emission.number,
            accessKey: committed.emission.accessKey,
            signed: true,
            persisted: true,
            artifactRegistered: Boolean(committed.artifact),
            storageReused: stored.reused,
            realCertificateInspected: true,
            signatureVerified: true,
            signedXsdValid: true,
            transmitted: false,
            signedContentReturned: false,
            sensitiveMaterialReturned: false,
          },
          errors: [],
        };
      } catch {
        return { ok: false, errors: [issue('AV-NFE-SIGN-SERVER', 'signature', 'Não foi possível assinar e guardar a NF-e. Nenhum envio à SEFAZ foi realizado.')] };
      }
    },
  });
}
