import { createHash, X509Certificate } from 'node:crypto';
import { strFromU8, unzipSync } from 'fflate';

import {
  ICP_BRASIL_CURRENT_BUNDLE_SHA512,
  ICP_BRASIL_CURRENT_BUNDLE_URL,
} from './icp-brasil-trust-anchors.mjs';

export const ICP_BRASIL_CHAIN_RESOLVER_REFERENCE = '2026-09-04';

const MAX_CHAIN_LENGTH = 8;
const MAX_CERTIFICATE_BYTES = 64 * 1024;
const DEFAULT_MAX_ZIP_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_EXPANDED_BYTES = 5 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;
const SHA512_PATTERN = /^[a-f0-9]{128}$/i;

function normalizeFingerprint(value) {
  return String(value || '').replace(/[^a-f0-9]/gi, '').toUpperCase();
}

function certificateFromPem(pem) {
  if (typeof pem !== 'string' || !pem.includes('BEGIN CERTIFICATE') || Buffer.byteLength(pem, 'utf8') > MAX_CERTIFICATE_BYTES) {
    throw new Error('Certificado público inválido no pacote da ICP-Brasil.');
  }
  return new X509Certificate(pem);
}

function certificateEntry(pem) {
  const certificate = certificateFromPem(pem);
  return Object.freeze({ pem, certificate, fingerprint: normalizeFingerprint(certificate.fingerprint256) });
}

function validAt(certificate, now) {
  const validFrom = new Date(certificate.validFrom);
  const validTo = new Date(certificate.validTo);
  return Number.isFinite(validFrom.getTime())
    && Number.isFinite(validTo.getTime())
    && validFrom.getTime() <= now.getTime()
    && validTo.getTime() > now.getTime();
}

function isTrustedRoot(entry, trustedRoots, now) {
  const { certificate } = entry;
  try {
    return trustedRoots.has(entry.fingerprint)
      && certificate.ca === true
      && certificate.subject === certificate.issuer
      && validAt(certificate, now)
      && certificate.verify(certificate.publicKey);
  } catch {
    return false;
  }
}

function issuedBy(child, issuer, now) {
  try {
    return issuer.certificate.ca === true
      && validAt(issuer.certificate, now)
      && child.certificate.checkIssued(issuer.certificate)
      && child.certificate.verify(issuer.certificate.publicKey);
  } catch {
    return false;
  }
}

function deduplicate(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    if (!entry.fingerprint || seen.has(entry.fingerprint)) return false;
    seen.add(entry.fingerprint);
    return true;
  });
}

function findTrustedPath(leafEntry, candidates, trustedRoots, now) {
  function visit(current, path, visited) {
    if (path.length > MAX_CHAIN_LENGTH) return null;
    if (isTrustedRoot(current, trustedRoots, now)) return path;
    if (path.length === MAX_CHAIN_LENGTH) return null;
    for (const issuer of candidates) {
      if (visited.has(issuer.fingerprint) || !issuedBy(current, issuer, now)) continue;
      const nextVisited = new Set(visited);
      nextVisited.add(issuer.fingerprint);
      const resolved = visit(issuer, [...path, issuer], nextVisited);
      if (resolved) return resolved;
    }
    return null;
  }

  return visit(leafEntry, [], new Set([leafEntry.fingerprint]));
}

function safeCertificateEntries(pems) {
  const entries = [];
  for (const pem of pems) {
    try {
      entries.push(certificateEntry(pem));
    } catch {}
  }
  return deduplicate(entries);
}

function parseOfficialBundle(zipBytes, maxExpandedBytes) {
  let entryCount = 0;
  let expandedBytes = 0;
  const files = unzipSync(zipBytes, {
    filter(file) {
      entryCount += 1;
      if (entryCount > 512) throw new Error('O pacote oficial excede o limite de arquivos permitido.');
      if (file.name.startsWith('/') || file.name.includes('..') || file.name.includes('\\')) throw new Error('O pacote oficial contém um nome de arquivo inválido.');
      if (!Number.isSafeInteger(file.originalSize) || file.originalSize < 0) throw new Error('O pacote oficial contém tamanho de arquivo inválido.');
      expandedBytes += file.originalSize;
      if (expandedBytes > maxExpandedBytes) throw new Error('O pacote oficial excede o limite expandido permitido.');
      return /\.(?:crt|cer|pem)$/i.test(file.name);
    },
  });
  const pems = [];
  for (const bytes of Object.values(files)) {
    const pem = strFromU8(bytes);
    if (pem.includes('BEGIN CERTIFICATE')) pems.push(pem);
  }
  const entries = safeCertificateEntries(pems).filter(({ certificate }) => certificate.ca === true);
  if (!entries.length) throw new Error('O pacote oficial não contém certificados de autoridade válidos.');
  return entries;
}

