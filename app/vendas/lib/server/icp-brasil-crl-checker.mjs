import { isIP } from 'node:net';
import { fromBER } from 'asn1js';
import { Certificate, CertificateRevocationList } from 'pkijs';

export const ICP_BRASIL_CRL_CHECKER_REFERENCE = 'DOC-ICP-04-8.1-RFC5280-2026-09-04';

const CRL_DISTRIBUTION_POINTS_OID = '2.5.29.31';
const AUTHORITY_KEY_IDENTIFIER_OID = '2.5.29.35';
const CRL_NUMBER_OID = '2.5.29.20';
const DEFAULT_MAX_BYTES = 16 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_ASN1_DEPTH = 64;
const MAX_ASN1_NODES = 250_000;
const MAX_CHAIN_LENGTH = 8;
const MAX_URLS_PER_CERTIFICATE = 4;
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const BLOCKED_HOSTNAMES = new Set(['localhost', 'localhost.localdomain']);

function unknown() {
  return { status: 'unknown', source: 'crl', verified: false, checkedAt: '', nextUpdate: '' };
}

function pemToDer(value) {
  if (typeof value !== 'string' || !value.includes('-----BEGIN CERTIFICATE-----') || Buffer.byteLength(value, 'utf8') > 64 * 1024) {
    throw new Error('Certificado público inválido.');
  }
  const base64 = value.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g, '');
  const der = Buffer.from(base64, 'base64');
  if (!der.byteLength) throw new Error('Certificado público inválido.');
  return der;
}

function crlDer(value) {
  const source = Buffer.isBuffer(value) ? value : Buffer.from(value);
  const asText = source.subarray(0, Math.min(source.byteLength, 64)).toString('ascii');
  if (!asText.includes('-----BEGIN')) return source;
  const base64 = source.toString('ascii').replace(/-----BEGIN X509 CRL-----|-----END X509 CRL-----|\s/g, '');
  return Buffer.from(base64, 'base64');
}

function parsedCrl(value) {
  const der = crlDer(value);
  const asn1 = fromBER(der, {
    maxDepth: MAX_ASN1_DEPTH,
    maxNodes: MAX_ASN1_NODES,
    maxContentLength: DEFAULT_MAX_BYTES,
  });
  if (asn1.offset !== der.byteLength) throw new Error('A estrutura ASN.1 da LCR é inválida ou excede os limites seguros.');
  return new CertificateRevocationList({ schema: asn1.result });
}

function parsedCertificate(pem) {
  return Certificate.fromBER(pemToDer(pem));
}

function hasRequiredCrlExtensions(crl) {
  const extensions = crl.crlExtensions?.extensions || [];
  const authorityKeyIdentifier = extensions.find((item) => item.extnID === AUTHORITY_KEY_IDENTIFIER_OID);
  const crlNumber = extensions.find((item) => item.extnID === CRL_NUMBER_OID);
  return Boolean(authorityKeyIdentifier && !authorityKeyIdentifier.critical && crlNumber && !crlNumber.critical);
}

function validCrlWindow(crl, now) {
  const thisUpdate = crl.thisUpdate?.value instanceof Date ? crl.thisUpdate.value : new Date('');
  const nextUpdate = crl.nextUpdate?.value instanceof Date ? crl.nextUpdate.value : new Date('');
  return Number.isFinite(thisUpdate.getTime())
    && Number.isFinite(nextUpdate.getTime())
    && thisUpdate.getTime() <= now.getTime() + CLOCK_SKEW_MS
    && nextUpdate.getTime() > now.getTime();
}

