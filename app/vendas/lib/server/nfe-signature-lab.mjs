import { createHash, createSign, createVerify, randomBytes, X509Certificate } from 'node:crypto';
import { spawn } from 'node:child_process';
import forge from 'node-forge';
import { NFE_NAMESPACE } from '../nfe-sp-xml.mjs';
import { validateNfeXmlAgainstXsd } from './nfe-xsd-validator.mjs';

export const NFE_XMLDSIG_CANONICALIZATION = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
export const NFE_XMLDSIG_SIGNATURE_METHOD = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
export const NFE_XMLDSIG_DIGEST_METHOD = 'http://www.w3.org/2000/09/xmldsig#sha1';
export const NFE_XMLDSIG_ENVELOPED_TRANSFORM = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature';
export const NFE_XMLDSIG_NAMESPACE = 'http://www.w3.org/2000/09/xmldsig#';
export const NFE_SIGNATURE_LAB_REFERENCE = '2026-08-31';

const XMLLINT_PATH = '/usr/bin/xmllint';
const MAX_XML_BYTES = 1024 * 1024;
const MAX_DIAGNOSTIC_BYTES = 64 * 1024;
const PROCESS_TIMEOUT_MS = 8_000;

function labError(code, field, message) {
  return { code, field, message };
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function extractElement(xml, expression) {
  return String(xml || '').match(expression)?.[0] || '';
}

function extractElementValue(xml, tagName) {
  return String(xml || '').match(new RegExp(`<(?:\\w+:)?${tagName}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tagName}>`))?.[1]?.trim() || '';
}

function normalizeInfNfeNamespace(fragment) {
  if (/^<infNFe\b[^>]*\sxmlns=/.test(fragment)) return fragment;
  return fragment.replace(/^<infNFe\b/, `<infNFe xmlns="${NFE_NAMESPACE}"`);
}

function canonicalizeXml(xml) {
  const source = typeof xml === 'string' ? xml : '';
  if (!source || Buffer.byteLength(source, 'utf8') > MAX_XML_BYTES) {
    return Promise.reject(new Error('O fragmento excede o limite seguro da canonicalização local.'));
  }
  return new Promise((resolve, reject) => {
    const child = spawn(XMLLINT_PATH, ['--nonet', '--c14n', '-'], { env: { PATH: process.env.PATH || '/usr/bin:/bin' }, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(() => reject(new Error('A canonicalização XML excedeu oito segundos.')));
    }, PROCESS_TIMEOUT_MS);
    child.stdout.on('data', (chunk) => {
      if (Buffer.byteLength(stdout, 'utf8') >= MAX_XML_BYTES) return;
      stdout += chunk.toString('utf8').slice(0, MAX_XML_BYTES);
    });
    child.stderr.on('data', (chunk) => {
      if (Buffer.byteLength(stderr, 'utf8') >= MAX_DIAGNOSTIC_BYTES) return;
      stderr += chunk.toString('utf8').slice(0, MAX_DIAGNOSTIC_BYTES);
    });
    child.on('error', () => finish(() => reject(new Error('O servidor não conseguiu iniciar a canonicalização XML local.'))));
    child.on('close', (code) => finish(() => {
      if (code === 0 && stdout) resolve(stdout);
      else reject(new Error(stderr.replace(/\s+/g, ' ').trim() || 'O fragmento XML não pôde ser canonicalizado.'));
    }));
    child.stdin.on('error', () => {});
    child.stdin.end(source, 'utf8');
  });
}

function createEphemeralCertificate(now = new Date()) {
  const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  const certificate = forge.pki.createCertificate();
  certificate.publicKey = keys.publicKey;
  certificate.serialNumber = `01${randomBytes(15).toString('hex')}`;
  certificate.validity.notBefore = new Date(now.getTime() - 60_000);
  certificate.validity.notAfter = new Date(now.getTime() + 15 * 60_000);
  const attributes = [
    { name: 'countryName', value: 'BR' },
    { shortName: 'O', value: 'NAO ICP-BRASIL - LABORATORIO' },
    { shortName: 'OU', value: 'CERTIFICADO EFEMERO SEM VALOR FISCAL' },
    { name: 'commonName', value: 'AVANTALAB LABORATORIO XMLDSIG' },
  ];
  certificate.setSubject(attributes);
  certificate.setIssuer(attributes);
  certificate.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: false },
    { name: 'subjectKeyIdentifier' },
  ]);
  certificate.sign(keys.privateKey, forge.md.sha256.create());
  const certificatePem = forge.pki.certificateToPem(certificate);
  const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
  const certificateDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes();
  return { certificatePem, privateKeyPem, certificateBase64: Buffer.from(certificateDer, 'binary').toString('base64') };
}

