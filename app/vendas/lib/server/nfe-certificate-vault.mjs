import { X509Certificate } from 'node:crypto';
import forge from 'node-forge';

export const ICP_BRASIL_CNPJ_OTHERNAME_OID = '2.16.76.1.3.3';
export const NFE_CERTIFICATE_VAULT_REFERENCE = '2026-08-31';

const MAX_CHAIN_LENGTH = 8;
const REVOCATION_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_CERTIFICATE_BYTES = 64 * 1024;
const REFERENCE_PATTERN = /^[a-z0-9][a-z0-9._:/-]{2,119}$/i;
const FORBIDDEN_REFERENCE_PATTERN = /(?:^|[/:])(?:file|https?|data):|\\|\.\.|-----BEGIN|\.p(?:fx|12)$|\.pem$/i;
const FORBIDDEN_PROVIDER_KEYS = /^(?:privatekey|privatekeypem|password|passphrase|secret|token|pfx|pfxbase64|pfxcontent|pkcs12|p12)$/i;

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeFingerprint(value) {
  return String(value || '').replace(/[^a-f0-9]/gi, '').toUpperCase();
}

function diagnosticError(code, field, message) {
  return { code, field, message };
}

export function normalizeSecureCertificateReference(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateSecureCertificateReference(value) {
  const reference = normalizeSecureCertificateReference(value);
  const valid = REFERENCE_PATTERN.test(reference) && !FORBIDDEN_REFERENCE_PATTERN.test(reference);
  return {
    reference,
    valid,
    error: valid ? '' : 'Use somente o identificador técnico do certificado, sem caminho, URL, extensão de arquivo, senha ou conteúdo criptográfico.',
  };
}

function containsForbiddenProviderMaterial(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 8) return false;
  if (Array.isArray(value)) return value.some((item) => containsForbiddenProviderMaterial(item, depth + 1));
  return Object.entries(value).some(([key, item]) => FORBIDDEN_PROVIDER_KEYS.test(key.replace(/[_-]/g, '')) || containsForbiddenProviderMaterial(item, depth + 1));
}

function asn1Text(node) {
  if (!node) return '';
  if (Array.isArray(node.value)) return node.value.map(asn1Text).join('');
  if (typeof node.value !== 'string') return '';
  if ([forge.asn1.Type.OCTETSTRING, forge.asn1.Type.PRINTABLESTRING, forge.asn1.Type.UTF8, forge.asn1.Type.IA5STRING].includes(node.type)) return node.value;
  return '';
}

function findOtherNameValue(node, oid) {
  if (!node || !Array.isArray(node.value)) return '';
  for (let index = 0; index < node.value.length; index += 1) {
    const child = node.value[index];
    if (child?.tagClass === forge.asn1.Class.UNIVERSAL && child.type === forge.asn1.Type.OID) {
      try {
        if (forge.asn1.derToOid(child.value) === oid) {
          return node.value.slice(index + 1).map(asn1Text).join('');
        }
      } catch {}
    }
    const nested = findOtherNameValue(child, oid);
    if (nested) return nested;
  }
  return '';
}

export function extractIcpBrasilCnpjFromCertificate(certificatePem) {
  try {
    const certificate = forge.pki.certificateFromPem(certificatePem);
    const subjectAlternativeName = certificate.getExtension('subjectAltName');
    if (!subjectAlternativeName?.value) return '';
    const generalNames = forge.asn1.fromDer(subjectAlternativeName.value);
    const cnpj = digits(findOtherNameValue(generalNames, ICP_BRASIL_CNPJ_OTHERNAME_OID));
    return cnpj.length === 14 ? cnpj : '';
  } catch {
    return '';
  }
}

function certificateFromPem(pem) {
  if (typeof pem !== 'string' || !pem.includes('BEGIN CERTIFICATE') || Buffer.byteLength(pem, 'utf8') > MAX_CERTIFICATE_BYTES) {
    throw new Error('O provedor não devolveu um certificado público X.509 dentro do limite permitido.');
  }
  return new X509Certificate(pem);
}

function verifyCertificatePath(certificates, trustedRootFingerprints, now) {
  if (!certificates.length) return { chainVerified: false, rootPinned: false };
  let chainVerified = certificates.every((certificate, index) => {
    const validFrom = new Date(certificate.validFrom);
    const validTo = new Date(certificate.validTo);
    const timeValid = Number.isFinite(validFrom.getTime()) && Number.isFinite(validTo.getTime()) && validFrom.getTime() <= now.getTime() && validTo.getTime() > now.getTime();
    return timeValid && (index === 0 ? certificate.ca === false : certificate.ca === true);
  });
  for (let index = 0; index < certificates.length - 1; index += 1) {
    const certificate = certificates[index];
    const issuer = certificates[index + 1];
    if (!certificate.checkIssued(issuer) || !certificate.verify(issuer.publicKey) || issuer.ca !== true) chainVerified = false;
  }
  const root = certificates.at(-1);
  const selfSignedRoot = Boolean(root && root.subject === root.issuer && root.verify(root.publicKey) && root.ca === true);
  chainVerified = chainVerified && selfSignedRoot;
  const trusted = new Set(trustedRootFingerprints.map(normalizeFingerprint).filter(Boolean));
  const rootPinned = Boolean(root && trusted.has(normalizeFingerprint(root.fingerprint256)));
  return { chainVerified, rootPinned };
}

