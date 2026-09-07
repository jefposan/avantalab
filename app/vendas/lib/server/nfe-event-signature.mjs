import { createHash, createVerify, X509Certificate } from 'node:crypto';
import { spawn } from 'node:child_process';

export const NFE_EVENT_SIGNATURE_REFERENCE = '2026-09-08';

const NFE_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe';
const XMLDSIG_NAMESPACE = 'http://www.w3.org/2000/09/xmldsig#';
const C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
const RSA_SHA1 = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
const SHA1 = 'http://www.w3.org/2000/09/xmldsig#sha1';
const ENVELOPED = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature';
const XMLLINT_PATH = '/usr/bin/xmllint';
const MAX_XML_BYTES = 256 * 1024;
const TIMEOUT_MS = 8_000;

const digits = (value) => String(value ?? '').replace(/\D/g, '');
const block = (xml, name) => String(xml || '').match(new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${name}\\b[\\s\\S]*?<\\/(?:[A-Za-z_][\\w.-]*:)?${name}>`, 'i'))?.[0] || '';
const value = (xml, name) => String(xml || '').match(new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${name}\\b[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z_][\\w.-]*:)?${name}>`, 'i'))?.[1]?.replace(/<[^>]+>/g, '').trim() || '';

function canonicalize(xml) {
  const source = typeof xml === 'string' ? xml : '';
  if (!source || Buffer.byteLength(source, 'utf8') > MAX_XML_BYTES) return Promise.reject(new Error('O fragmento do evento excede o limite seguro.'));
  return new Promise((resolve, reject) => {
    const child = spawn(XMLLINT_PATH, ['--nonet', '--c14n', '-'], { env: { PATH: process.env.PATH || '/usr/bin:/bin' }, stdio: ['pipe', 'pipe', 'ignore'] });
    let output = '';
    let settled = false;
    const finish = (callback, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(result);
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(reject, new Error('A canonicalização do evento excedeu o tempo limite.'));
    }, TIMEOUT_MS);
    child.stdout.on('data', (chunk) => { if (Buffer.byteLength(output, 'utf8') < MAX_XML_BYTES) output += chunk.toString('utf8'); });
    child.on('error', () => finish(reject, new Error('A canonicalização XML do evento não está disponível.')));
    child.on('close', (code) => code === 0 && output ? finish(resolve, output) : finish(reject, new Error('O evento não pôde ser canonicalizado.')));
    child.stdin.on('error', () => {});
    child.stdin.end(source, 'utf8');
  });
}

function namespacedInfo(fragment) {
  return /^<infEvento\b[^>]*\sxmlns=/.test(fragment) ? fragment : fragment.replace(/^<infEvento\b/, `<infEvento xmlns="${NFE_NAMESPACE}"`);
}

function signedInfo(referenceId, digestValue) {
  return `<ds:SignedInfo xmlns:ds="${XMLDSIG_NAMESPACE}"><ds:CanonicalizationMethod Algorithm="${C14N}"/><ds:SignatureMethod Algorithm="${RSA_SHA1}"/><ds:Reference URI="#${referenceId}"><ds:Transforms><ds:Transform Algorithm="${ENVELOPED}"/><ds:Transform Algorithm="${C14N}"/></ds:Transforms><ds:DigestMethod Algorithm="${SHA1}"/><ds:DigestValue>${digestValue}</ds:DigestValue></ds:Reference></ds:SignedInfo>`;
}