async function fetchOfficialBundle({ fetchImpl, bundleUrl, expectedSha512, timeoutMs, maxZipBytes, maxExpandedBytes }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(bundleUrl, {
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
    });
    if (!response?.ok) throw new Error('O pacote oficial da ICP-Brasil não está disponível.');
    const contentLength = Number(response.headers?.get?.('content-length') || 0);
    if (contentLength > maxZipBytes) throw new Error('O pacote oficial excede o limite compactado permitido.');
    const zipBytes = new Uint8Array(await response.arrayBuffer());
    if (!zipBytes.byteLength || zipBytes.byteLength > maxZipBytes) throw new Error('O pacote oficial está vazio ou excede o limite permitido.');
    const digest = createHash('sha512').update(zipBytes).digest('hex');
    if (digest.toLowerCase() !== expectedSha512.toLowerCase()) throw new Error('A integridade do pacote oficial da ICP-Brasil não foi confirmada.');
    return parseOfficialBundle(zipBytes, maxExpandedBytes);
  } finally {
    clearTimeout(timeout);
  }
}

export function createIcpBrasilChainResolver({
  fetchImpl = globalThis.fetch,
  bundleUrl = ICP_BRASIL_CURRENT_BUNDLE_URL,
  expectedSha512 = ICP_BRASIL_CURRENT_BUNDLE_SHA512,
  trustedRootFingerprints = [],
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxZipBytes = DEFAULT_MAX_ZIP_BYTES,
  maxExpandedBytes = DEFAULT_MAX_EXPANDED_BYTES,
} = {}) {
  const trustedRoots = new Set(trustedRootFingerprints.map(normalizeFingerprint).filter(Boolean));
  const configured = typeof fetchImpl === 'function'
    && bundleUrl === ICP_BRASIL_CURRENT_BUNDLE_URL
    && SHA512_PATTERN.test(expectedSha512)
    && trustedRoots.size > 0;
  let officialBundlePromise;

  async function loadOfficialBundle() {
    if (!officialBundlePromise) {
      officialBundlePromise = fetchOfficialBundle({ fetchImpl, bundleUrl, expectedSha512, timeoutMs, maxZipBytes, maxExpandedBytes })
        .catch((error) => {
          officialBundlePromise = undefined;
          throw error;
        });
    }
    return officialBundlePromise;
  }

  return Object.freeze({
    id: 'icp-brasil-official-chain-resolver-v1',
    configured,
    async resolve({ certificatePem, chainPem = [], now = new Date() } = {}) {
      const unresolved = Object.freeze({ resolved: false, chainPem: [], source: 'unavailable' });
      if (!configured || !Array.isArray(chainPem) || chainPem.length > MAX_CHAIN_LENGTH - 1 || !(now instanceof Date) || !Number.isFinite(now.getTime())) return unresolved;
      let leafEntry;
      try {
        leafEntry = certificateEntry(certificatePem);
      } catch {
        return unresolved;
      }
      const providedEntries = safeCertificateEntries(chainPem);
      const providedPath = findTrustedPath(leafEntry, providedEntries, trustedRoots, now);
      if (providedPath) return Object.freeze({ resolved: true, chainPem: providedPath.map((entry) => entry.pem), source: 'provided' });
      try {
        const officialEntries = await loadOfficialBundle();
        const resolvedPath = findTrustedPath(leafEntry, deduplicate([...providedEntries, ...officialEntries]), trustedRoots, now);
        if (!resolvedPath) return unresolved;
        return Object.freeze({ resolved: true, chainPem: resolvedPath.map((entry) => entry.pem), source: 'official-bundle' });
      } catch {
        return unresolved;
      }
    },
  });
}
