export const ICP_BRASIL_TRUST_ANCHORS_REFERENCE = '2026-08-26';
export const ICP_BRASIL_CURRENT_BUNDLE_SHA512 = '4585a99955607525e475cf22138302fe8ddce6ca8f0926cd1f01809f007d4bcddff5c1070369d29b1de99c0d2eb058ce0deb856bae0189469ba37e09a59d7985';
export const ICP_BRASIL_CURRENT_BUNDLE_URL = 'https://acraiz.icpbrasil.gov.br/credenciadas/CertificadosAC-ICP-Brasil/ACcompactado.zip';
export const ICP_BRASIL_CURRENT_BUNDLE_HASH_URL = 'https://acraiz.icpbrasil.gov.br/credenciadas/CertificadosAC-ICP-Brasil/hashsha512.txt';

const ROOT_SOURCE_BASE = 'https://acraiz.icpbrasil.gov.br/credenciadas/RAIZ/';
const FINGERPRINT_PATTERN = /^[A-F0-9]{64}$/;

function anchor(version, fingerprint256, validFrom, validTo) {
  return Object.freeze({
    version,
    fingerprint256,
    validFrom,
    validTo,
    source: `${ROOT_SOURCE_BASE}ICP-Brasil${version}.crt`,
  });
}

// Âncoras de assinatura vigentes publicadas diretamente pela AC-Raiz/ITI.
// v10 é exclusiva de SSL e v11 de assinatura de código, por isso não entram
// no caminho de confiança dos certificados A1 usados para documentos fiscais.
export const ICP_BRASIL_OFFICIAL_SIGNING_ROOTS = Object.freeze([
  anchor('v4', 'F0C15AFD258FB674E7A96E1A50FF873149364B9EC70D4D93C7A9F1EB6060D020', '2015-04-23T18:38:58.000Z', '2035-04-23T23:59:58.000Z'),
  anchor('v5', 'CAA53FC6091C6951887C976E378F6EF89AA6377C55D97B6475422B71ED7E9B17', '2016-03-02T13:01:38.000Z', '2029-03-02T23:59:38.000Z'),
  anchor('v6', '3BDB9B509352F1D3D71C2BF64D9A38A4E6CEBDA27809D77F7AC476CBDE6E314A', '2018-12-28T13:32:03.000Z', '2038-12-28T12:00:03.000Z'),
  anchor('v7', '5657E70580EB678983F3ED7DFCE091D84CAE6549389A47FCCDA8D0E4DC2CF576', '2018-12-28T13:47:35.000Z', '2038-12-28T12:00:35.000Z'),
  anchor('v12', 'D8478E37CE19C690CF657381E68FE600E4E1A042536830F06847E03E554C4B01', '2024-10-22T14:41:24.000Z', '2037-10-22T12:00:24.000Z'),
  anchor('v13', '2B07D0BC02C4A6E0478ED22D0D99E8F97E1827B269097696A7FEB6AAD30C3AC8', '2025-02-14T13:59:25.000Z', '2045-02-14T13:59:25.000Z'),
]);

function normalizeFingerprint(value) {
  const normalized = String(value || '').replace(/[^a-f0-9]/gi, '').toUpperCase();
  return FINGERPRINT_PATTERN.test(normalized) ? normalized : '';
}

function dateIsInsideAnchorValidity(anchorValue, now) {
  const from = new Date(anchorValue.validFrom);
  const to = new Date(anchorValue.validTo);
  return Number.isFinite(now.getTime())
    && from.getTime() <= now.getTime()
    && to.getTime() > now.getTime();
}

export function resolveIcpBrasilTrustedRootFingerprints(additional = '', { now = new Date() } = {}) {
  const official = ICP_BRASIL_OFFICIAL_SIGNING_ROOTS
    .filter((item) => dateIsInsideAnchorValidity(item, now))
    .map((item) => item.fingerprint256);
  const configured = (Array.isArray(additional) ? additional : String(additional || '').split(','))
    .map(normalizeFingerprint)
    .filter(Boolean);
  return Object.freeze([...new Set([...official, ...configured])]);
}