function buildSignedInfo(referenceId, digestValue) {
  return [
    `<ds:SignedInfo xmlns:ds="${NFE_XMLDSIG_NAMESPACE}">`,
    `  <ds:CanonicalizationMethod Algorithm="${NFE_XMLDSIG_CANONICALIZATION}"/>`,
    `  <ds:SignatureMethod Algorithm="${NFE_XMLDSIG_SIGNATURE_METHOD}"/>`,
    `  <ds:Reference URI="#${referenceId}">`,
    '    <ds:Transforms>',
    `      <ds:Transform Algorithm="${NFE_XMLDSIG_ENVELOPED_TRANSFORM}"/>`,
    `      <ds:Transform Algorithm="${NFE_XMLDSIG_CANONICALIZATION}"/>`,
    '    </ds:Transforms>',
    `    <ds:DigestMethod Algorithm="${NFE_XMLDSIG_DIGEST_METHOD}"/>`,
    `    <ds:DigestValue>${digestValue}</ds:DigestValue>`,
    '  </ds:Reference>',
    '</ds:SignedInfo>',
  ].join('\n');
}

function appendSignature(xml, signedInfo, signatureValue, certificateBase64) {
  const signature = [
    `  <ds:Signature xmlns:ds="${NFE_XMLDSIG_NAMESPACE}">`,
    signedInfo,
    `    <ds:SignatureValue>${signatureValue}</ds:SignatureValue>`,
    '    <ds:KeyInfo>',
    '      <ds:X509Data>',
    `        <ds:X509Certificate>${certificateBase64}</ds:X509Certificate>`,
    '      </ds:X509Data>',
    '    </ds:KeyInfo>',
    '  </ds:Signature>',
  ].join('\n');
  return xml.replace(/\n<\/NFe>\s*$/, `\n${signature}\n</NFe>`);
}

export async function createProtectedSignedNfeXml({ unsignedXml, certificatePem, signCanonicalized } = {}) {
  const source = typeof unsignedXml === 'string' ? unsignedXml : '';
  if (!source || /<(?:\w+:)?Signature\b/.test(source)) throw new Error('A assinatura aceita somente uma NF-e ainda não assinada.');
  if (typeof certificatePem !== 'string' || !certificatePem.includes('BEGIN CERTIFICATE')) throw new Error('O certificado público do assinante não está disponível.');
  if (typeof signCanonicalized !== 'function') throw new Error('O assinador protegido não está disponível.');
  const infNfe = extractElement(source, /<infNFe\b[\s\S]*?<\/infNFe>/);
  const referenceId = infNfe.match(/\bId="([^"]+)"/)?.[1] || '';
  if (!/^NFe\d{44}$/.test(referenceId)) throw new Error('O identificador da infNFe não corresponde à chave de acesso técnica esperada.');
  const canonicalInfNfe = await canonicalizeXml(normalizeInfNfeNamespace(infNfe));
  const digestValue = createHash('sha1').update(canonicalInfNfe, 'utf8').digest('base64');
  const signedInfo = buildSignedInfo(referenceId, digestValue);
  const canonicalSignedInfo = await canonicalizeXml(signedInfo);
  const signatureValue = String(await signCanonicalized(canonicalSignedInfo) || '').replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(signatureValue)) throw new Error('O assinador protegido não devolveu uma assinatura válida.');
  const certificate = new X509Certificate(certificatePem);
  const signedXml = appendSignature(source, signedInfo, signatureValue, certificate.raw.toString('base64'));
  return {
    signedXml,
    accessKey: referenceId.slice(3),
    digestValue,
    signatureValue,
    certificateFingerprint: certificate.fingerprint256,
    certificateValidFrom: certificate.validFrom,
    certificateValidTo: certificate.validTo,
    keyBits: certificate.publicKey.asymmetricKeyDetails?.modulusLength || 0,
  };
}