function validRevocationEvidence(revocation, now) {
  if (!revocation || revocation.status !== 'good' || revocation.verified !== true || !['crl', 'ocsp'].includes(revocation.source)) return false;
  const checkedAt = new Date(revocation.checkedAt || '');
  const nextUpdate = new Date(revocation.nextUpdate || '');
  return Number.isFinite(checkedAt.getTime()) && Number.isFinite(nextUpdate.getTime())
    && checkedAt.getTime() <= now.getTime() + REVOCATION_CLOCK_SKEW_MS
    && nextUpdate.getTime() > now.getTime();
}

function baseDiagnostic(referenceResult) {
  return {
    ok: true,
    valid: false,
    mode: 'diagnostico-certificado-digital',
    environment: 'homologacao',
    reference: referenceResult.reference,
    referenceValid: referenceResult.valid,
    adapterConfigured: false,
    realCertificateInspected: false,
    subjectDocumentSource: ICP_BRASIL_CNPJ_OTHERNAME_OID,
    ownerVerified: false,
    validityVerified: false,
    keyUsageVerified: false,
    chainVerified: false,
    rootPinned: false,
    revocationVerified: false,
    signingAvailable: false,
    mutualTlsAvailable: false,
    readyForXmlSignature: false,
    readyForMutualTls: false,
    readyForExternalHomologation: false,
    certificateFingerprint: '',
    certificateValidFrom: '',
    certificateValidTo: '',
    keyType: '',
    keyBits: 0,
    sensitiveMaterialReturned: false,
    signingAttempted: false,
    transmissionAttempted: false,
    errors: [],
    warnings: [],
  };
}

export function createDisabledNfeCertificateVaultProvider() {
  return Object.freeze({
    id: 'cofre-nao-configurado',
    configured: false,
    async inspect() {
      throw new Error('Nenhum certificado digital foi instalado no servidor deste protótipo.');
    },
  });
}

