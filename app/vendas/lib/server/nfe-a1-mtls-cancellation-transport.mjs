import { request as nodeHttpsRequest } from 'node:https';

import { prepareNfeA1Pkcs12ForMutualTls } from './nfe-a1-certificate.mjs';
import { NFE_CANCELLATION_ACTION, NFE_CANCELLATION_CONTENT_TYPE, NFE_CANCELLATION_ENDPOINT, NFE_CANCELLATION_RESPONSE_LIMIT, NFE_CANCELLATION_TIMEOUT_MS } from './nfe-cancellation-service.mjs';
import { validateSecureCertificateReference } from './nfe-certificate-vault.mjs';

export const NFE_A1_MTLS_CANCELLATION_TRANSPORT_REFERENCE = '2026-09-08';

const MAX_PKCS12_BYTES = 5 * 1024 * 1024;
const MAX_PASSPHRASE_BYTES = 512;
const MAX_REQUEST_BYTES = 512 * 1024;
const FORBIDDEN_OPERATION = /<(?:[A-Za-z_][\w.-]*:)?(?:enviNFe|consStatServ|inutNFe|consSitNFe|consReciNFe|consCad|distDFeInt)\b/i;
const openingTagCount = (xml, name) => (xml.match(new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${name}\\b`, 'gi')) || []).length;

function requestIsSafe(request) {
  const body = typeof request?.body === 'string' ? request.body.trim() : '';
  const reference = validateSecureCertificateReference(request?.secureCertificateReference);
  const eventId = /<(?:[A-Za-z_][\w.-]*:)?infEvento\b[^>]*\bId=["'](ID110111\d{44}01)["']/i.exec(body)?.[1] || '';
  const accessKey = /<(?:[A-Za-z_][\w.-]*:)?chNFe>(\d{44})<\/(?:[A-Za-z_][\w.-]*:)?chNFe>/i.exec(body)?.[1] || '';
  return request?.endpoint === NFE_CANCELLATION_ENDPOINT
    && request?.action === NFE_CANCELLATION_ACTION
    && request?.contentType === NFE_CANCELLATION_CONTENT_TYPE
    && reference.valid && request?.followRedirects === false
    && Number.isInteger(request?.timeoutMs) && request.timeoutMs > 0 && request.timeoutMs <= NFE_CANCELLATION_TIMEOUT_MS
    && Number.isInteger(request?.maxResponseBytes) && request.maxResponseBytes > 0 && request.maxResponseBytes <= NFE_CANCELLATION_RESPONSE_LIMIT
    && Buffer.byteLength(body, 'utf8') > 0 && Buffer.byteLength(body, 'utf8') <= MAX_REQUEST_BYTES
    && /<(?:[A-Za-z_][\w.-]*:)?Envelope\b/i.test(body)
    && /<(?:[A-Za-z_][\w.-]*:)?envEvento\b[^>]*\bversao=["']1\.00["']/i.test(body)
    && /<(?:[A-Za-z_][\w.-]*:)?idLote>\d{1,15}<\/(?:[A-Za-z_][\w.-]*:)?idLote>/i.test(body)
    && /<(?:[A-Za-z_][\w.-]*:)?cOrgao>35<\/(?:[A-Za-z_][\w.-]*:)?cOrgao>/i.test(body)
    && /<(?:[A-Za-z_][\w.-]*:)?tpAmb>2<\/(?:[A-Za-z_][\w.-]*:)?tpAmb>/i.test(body)
    && /<(?:[A-Za-z_][\w.-]*:)?tpEvento>110111<\/(?:[A-Za-z_][\w.-]*:)?tpEvento>/i.test(body)
    && eventId === `ID110111${accessKey}01` && accessKey.startsWith('35')
    && openingTagCount(body, 'Envelope') === 1 && openingTagCount(body, 'envEvento') === 1
    && openingTagCount(body, 'idLote') === 1 && openingTagCount(body, 'evento') === 1
    && openingTagCount(body, 'infEvento') === 1 && openingTagCount(body, 'cOrgao') === 1
    && openingTagCount(body, 'tpAmb') === 1 && openingTagCount(body, 'tpEvento') === 1
    && openingTagCount(body, 'Signature') === 1 && openingTagCount(body, 'SignatureValue') === 1
    && !FORBIDDEN_OPERATION.test(body) && !/<!DOCTYPE|<!ENTITY|<!\[CDATA\[|<!--/i.test(body);
}

function normalizePkcs12(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  return null;
}

function readResponse(response, maxResponseBytes) {
  return new Promise((resolve, reject) => {
    const status = Number(response?.statusCode || 0);
    const declaredLength = Number(response?.headers?.['content-length'] || 0);
    if (status !== 200) { response?.resume?.(); reject(new Error('O serviço de cancelamento devolveu um código HTTP inesperado.')); return; }
    if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) { response?.resume?.(); reject(new Error('A resposta de cancelamento excede o limite permitido.')); return; }
    const chunks = [];
    let received = 0;
    let settled = false;
    const fail = (error) => { if (!settled) { settled = true; response?.destroy?.(); reject(error); } };
    response.on('data', (chunk) => {
      if (settled) return;
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      received += bytes.byteLength;
      if (received > maxResponseBytes) { fail(new Error('A resposta de cancelamento excede o limite permitido.')); return; }
      chunks.push(bytes);
    });
    response.on('error', () => fail(new Error('A resposta de cancelamento foi interrompida.')));
    response.on('end', () => { if (!settled) { settled = true; resolve({ status, body: Buffer.concat(chunks).toString('utf8') }); } });
  });
}

function postWithMutualTls({ requestImpl, url, request, pkcs12, passphrase }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => { if (!settled) { settled = true; callback(value); } };
    const socketRequest = requestImpl({ protocol: 'https:', hostname: url.hostname, port: 443, path: url.pathname, method: 'POST', servername: url.hostname, agent: false, rejectUnauthorized: true, minVersion: 'TLSv1.2', pfx: pkcs12, passphrase, headers: { Accept: 'application/soap+xml, text/xml', 'Content-Type': request.contentType, 'Content-Length': Buffer.byteLength(request.body, 'utf8'), 'User-Agent': 'AvantaLab-Fiscal-Cancellation/1.0' } }, (response) => readResponse(response, request.maxResponseBytes).then((value) => finish(resolve, value)).catch((error) => finish(reject, error)));
    socketRequest.setTimeout(request.timeoutMs, () => socketRequest.destroy(new Error('O cancelamento excedeu o tempo limite.')));
    socketRequest.on('error', () => finish(reject, new Error('A conexão mTLS com o serviço de cancelamento não foi concluída.')));
    socketRequest.end(request.body, 'utf8');
  });
}

export function createNfeA1MtlsCancellationTransport({ secretLoader, chainResolver, requestImpl = nodeHttpsRequest, identityPreparer = prepareNfeA1Pkcs12ForMutualTls } = {}) {
  const configured = Boolean(secretLoader?.configured === true && secretLoader?.load && chainResolver?.configured === true && chainResolver?.resolve && typeof requestImpl === 'function' && typeof identityPreparer === 'function');
  return Object.freeze({
    id: 'avantalab-nfe-a1-mtls-cancellation-v1', configured,
    async postSoap(request = {}) {
      if (!configured || !requestIsSafe(request)) throw new Error('O cancelamento mTLS não atende ao contrato seguro.');
      const secret = await secretLoader.load(request.secureCertificateReference);
      const source = normalizePkcs12(secret?.pkcs12);
      let prepared = null;
      let passphrase = typeof secret?.passphrase === 'string' ? secret.passphrase : '';
      if (!source || source.byteLength < 1 || source.byteLength > MAX_PKCS12_BYTES || Buffer.byteLength(passphrase, 'utf8') < 1 || Buffer.byteLength(passphrase, 'utf8') > MAX_PASSPHRASE_BYTES) { source?.fill(0); passphrase = ''; throw new Error('O certificado ativo não pôde ser carregado para o cancelamento mTLS.'); }
      try {
        prepared = await identityPreparer({ pkcs12: source, passphrase, chainResolver });
        if (!Buffer.isBuffer(prepared) || prepared.byteLength < 1 || prepared.byteLength > MAX_PKCS12_BYTES) throw new Error('O certificado ativo não pôde ser preparado para o cancelamento mTLS.');
        if (prepared !== source) source.fill(0);
        return await postWithMutualTls({ requestImpl, url: new URL(request.endpoint), request, pkcs12: prepared, passphrase });
      } finally { prepared?.fill(0); source.fill(0); passphrase = ''; }
    },
  });
}