export async function createEphemeralLabSignedNfeXml(unsignedXml, now = new Date()) {
  let credentials = createEphemeralCertificate(now);
  const result = await createProtectedSignedNfeXml({
    unsignedXml,
    certificatePem: credentials.certificatePem,
    signCanonicalized(canonicalSignedInfo) {
      const signer = createSign('RSA-SHA1');
      signer.update(canonicalSignedInfo, 'utf8');
      signer.end();
      return signer.sign(credentials.privateKeyPem, 'base64');
    },
  });
  credentials = { certificatePem: '', privateKeyPem: '', certificateBase64: '' };
  return result;
}

export async function verifyProtectedSignedNfeXml(signedXml, expectedIssuerDocument = '') {
  const source = typeof signedXml === 'string' ? signedXml : '';
  const errors = [];
  const infNfe = extractElement(source, /<infNFe\b[\s\S]*?<\/infNFe>/);
  const signedInfo = extractElement(source, /<(?:ds:)?SignedInfo\b[\s\S]*?<\/(?:ds:)?SignedInfo>/);
  const referenceId = infNfe.match(/\bId="([^"]+)"/)?.[1] || '';
  const referenceUri = signedInfo.match(/<(?:ds:)?Reference\b[^>]*\bURI="#([^"]+)"/)?.[1] || '';
  const digestValue = extractElementValue(signedInfo, 'DigestValue');
  const signatureValue = extractElementValue(source, 'SignatureValue');
  const certificateBase64 = extractElementValue(source, 'X509Certificate').replace(/\s+/g, '');
  if (!infNfe || !signedInfo || !referenceId || !certificateBase64) errors.push(labError('AV-NFE-SIG-STRUCTURE', 'signature', 'A estrutura XMLDSig obrigatória não foi localizada no XML de laboratório.'));

  let digestVerified = false;
  let signatureVerified = false;
  let certificateSelfSignatureVerified = false;
  let certificateFingerprint = '';
  let certificateValidFrom = '';
  let certificateValidTo = '';
  let keyBits = 0;
  try {
    const canonicalInfNfe = await canonicalizeXml(normalizeInfNfeNamespace(infNfe));
    const calculatedDigest = createHash('sha1').update(canonicalInfNfe, 'utf8').digest('base64');
    digestVerified = calculatedDigest === digestValue;
    if (!digestVerified) errors.push(labError('AV-NFE-SIG-DIGEST', 'infNFe', 'O digest não confere com o conteúdo canonicalizado da infNFe.'));
    const canonicalSignedInfo = await canonicalizeXml(signedInfo);
    const certificate = new X509Certificate(Buffer.from(certificateBase64, 'base64'));
    certificateFingerprint = certificate.fingerprint256;
    certificateValidFrom = certificate.validFrom;
    certificateValidTo = certificate.validTo;
    keyBits = certificate.publicKey.asymmetricKeyDetails?.modulusLength || 0;
    const verifier = createVerify('RSA-SHA1');
    verifier.update(canonicalSignedInfo, 'utf8');
    verifier.end();
    signatureVerified = verifier.verify(certificate.publicKey, signatureValue, 'base64');
    certificateSelfSignatureVerified = certificate.subject === certificate.issuer && certificate.verify(certificate.publicKey);
    if (!signatureVerified) errors.push(labError('AV-NFE-SIG-VALUE', 'SignatureValue', 'A assinatura RSA não confere com SignedInfo e o certificado efêmero.'));
  } catch (error) {
    errors.push(labError('AV-NFE-SIG-VERIFY', 'signature', error instanceof Error ? error.message : 'A assinatura de laboratório não pôde ser verificada.'));
  }

  const referenceVerified = Boolean(referenceId && referenceId === referenceUri);
  if (!referenceVerified) errors.push(labError('AV-NFE-SIG-REFERENCE', 'Reference.URI', 'A referência XMLDSig não aponta exatamente para o Id da infNFe.'));
  const accessKey = referenceId.startsWith('NFe') ? referenceId.slice(3) : '';
  const expectedDocument = digits(expectedIssuerDocument);
  const issuerDocumentBoundToReference = expectedDocument.length === 14 && accessKey.slice(6, 20) === expectedDocument;
  if (!issuerDocumentBoundToReference) errors.push(labError('AV-NFE-SIG-ISSUER', 'issuer.document', 'O CNPJ do emissor não confere com a chave referenciada pela assinatura.'));
  const schemaResult = await validateNfeXmlAgainstXsd(source, { allowSignature: true });
  if (!schemaResult.valid) errors.push(...schemaResult.errors);
  return {
    valid: errors.length === 0,
    accessKey,
    referenceVerified,
    digestVerified,
    signatureVerified,
    certificateSelfSignatureVerified,
    issuerDocumentBoundToReference,
    signedXsdValid: schemaResult.valid,
    schemaValidationExecuted: schemaResult.executed,
    schemaPackage: schemaResult.schemaPackage,
    certificateFingerprint,
    certificateValidFrom,
    certificateValidTo,
    keyBits,
    errors,
  };
}

