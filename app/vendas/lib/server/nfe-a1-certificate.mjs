import { createHash, createSign, randomBytes, X509Certificate } from 'node:crypto';
import forge from 'node-forge';
import { extractIcpBrasilCnpjFromCertificate, validateSecureCertificateReference } from './nfe-certificate-vault.mjs';
import { createProtectedSignedNfeXml, verifyProtectedSignedNfeXml } from './nfe-signature-lab.mjs';
import { createProtectedSignedNfeEventXml, verifyProtectedSignedNfeEventXml } from './nfe-event-signature.mjs';
import { validateNfeCancellationXmlAgainstXsd } from './nfe-cancellation-xsd-validator.mjs';

export const NFE_A1_CERTIFICATE_REFERENCE = '2026-08-31';
export const NFE_A1_MAX_PKCS12_BYTES = 5 * 1024 * 1024;

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function diagnosticError(code, field, message) {
  return { code, field, message };
}

function baseDiagnostic() {
  return {
    ok: true,
    valid: false,
    mode: 'validacao-local-certificado-a1',
    passwordAccepted: false,
    leafCertificateLocated: false,
    privateKeyLocated: false,
    privateKeyMatchesCertificate: false,
    ownerVerified: false,
    validityVerified: false,
    keyUsageVerified: false,
    clientAuthenticationVerified: false,
    certificateFingerprint: '',
    certificateValidFrom: '',
    certificateValidTo: '',
    keyType: '',
    keyBits: 0,
    chainLength: 0,
    readyForServerInstallation: false,
    certificateActive: false,
    sensitiveMaterialReturned: false,
    networkAttempted: false,
    errors: [],
    warnings: [],
  };
}

function normalizePkcs12Buffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  return null;
}

function dnKey(name) {
  return (name?.attributes || []).map((attribute) => `${attribute.type || attribute.name}=${String(attribute.value || '').trim().toLocaleLowerCase('pt-BR')}`).join('|');
}

function orderCertificateChain(leaf, certificates) {
  const remaining = certificates.filter((certificate) => certificate !== leaf);
  const ordered = [];
  let current = leaf;
  while (remaining.length) {
    const issuerKey = dnKey(current.issuer);
    const index = remaining.findIndex((certificate) => dnKey(certificate.subject) === issuerKey);
    if (index < 0) break;
    const [issuer] = remaining.splice(index, 1);
    ordered.push(issuer);
    if (dnKey(issuer.subject) === dnKey(issuer.issuer)) break;
    current = issuer;
  }
  return ordered;
}

function privateKeyMatchesCertificate(privateKey, certificate) {
  try {
    return Boolean(privateKey?.n && privateKey?.e && certificate?.publicKey?.n && certificate?.publicKey?.e && privateKey.n.compareTo(certificate.publicKey.n) === 0 && privateKey.e.compareTo(certificate.publicKey.e) === 0);
  } catch {
    return false;
  }
}

function parsePkcs12(pkcs12Buffer, passphrase) {
  const der = forge.util.createBuffer(pkcs12Buffer.toString('binary'));
  const asn1 = forge.asn1.fromDer(der);
  const store = forge.pkcs12.pkcs12FromAsn1(asn1, false, passphrase);
  const keyBags = [
    ...(store.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || []),
    ...(store.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || []),
  ];
  const certificateBags = store.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const privateKeys = keyBags.map((bag) => bag.key).filter(Boolean);
  const certificates = certificateBags.map((bag) => bag.cert).filter(Boolean);
  let leaf;
  let privateKey;
  for (const certificate of certificates) {
    const matchingKey = privateKeys.find((key) => privateKeyMatchesCertificate(key, certificate));
    if (matchingKey) {
      leaf = certificate;
      privateKey = matchingKey;
      break;
    }
  }
  return { leaf, privateKey, privateKeys, certificates, chain: leaf ? orderCertificateChain(leaf, certificates) : [] };
}