export function validateIcpBrasilCrlDistributionUrl(value) {
  try {
    const url = new URL(String(value || ''));
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    const defaultPort = !url.port || (url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443');
    const valid = ['http:', 'https:'].includes(url.protocol)
      && !url.username
      && !url.password
      && defaultPort
      && hostname.length > 3
      && !BLOCKED_HOSTNAMES.has(hostname)
      && !hostname.endsWith('.local')
      && isIP(hostname) === 0;
    return { valid, url: valid ? url.toString() : '' };
  } catch {
    return { valid: false, url: '' };
  }
}

export function extractIcpBrasilCrlDistributionUrls(certificatePem) {
  try {
    const certificate = parsedCertificate(certificatePem);
    const extension = certificate.extensions?.find((item) => item.extnID === CRL_DISTRIBUTION_POINTS_OID);
    const points = extension?.parsedValue?.distributionPoints || [];
    const urls = points.flatMap((point) => point.distributionPoint || [])
      .filter((name) => name.type === 6)
      .map((name) => validateIcpBrasilCrlDistributionUrl(name.value))
      .filter((item) => item.valid)
      .map((item) => item.url);
    return Object.freeze([...new Set(urls)].slice(0, MAX_URLS_PER_CERTIFICATE));
  } catch {
    return Object.freeze([]);
  }
}

async function readLimitedBody(response, maxBytes) {
  const declaredLength = Number(response.headers?.get?.('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new Error('LCR acima do limite permitido.');
  if (!response.body?.getReader) {
    const body = Buffer.from(await response.arrayBuffer());
    if (body.byteLength > maxBytes) throw new Error('LCR acima do limite permitido.');
    return body;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error('LCR acima do limite permitido.');
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, size);
}

export function createIcpBrasilCrlRevocationChecker({
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  maxBytes = DEFAULT_MAX_BYTES,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const configured = typeof fetchImpl === 'function'
    && Number.isInteger(maxBytes) && maxBytes > 0 && maxBytes <= DEFAULT_MAX_BYTES
    && Number.isInteger(timeoutMs) && timeoutMs >= 1_000 && timeoutMs <= 30_000;
  const cache = new Map();

  async function load(url, instant) {
    const cached = cache.get(url);
    if (cached && cached.expiresAt > instant.getTime()) return cached.body;
    const response = await fetchImpl(url, {
      method: 'GET',
      redirect: 'error',
      cache: 'no-store',
      headers: { accept: 'application/pkix-crl, application/octet-stream;q=0.9' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response?.ok) throw new Error('LCR indisponível.');
    const body = await readLimitedBody(response, maxBytes);
    cache.set(url, { body, expiresAt: instant.getTime() + 5 * 60 * 1000 });
    return body;
  }

  return Object.freeze({
    id: 'avantalab-icp-brasil-lcr-v1',
    reference: ICP_BRASIL_CRL_CHECKER_REFERENCE,
    configured,
    async check({ certificatePem, chainPem = [] } = {}) {
      if (!configured || !Array.isArray(chainPem) || chainPem.length === 0 || chainPem.length > MAX_CHAIN_LENGTH) return unknown();
      try {
        const certificates = [certificatePem, ...chainPem].map(parsedCertificate);
        const instant = now();
        if (!(instant instanceof Date) || !Number.isFinite(instant.getTime())) return unknown();
        let earliestNextUpdate = null;
        let verifiedCount = 0;
        for (let index = 0; index < certificates.length - 1; index += 1) {
          const certificate = certificates[index];
          const issuerCertificate = certificates[index + 1];
          const urls = extractIcpBrasilCrlDistributionUrls(index === 0 ? certificatePem : chainPem[index - 1]);
          if (!urls.length) return unknown();
          let certificateVerified = false;
          for (const url of urls) {
            try {
              const body = await load(url, instant);
              const crl = parsedCrl(body);
              if (crl.version !== 1 || !hasRequiredCrlExtensions(crl) || !validCrlWindow(crl, instant)) continue;
              if (!await crl.verify({ issuerCertificate })) continue;
              if (crl.isCertificateRevoked(certificate)) {
                return { status: 'revoked', source: 'crl', verified: true, checkedAt: instant.toISOString(), nextUpdate: crl.nextUpdate.value.toISOString() };
              }
              const candidateNextUpdate = crl.nextUpdate.value;
              if (!earliestNextUpdate || candidateNextUpdate < earliestNextUpdate) earliestNextUpdate = candidateNextUpdate;
              certificateVerified = true;
              verifiedCount += 1;
              break;
            } catch {}
          }
          if (!certificateVerified) return unknown();
        }
        if (verifiedCount !== certificates.length - 1 || !earliestNextUpdate) return unknown();
        return { status: 'good', source: 'crl', verified: true, checkedAt: instant.toISOString(), nextUpdate: earliestNextUpdate.toISOString() };
      } catch {
        return unknown();
      }
    },
  });
}