export async function verifyLabSignedNfeXml(signedXml, expectedIssuerDocument = '') {
  const result = await verifyProtectedSignedNfeXml(signedXml, expectedIssuerDocument);
  if (!result.certificateSelfSignatureVerified) {
    result.errors.push(labError('AV-NFE-SIG-CERT', 'X509Certificate', 'O certificado efêmero não passou na verificação de autoassinatura do laboratório.'));
    result.valid = false;
  }
  return result;
}

export async function runNfeSignatureLab(unsignedXml, expectedIssuerDocument, now = new Date()) {
  try {
    const created = await createEphemeralLabSignedNfeXml(unsignedXml, now);
    const verification = await verifyLabSignedNfeXml(created.signedXml, expectedIssuerDocument);
    return {
      ...verification,
      mode: 'assinatura-efemera-laboratorio',
      signatureExecuted: true,
      signedXmlReturned: false,
      transmissionAttempted: false,
      canonicalizationMethod: NFE_XMLDSIG_CANONICALIZATION,
      signatureMethod: NFE_XMLDSIG_SIGNATURE_METHOD,
      digestMethod: NFE_XMLDSIG_DIGEST_METHOD,
      certificateProfile: 'autoassinado-efemero-nao-icp-brasil',
      realCertificateOwnerValidated: false,
      icpBrasilChainValidated: false,
      warnings: [
        'A chave privada e o certificado foram criados somente em memória para esta execução e descartados sem retornar ao navegador.',
        'O certificado é autoassinado e não pertence à ICP-Brasil; titularidade real, cadeia, revogação e certificado A1/A3 continuam bloqueados.',
        'O XML assinado existiu somente durante o teste e não foi armazenado, devolvido ou transmitido.',
      ],
    };
  } catch (error) {
    return {
      valid: false,
      mode: 'assinatura-efemera-laboratorio',
      signatureExecuted: false,
      signedXmlReturned: false,
      transmissionAttempted: false,
      canonicalizationMethod: NFE_XMLDSIG_CANONICALIZATION,
      signatureMethod: NFE_XMLDSIG_SIGNATURE_METHOD,
      digestMethod: NFE_XMLDSIG_DIGEST_METHOD,
      certificateProfile: 'autoassinado-efemero-nao-icp-brasil',
      realCertificateOwnerValidated: false,
      icpBrasilChainValidated: false,
      referenceVerified: false,
      digestVerified: false,
      signatureVerified: false,
      certificateSelfSignatureVerified: false,
      issuerDocumentBoundToReference: false,
      signedXsdValid: false,
      schemaValidationExecuted: false,
      schemaPackage: '',
      certificateFingerprint: '',
      certificateValidFrom: '',
      certificateValidTo: '',
      keyBits: 0,
      accessKey: '',
      errors: [labError('AV-NFE-SIG-LAB', 'signature', error instanceof Error ? error.message : 'O laboratório XMLDSig não foi concluído.')],
      warnings: [],
    };
  }
}