export async function createProtectedSignedNfeEventXml({ unsignedEventXml, certificatePem, signCanonicalized } = {}) {
  const source = typeof unsignedEventXml === 'string' ? unsignedEventXml.trim() : '';
  if (!source || Buffer.byteLength(source, 'utf8') > MAX_XML_BYTES || /<!DOCTYPE|<!ENTITY|<!\[CDATA\[|<!--|<(?:\w+:)?Signature\b/i.test(source)) throw new Error('A assinatura aceita somente um evento fiscal ainda não assinado.');
  if (typeof certificatePem !== 'string' || !certificatePem.includes('BEGIN CERTIFICATE')) throw new Error('O certificado público do assinante não está disponível.');
  if (typeof signCanonicalized !== 'function') throw new Error('O assinador protegido do evento não está disponível.');
  const info = block(source, 'infEvento');
  const referenceId = info.match(/\bId=["']([^"']+)["']/i)?.[1] || '';
  const accessKey = value(info, 'chNFe');
  const sequence = value(info, 'nSeqEvento');
  if (referenceId !== `ID110111${accessKey}${String(sequence).padStart(2, '0')}` || !/^\d{44}$/.test(accessKey)) throw new Error('O Id do evento não corresponde à chave, ao tipo e à sequência informados.');
  const canonicalInfo = await canonicalize(namespacedInfo(info));
  const digestValue = createHash('sha1').update(canonicalInfo, 'utf8').digest('base64');
  const infoToSign = signedInfo(referenceId, digestValue);
  const canonicalSignedInfo = await canonicalize(infoToSign);
  const signatureValue = String(await signCanonicalized(canonicalSignedInfo) || '').replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(signatureValue)) throw new Error('O assinador protegido não devolveu uma assinatura válida.');
  const certificate = new X509Certificate(certificatePem);
  const signature = `<ds:Signature xmlns:ds="${XMLDSIG_NAMESPACE}">${infoToSign}<ds:SignatureValue>${signatureValue}</ds:SignatureValue><ds:KeyInfo><ds:X509Data><ds:X509Certificate>${certificate.raw.toString('base64')}</ds:X509Certificate></ds:X509Data></ds:KeyInfo></ds:Signature>`;
  const signedEventXml = source.replace(/<\/evento>\s*$/i, `${signature}</evento>`);
  return { signedEventXml, accessKey, eventId: referenceId, digestValue, signatureValue, certificateFingerprint: certificate.fingerprint256 };
}

export async function verifyProtectedSignedNfeEventXml(signedEventXml, expectedIssuerDocument = '') {
  const source = typeof signedEventXml === 'string' ? signedEventXml.trim() : '';
  const errors = [];
  const info = block(source, 'infEvento');
  const infoToSign = block(source, 'SignedInfo');
  const referenceId = info.match(/\bId=["']([^"']+)["']/i)?.[1] || '';
  const referenceUri = infoToSign.match(/\bURI=["']#([^"']+)["']/i)?.[1] || '';
  const accessKey = value(info, 'chNFe');
  const issuer = digits(value(info, 'CNPJ'));
  const expected = digits(expectedIssuerDocument);
  let digestVerified = false;
  let signatureVerified = false;
  try {
    const calculated = createHash('sha1').update(await canonicalize(namespacedInfo(info)), 'utf8').digest('base64');
    digestVerified = calculated === value(infoToSign, 'DigestValue');
    const certificate = new X509Certificate(Buffer.from(value(source, 'X509Certificate').replace(/\s+/g, ''), 'base64'));
    const verifier = createVerify('RSA-SHA1');
    verifier.update(await canonicalize(infoToSign), 'utf8');
    verifier.end();
    signatureVerified = verifier.verify(certificate.publicKey, value(source, 'SignatureValue'), 'base64');
  } catch {}
  if (!/^ID110111\d{44}\d{2}$/.test(referenceId) || referenceId !== referenceUri) errors.push({ code: 'AV-NFE-EVENT-SIG-REFERENCE', field: 'Reference.URI', message: 'A assinatura não referencia exatamente o Id do evento.' });
  if (!digestVerified) errors.push({ code: 'AV-NFE-EVENT-SIG-DIGEST', field: 'DigestValue', message: 'O resumo criptográfico do evento não confere.' });
  if (!signatureVerified) errors.push({ code: 'AV-NFE-EVENT-SIG-VALUE', field: 'SignatureValue', message: 'A assinatura criptográfica do evento não confere.' });
  if (!/^\d{44}$/.test(accessKey) || expected.length !== 14 || issuer !== expected || accessKey.slice(6, 20) !== expected) errors.push({ code: 'AV-NFE-EVENT-SIG-ISSUER', field: 'CNPJ', message: 'O emissor do evento não corresponde à chave da NF-e.' });
  return { valid: errors.length === 0, accessKey, eventId: referenceId, digestVerified, signatureVerified, errors };
}