function publicCertificateProfile(parsed, expectedDocument, now) {
  const diagnostic = baseDiagnostic();
  diagnostic.passwordAccepted = true;
  diagnostic.leafCertificateLocated = Boolean(parsed.leaf);
  diagnostic.privateKeyLocated = parsed.privateKeys.length > 0;
  diagnostic.privateKeyMatchesCertificate = Boolean(parsed.leaf && parsed.privateKey);
  diagnostic.chainLength = parsed.chain.length + (parsed.leaf ? 1 : 0);
  if (!parsed.leaf) diagnostic.errors.push(diagnosticError('AV-NFE-A1-LEAF', 'certificate', 'O PKCS#12 não contém um certificado associado à chave privada.'));
  if (!diagnostic.privateKeyLocated) diagnostic.errors.push(diagnosticError('AV-NFE-A1-KEY', 'certificate', 'O PKCS#12 não contém uma chave privada utilizável.'));
  if (!diagnostic.privateKeyMatchesCertificate) diagnostic.errors.push(diagnosticError('AV-NFE-A1-KEY-MATCH', 'certificate', 'A chave privada não corresponde ao certificado identificado.'));
  if (!parsed.leaf) return diagnostic;

  const certificatePem = forge.pki.certificateToPem(parsed.leaf);
  const cnpj = extractIcpBrasilCnpjFromCertificate(certificatePem);
  const expectedCnpj = digits(expectedDocument);
  diagnostic.ownerVerified = expectedCnpj.length === 14 && cnpj === expectedCnpj;
  diagnostic.certificateValidFrom = parsed.leaf.validity.notBefore.toISOString();
  diagnostic.certificateValidTo = parsed.leaf.validity.notAfter.toISOString();
  diagnostic.validityVerified = parsed.leaf.validity.notBefore.getTime() <= now.getTime() && parsed.leaf.validity.notAfter.getTime() > now.getTime();
  diagnostic.keyType = parsed.leaf.publicKey?.n ? 'rsa' : 'desconhecida';
  diagnostic.keyBits = parsed.leaf.publicKey?.n?.bitLength?.() || 0;
  const keyUsage = parsed.leaf.getExtension('keyUsage');
  const extendedKeyUsage = parsed.leaf.getExtension('extKeyUsage');
  diagnostic.keyUsageVerified = diagnostic.keyType === 'rsa' && diagnostic.keyBits >= 2048 && keyUsage?.digitalSignature === true;
  diagnostic.clientAuthenticationVerified = extendedKeyUsage?.clientAuth === true;
  try {
    diagnostic.certificateFingerprint = new X509Certificate(certificatePem).fingerprint256;
  } catch {}
  if (!diagnostic.ownerVerified) diagnostic.errors.push(diagnosticError('AV-NFE-A1-OWNER', 'certificate.subjectAltName', 'O CNPJ do otherName do certificado não corresponde ao estabelecimento informado.'));
  if (!diagnostic.validityVerified) diagnostic.errors.push(diagnosticError('AV-NFE-A1-VALIDITY', 'certificate.validity', 'O certificado ainda não é válido ou está vencido.'));
  if (!diagnostic.keyUsageVerified) diagnostic.errors.push(diagnosticError('AV-NFE-A1-PROFILE', 'certificate.publicKey', 'O certificado precisa usar RSA de pelo menos 2048 bits e permitir assinatura digital.'));
  if (!diagnostic.clientAuthenticationVerified) diagnostic.errors.push(diagnosticError('AV-NFE-A1-MTLS', 'certificate.extendedKeyUsage', 'O certificado precisa permitir autenticação de cliente para a conexão segura com a SEFAZ.'));
  diagnostic.readyForServerInstallation = diagnostic.errors.length === 0;
  diagnostic.valid = diagnostic.readyForServerInstallation;
  diagnostic.warnings = [
    'Esta validação é local e não grava o PKCS#12 ou a senha.',
    'A situação Certificado ativo ainda depende de cadeia ICP-Brasil fixada e consulta vigente de revogação por LCR ou OCSP.',
  ];
  return diagnostic;
}