export function createNfeCertificateVaultAdapter({ provider = createDisabledNfeCertificateVaultProvider(), trustedRootFingerprints = [], chainResolver = null } = {}) {
  const adapterConfigured = Boolean(provider?.configured === true && typeof provider.inspect === 'function');
  return Object.freeze({
    id: 'avantalab-nfe-certificate-vault-v1',
    configured: adapterConfigured,
    async inspectBinding({ secureReference, expectedDocument, expectedMode = '', now = new Date() } = {}) {
      const referenceResult = validateSecureCertificateReference(secureReference);
      const result = baseDiagnostic(referenceResult);
      result.adapterConfigured = adapterConfigured;
      const expectedCnpj = digits(expectedDocument);
      if (!referenceResult.valid) result.errors.push(diagnosticError('AV-NFE-CERT-REFERENCE', 'certificate.secureReference', referenceResult.error));
      if (expectedCnpj.length !== 14) result.errors.push(diagnosticError('AV-NFE-CERT-ISSUER', 'issuer.document', 'O CNPJ esperado do estabelecimento emissor não é válido.'));
      if (!adapterConfigured) result.errors.push(diagnosticError('AV-NFE-CERT-INSTALLATION', 'certificate.installation', 'Nenhum certificado digital foi instalado no servidor deste protótipo.'));
      if (result.errors.length) return result;

      let record;
      try {
        record = await provider.inspect(referenceResult.reference);
      } catch {
        result.errors.push(diagnosticError('AV-NFE-CERT-LOOKUP', 'certificate.secureReference', 'O provedor não conseguiu resolver a referência segura do certificado.'));
        return result;
      }
      if (!record || typeof record !== 'object' || containsForbiddenProviderMaterial(record)) {
        result.errors.push(diagnosticError('AV-NFE-CERT-CONTRACT', 'certificate.provider', 'O provedor violou o contrato seguro ao devolver conteúdo secreto ou uma resposta inválida.'));
        return result;
      }
      result.realCertificateInspected = true;
      try {
        let chainPem = Array.isArray(record.chainPem) ? record.chainPem.slice(0, MAX_CHAIN_LENGTH - 1) : [];
        if (Array.isArray(record.chainPem) && record.chainPem.length > MAX_CHAIN_LENGTH - 1) throw new Error('A cadeia excede o limite de certificados permitido.');
        const leaf = certificateFromPem(record.certificatePem);
        const extractedDocument = extractIcpBrasilCnpjFromCertificate(record.certificatePem);
        result.ownerVerified = extractedDocument === expectedCnpj;
        result.certificateFingerprint = leaf.fingerprint256;
        result.certificateValidFrom = leaf.validFrom;
        result.certificateValidTo = leaf.validTo;
        result.keyType = leaf.publicKey.asymmetricKeyType || '';
        result.keyBits = leaf.publicKey.asymmetricKeyDetails?.modulusLength || 0;
        const validFrom = new Date(leaf.validFrom);
        const validTo = new Date(leaf.validTo);
        result.validityVerified = Number.isFinite(validFrom.getTime()) && Number.isFinite(validTo.getTime()) && validFrom.getTime() <= now.getTime() && validTo.getTime() > now.getTime();
        const forgeLeaf = forge.pki.certificateFromPem(record.certificatePem);
        const keyUsage = forgeLeaf.getExtension('keyUsage');
        result.keyUsageVerified = result.keyType === 'rsa' && result.keyBits >= 2048 && keyUsage?.digitalSignature === true;
        let pathResult = verifyCertificatePath([leaf, ...chainPem.map(certificateFromPem)], trustedRootFingerprints, now);
        if (result.ownerVerified && result.validityVerified && result.keyUsageVerified && (!pathResult.chainVerified || !pathResult.rootPinned) && chainResolver?.configured === true && typeof chainResolver.resolve === 'function') {
          let resolvedChain;
          try {
            resolvedChain = await chainResolver.resolve({ certificatePem: record.certificatePem, chainPem, now });
          } catch {
            resolvedChain = null;
          }
          if (resolvedChain?.resolved === true && Array.isArray(resolvedChain.chainPem) && resolvedChain.chainPem.length <= MAX_CHAIN_LENGTH - 1) {
            chainPem = resolvedChain.chainPem;
            pathResult = verifyCertificatePath([leaf, ...chainPem.map(certificateFromPem)], trustedRootFingerprints, now);
          }
        }
        result.chainVerified = pathResult.chainVerified;
        result.rootPinned = pathResult.rootPinned;
        let revocation = record.revocation;
        if (result.ownerVerified && result.validityVerified && result.keyUsageVerified && result.chainVerified && result.rootPinned && typeof provider.checkRevocation === 'function') {
          try {
            revocation = await provider.checkRevocation({ certificatePem: record.certificatePem, chainPem });
          } catch {
            revocation = null;
          }
        }
        result.revocationVerified = validRevocationEvidence(revocation, now);
        const modeMatches = !expectedMode || record.mode === expectedMode;
        result.signingAvailable = modeMatches && record.capabilities?.xmlSignature === true && record.privateKeyExportable === false;
        result.mutualTlsAvailable = modeMatches && record.capabilities?.mutualTls === true && record.privateKeyExportable === false;
        if (!result.ownerVerified) result.errors.push(diagnosticError('AV-NFE-CERT-OWNER', 'certificate.subjectAltName', `O certificado não contém o CNPJ do emissor no otherName ${ICP_BRASIL_CNPJ_OTHERNAME_OID}.`));
        if (!result.validityVerified) result.errors.push(diagnosticError('AV-NFE-CERT-VALIDITY', 'certificate.validity', 'O certificado ainda não é válido ou está expirado.'));
        if (!result.keyUsageVerified) result.errors.push(diagnosticError('AV-NFE-CERT-KEY', 'certificate.publicKey', 'A NF-e exige certificado RSA apto à assinatura digital; a bancada requer chave de pelo menos 2048 bits.'));
        if (!result.chainVerified || !result.rootPinned) result.errors.push(diagnosticError('AV-NFE-CERT-CHAIN', 'certificate.chain', 'A cadeia não termina em uma raiz ICP-Brasil previamente fixada no servidor.'));
        if (!result.revocationVerified) result.errors.push(diagnosticError('AV-NFE-CERT-REVOCATION', 'certificate.revocation', 'Falta evidência atual e válida de não revogação por LCR ou OCSP.'));
        if (!modeMatches) result.errors.push(diagnosticError('AV-NFE-CERT-MODE', 'certificate.mode', 'O modo devolvido pelo provedor não corresponde ao modo configurado para o piloto.'));
        if (!result.signingAvailable) result.errors.push(diagnosticError('AV-NFE-CERT-SIGN', 'certificate.capabilities', 'O provedor não confirmou assinatura XML sem exportar a chave privada.'));
        if (!result.mutualTlsAvailable) result.errors.push(diagnosticError('AV-NFE-CERT-MTLS', 'certificate.capabilities', 'O provedor não confirmou uso do certificado no TLS mútuo sem exportar a chave privada.'));
      } catch (error) {
        result.errors.push(diagnosticError('AV-NFE-CERT-PARSE', 'certificate.public', error instanceof Error ? error.message : 'O certificado público não pôde ser analisado.'));
      }
      result.readyForXmlSignature = result.ownerVerified && result.validityVerified && result.keyUsageVerified && result.chainVerified && result.rootPinned && result.revocationVerified && result.signingAvailable;
      result.readyForMutualTls = result.readyForXmlSignature && result.mutualTlsAvailable;
      result.valid = result.readyForMutualTls && result.errors.length === 0;
      result.warnings = [
        'A inspeção usa somente o certificado público e metadados técnicos; a chave privada permanece protegida no servidor.',
        'A aprovação deste contrato não habilita envio: autenticação, auditoria, fila e transporte SEFAZ permanecem etapas separadas.',
      ];
      return result;
    },
  });
}