export async function inspectNfeA1Pkcs12({ pkcs12, passphrase, expectedDocument, now = new Date() } = {}) {
  const diagnostic = baseDiagnostic();
  const source = normalizePkcs12Buffer(pkcs12);
  if (!source || source.byteLength === 0 || source.byteLength > NFE_A1_MAX_PKCS12_BYTES) {
    diagnostic.errors.push(diagnosticError('AV-NFE-A1-SIZE', 'certificate.file', 'Informe um arquivo PKCS#12 de até 5 MB.'));
    return diagnostic;
  }
  if (typeof passphrase !== 'string') {
    diagnostic.errors.push(diagnosticError('AV-NFE-A1-PASSWORD', 'certificate.password', 'A senha precisa ser informada pelo canal seguro local.'));
    return diagnostic;
  }
  try {
    return publicCertificateProfile(parsePkcs12(source, passphrase), expectedDocument, now);
  } catch {
    diagnostic.errors.push(diagnosticError('AV-NFE-A1-PARSE', 'certificate.file', 'A senha está incorreta ou o arquivo PKCS#12 não é válido.'));
    return diagnostic;
  }
}

export async function prepareNfeA1Pkcs12ForProtectedStorage({ pkcs12, passphrase, expectedDocument, now = new Date() } = {}) {
  const source = normalizePkcs12Buffer(pkcs12);
  const diagnostic = await inspectNfeA1Pkcs12({ pkcs12: source, passphrase, expectedDocument, now });
  if (!diagnostic.valid || !source) return { ok: false, diagnostic };
  let internalPassphrase = '';
  try {
    const parsed = parsePkcs12(source, passphrase);
    if (!parsed.leaf || !parsed.privateKey) return { ok: false, diagnostic: { ...diagnostic, valid: false, readyForServerInstallation: false, errors: [...diagnostic.errors, diagnosticError('AV-NFE-A1-IMPORT', 'certificate', 'O certificado não pôde ser preparado para a instalação protegida.')] } };
    internalPassphrase = randomBytes(32).toString('base64url');
    const normalized = forge.pkcs12.toPkcs12Asn1(parsed.privateKey, [parsed.leaf, ...parsed.chain], internalPassphrase, { algorithm: '3des', friendlyName: 'AvantaLab Certificado A1' });
    return {
      ok: true,
      diagnostic,
      protectedPkcs12: Buffer.from(forge.asn1.toDer(normalized).getBytes(), 'binary'),
      internalPassphrase,
      originalPassphraseRetained: false,
    };
  } catch {
    return { ok: false, diagnostic: { ...diagnostic, valid: false, readyForServerInstallation: false, errors: [...diagnostic.errors, diagnosticError('AV-NFE-A1-IMPORT', 'certificate', 'O certificado não pôde ser preparado para a instalação protegida.')] } };
  }
}

export async function prepareNfeA1Pkcs12ForMutualTls({ pkcs12, passphrase, chainResolver, now = new Date() } = {}) {
  const source = normalizePkcs12Buffer(pkcs12);
  if (!source || source.byteLength === 0 || source.byteLength > NFE_A1_MAX_PKCS12_BYTES || typeof passphrase !== 'string' || !passphrase) {
    throw new TypeError('O material interno do certificado não está disponível para TLS mútuo.');
  }
  if (chainResolver?.configured !== true || typeof chainResolver.resolve !== 'function') {
    throw new TypeError('A cadeia ICP-Brasil não está disponível para TLS mútuo.');
  }
  const parsed = parsePkcs12(source, passphrase);
  if (!parsed.leaf || !parsed.privateKey) throw new Error('O PKCS#12 não contém certificado e chave correspondentes.');
  const certificatePem = forge.pki.certificateToPem(parsed.leaf);
  const resolved = await chainResolver.resolve({
    certificatePem,
    chainPem: parsed.chain.map((certificate) => forge.pki.certificateToPem(certificate)),
    now,
  });
  if (resolved?.resolved !== true || !Array.isArray(resolved.chainPem) || resolved.chainPem.length < 1 || resolved.chainPem.length > 7) {
    throw new Error('A cadeia do certificado não pôde ser preparada para TLS mútuo.');
  }
  const chain = resolved.chainPem.map((pem) => forge.pki.certificateFromPem(pem));
  const normalized = forge.pkcs12.toPkcs12Asn1(parsed.privateKey, [parsed.leaf, ...chain], passphrase, {
    algorithm: '3des',
    friendlyName: 'AvantaLab Certificado A1 mTLS',
  });
  const result = Buffer.from(forge.asn1.toDer(normalized).getBytes(), 'binary');
  if (result.byteLength === 0 || result.byteLength > NFE_A1_MAX_PKCS12_BYTES) {
    result.fill(0);
    throw new Error('O PKCS#12 preparado para TLS mútuo excede o limite permitido.');
  }
  return result;
}

export function createNfeA1CertificateProvider({ secretLoader, revocationChecker } = {}) {
  const configured = Boolean(secretLoader?.configured === true && typeof secretLoader.load === 'function');
  return Object.freeze({
    id: 'avantalab-certificado-a1-v1',
    configured,
    async inspect(reference) {
      const referenceResult = validateSecureCertificateReference(reference);
      if (!referenceResult.valid || !configured) throw new Error('A identificação do certificado não pôde ser resolvida com segurança.');
      const secret = await secretLoader.load(referenceResult.reference);
      const pkcs12Buffer = normalizePkcs12Buffer(secret?.pkcs12);
      if (!pkcs12Buffer || pkcs12Buffer.byteLength === 0 || pkcs12Buffer.byteLength > NFE_A1_MAX_PKCS12_BYTES || typeof secret?.passphrase !== 'string') {
        if (Buffer.isBuffer(secret?.pkcs12)) secret.pkcs12.fill(0);
        throw new Error('O material protegido do certificado não é válido.');
      }
      try {
        const parsed = parsePkcs12(pkcs12Buffer, secret.passphrase);
        if (!parsed.leaf || !parsed.privateKey) throw new Error('O PKCS#12 não contém certificado e chave correspondentes.');
        const certificatePem = forge.pki.certificateToPem(parsed.leaf);
        const chainPem = parsed.chain.map((certificate) => forge.pki.certificateToPem(certificate));
        const keyUsage = parsed.leaf.getExtension('keyUsage');
        const extendedKeyUsage = parsed.leaf.getExtension('extKeyUsage');
        const keyBits = parsed.leaf.publicKey?.n?.bitLength?.() || 0;
        return {
          certificatePem,
          chainPem,
          mode: 'Certificado A1',
          privateKeyExportable: false,
          capabilities: {
            xmlSignature: keyBits >= 2048 && keyUsage?.digitalSignature === true,
            mutualTls: keyBits >= 2048 && extendedKeyUsage?.clientAuth === true,
          },
          revocation: { status: 'unknown', source: 'crl', verified: false, checkedAt: '', nextUpdate: '' },
        };
      } finally {
        pkcs12Buffer.fill(0);
      }
    },
    async checkRevocation({ certificatePem, chainPem } = {}) {
      if (revocationChecker?.configured !== true || typeof revocationChecker.check !== 'function') {
        return { status: 'unknown', source: 'crl', verified: false, checkedAt: '', nextUpdate: '' };
      }
      return revocationChecker.check({ certificatePem, chainPem });
    },
    async signXml({ reference, unsignedXml, expectedAccessKey, expectedIssuerDocument } = {}) {
      const referenceResult = validateSecureCertificateReference(reference);
      if (!referenceResult.valid || !configured) throw new Error('A identificação do certificado não pôde ser resolvida com segurança.');
      if (typeof unsignedXml !== 'string' || !unsignedXml.trim()) throw new Error('O documento fiscal para assinatura não foi informado.');
      const secret = await secretLoader.load(referenceResult.reference);
      const pkcs12Buffer = normalizePkcs12Buffer(secret?.pkcs12);
      if (!pkcs12Buffer || pkcs12Buffer.byteLength === 0 || pkcs12Buffer.byteLength > NFE_A1_MAX_PKCS12_BYTES || typeof secret?.passphrase !== 'string') {
        if (Buffer.isBuffer(secret?.pkcs12)) secret.pkcs12.fill(0);
        throw new Error('O material protegido do certificado não é válido.');
      }
      let privateKeyPem = '';
      try {
        const parsed = parsePkcs12(pkcs12Buffer, secret.passphrase);
        if (!parsed.leaf || !parsed.privateKey) throw new Error('O PKCS#12 não contém certificado e chave correspondentes.');
        const certificatePem = forge.pki.certificateToPem(parsed.leaf);
        privateKeyPem = forge.pki.privateKeyToPem(parsed.privateKey);
        const created = await createProtectedSignedNfeXml({
          unsignedXml,
          certificatePem,
          signCanonicalized(canonicalSignedInfo) {
            const signer = createSign('RSA-SHA1');
            signer.update(canonicalSignedInfo, 'utf8');
            signer.end();
            return signer.sign(privateKeyPem, 'base64');
          },
        });
        if (expectedAccessKey && created.accessKey !== String(expectedAccessKey)) throw new Error('A assinatura não corresponde à chave de acesso preparada.');
        const verification = await verifyProtectedSignedNfeXml(created.signedXml, expectedIssuerDocument);
        if (!verification.valid || !verification.signatureVerified || !verification.signedXsdValid) throw new Error('A assinatura gerada não passou pela verificação criptográfica e fiscal.');
        return {
          signedXml: created.signedXml,
          accessKey: created.accessKey,
          checksum: createHash('sha256').update(created.signedXml, 'utf8').digest('hex'),
          byteLength: Buffer.byteLength(created.signedXml, 'utf8'),
          signerFingerprint: created.certificateFingerprint,
          signatureVerified: true,
          signedXsdValid: true,
          schemaPackage: verification.schemaPackage,
          sensitiveMaterialReturned: false,
        };
      } finally {
        privateKeyPem = '';
        pkcs12Buffer.fill(0);
      }
    },
    async signEventXml({ reference, unsignedEventXml, expectedAccessKey, expectedIssuerDocument } = {}) {
      const referenceResult = validateSecureCertificateReference(reference);
      if (!referenceResult.valid || !configured) throw new Error('A identificação do certificado não pôde ser resolvida com segurança.');
      if (typeof unsignedEventXml !== 'string' || !unsignedEventXml.trim()) throw new Error('O evento fiscal para assinatura não foi informado.');
      const secret = await secretLoader.load(referenceResult.reference);
      const pkcs12Buffer = normalizePkcs12Buffer(secret?.pkcs12);
      if (!pkcs12Buffer || pkcs12Buffer.byteLength === 0 || pkcs12Buffer.byteLength > NFE_A1_MAX_PKCS12_BYTES || typeof secret?.passphrase !== 'string') {
        if (Buffer.isBuffer(secret?.pkcs12)) secret.pkcs12.fill(0);
        throw new Error('O material protegido do certificado não é válido.');
      }
      let privateKeyPem = '';
      try {
        const parsed = parsePkcs12(pkcs12Buffer, secret.passphrase);
        if (!parsed.leaf || !parsed.privateKey) throw new Error('O PKCS#12 não contém certificado e chave correspondentes.');
        const certificatePem = forge.pki.certificateToPem(parsed.leaf);
        privateKeyPem = forge.pki.privateKeyToPem(parsed.privateKey);
        const created = await createProtectedSignedNfeEventXml({
          unsignedEventXml,
          certificatePem,
          signCanonicalized(canonicalSignedInfo) {
            const signer = createSign('RSA-SHA1');
            signer.update(canonicalSignedInfo, 'utf8');
            signer.end();
            return signer.sign(privateKeyPem, 'base64');
          },
        });
        if (expectedAccessKey && created.accessKey !== String(expectedAccessKey)) throw new Error('A assinatura do evento não corresponde à chave de acesso esperada.');
        const verification = await verifyProtectedSignedNfeEventXml(created.signedEventXml, expectedIssuerDocument);
        const schema = await validateNfeCancellationXmlAgainstXsd(created.signedEventXml, 'evento');
        if (!verification.valid || !verification.signatureVerified || !verification.digestVerified || !schema.valid) throw new Error('A assinatura do evento não passou pela verificação criptográfica, fiscal e XSD.');
        return { signedEventXml: created.signedEventXml, accessKey: created.accessKey, eventId: created.eventId, checksum: createHash('sha256').update(created.signedEventXml, 'utf8').digest('hex'), byteLength: Buffer.byteLength(created.signedEventXml, 'utf8'), signerFingerprint: created.certificateFingerprint, signatureVerified: true, signedXsdValid: true, schemaPackage: schema.schemaPackage, sensitiveMaterialReturned: false };
      } finally {
        privateKeyPem = '';
        pkcs12Buffer.fill(0);
      }
    },
  });
}
