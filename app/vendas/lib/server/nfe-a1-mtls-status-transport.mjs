import { request as nodeHttpsRequest } from 'node:https';

import { prepareNfeA1Pkcs12ForMutualTls } from './nfe-a1-certificate.mjs';
import { validateSecureCertificateReference } from './nfe-certificate-vault.mjs';
import {
  NFE_STATUS_SERVICE_ACTION,
  NFE_STATUS_SERVICE_CONTENT_TYPE,
  NFE_STATUS_SERVICE_ENDPOINT,
  NFE_STATUS_SERVICE_RESPONSE_LIMIT,
  NFE_STATUS_SERVICE_TIMEOUT_MS,
} from './nfe-status-service.mjs';

export const NFE_A1_MTLS_STATUS_TRANSPORT_REFERENCE = '2026-09-04';

const MAX_PKCS12_BYTES = 5 * 1024 * 1024;
const MAX_PASSPHRASE_BYTES = 512;
const MAX_REQUEST_BYTES = 16 * 1024;
const FORBIDDEN_FISCAL_OPERATION = /<(?:[A-Za-z_][\w.-]*:)?(?:NFe|enviNFe|inutNFe|evento|consSitNFe|consReciNFe)\b|<(?:[A-Za-z_][\w.-]*:)?(?:CNPJ|CPF|chNFe)\b/i;

function statusRequestIsSafe({ endpoint, action, contentType, body, secureCertificateReference, timeoutMs, maxResponseBytes, followRedirects }) {
  const reference = validateSecureCertificateReference(secureCertificateReference);
  const source = typeof body === 'string' ? body.trim() : '';
  return endpoint === NFE_STATUS_SERVICE_ENDPOINT
    && action === NFE_STATUS_SERVICE_ACTION
    && contentType === NFE_STATUS_SERVICE_CONTENT_TYPE
    && reference.valid
    && followRedirects === false
    && Number.isInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= NFE_STATUS_SERVICE_TIMEOUT_MS
    && Number.isInteger(maxResponseBytes) && maxResponseBytes > 0 && maxResponseBytes <= NFE_STATUS_SERVICE_RESPONSE_LIMIT
    && Buffer.byteLength(source, 'utf8') > 0 && Buffer.byteLength(source, 'utf8') <= MAX_REQUEST_BYTES
    && /<(?:(?:[A-Za-z_][\w.-]*):)?Envelope\b/i.test(source)
    && /<consStatServ\b[^>]*\bversao=["']4\.00["']/i.test(source)
    && /<tpAmb>2<\/tpAmb>/i.test(source)
    && /<cUF>35<\/cUF>/i.test(source)
    && /<xServ>STATUS<\/xServ>/i.test(source)
    && !FORBIDDEN_FISCAL_OPERATION.test(source);
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
    if (status !== 200) {
      response?.resume?.();
      reject(new Error('O serviço de status devolveu um código HTTP inesperado.'));
      return;
    }
    if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
      response?.resume?.();
      reject(new Error('A resposta do serviço de status excede o limite permitido.'));
      return;
    }
    const chunks = [];
    let receivedBytes = 0;
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      response?.destroy?.();
      reject(error);
    };
    response.on('data', (chunk) => {
      if (settled) return;
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      receivedBytes += bytes.byteLength;
      if (receivedBytes > maxResponseBytes) {
        fail(new Error('A resposta do serviço de status excede o limite permitido.'));
        return;
      }
      chunks.push(bytes);
    });
    response.on('error', () => fail(new Error('A resposta do serviço de status foi interrompida.')));
    response.on('end', () => {
      if (settled) return;
      settled = true;
      resolve({ status, body: Buffer.concat(chunks).toString('utf8') });
    });
  });
}

function postWithMutualTls({ requestImpl, url, request, pkcs12, passphrase }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };
    const socketRequest = requestImpl({
      protocol: 'https:',
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      servername: url.hostname,
      agent: false,
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
      pfx: pkcs12,
      passphrase,
      headers: {
        Accept: 'application/soap+xml, text/xml',
        'Content-Type': request.contentType,
        'Content-Length': Buffer.byteLength(request.body, 'utf8'),
        'User-Agent': 'AvantaLab-Fiscal-Status/1.0',
      },
    }, (response) => {
      readResponse(response, request.maxResponseBytes)
        .then((value) => finish(resolve, value))
        .catch((error) => finish(reject, error));
    });
    socketRequest.setTimeout(request.timeoutMs, () => socketRequest.destroy(new Error('A consulta de status excedeu o tempo limite.')));
    socketRequest.on('error', () => finish(reject, new Error('A conexão mTLS com o serviço de status não foi concluída.')));
    socketRequest.end(request.body, 'utf8');
  });
}

export function createNfeA1MtlsStatusTransport({
  secretLoader,
  chainResolver,
  requestImpl = nodeHttpsRequest,
  identityPreparer = prepareNfeA1Pkcs12ForMutualTls,
} = {}) {
  const configured = Boolean(
    secretLoader?.configured === true
    && typeof secretLoader.load === 'function'
    && chainResolver?.configured === true
    && typeof chainResolver.resolve === 'function'
    && typeof requestImpl === 'function'
    && typeof identityPreparer === 'function',
  );
  return Object.freeze({
    id: 'avantalab-nfe-a1-mtls-status-v1',
    configured,
    async postSoap(request = {}) {
      if (!configured || !statusRequestIsSafe(request)) throw new Error('A consulta mTLS de status não atende ao contrato seguro.');
      const secret = await secretLoader.load(request.secureCertificateReference);
      const sourcePkcs12 = normalizePkcs12(secret?.pkcs12);
      let connectionPkcs12 = null;
      let passphrase = typeof secret?.passphrase === 'string' ? secret.passphrase : '';
      if (!sourcePkcs12 || sourcePkcs12.byteLength < 1 || sourcePkcs12.byteLength > MAX_PKCS12_BYTES || Buffer.byteLength(passphrase, 'utf8') < 1 || Buffer.byteLength(passphrase, 'utf8') > MAX_PASSPHRASE_BYTES) {
        sourcePkcs12?.fill(0);
        passphrase = '';
        throw new Error('O certificado ativo não pôde ser carregado para a conexão mTLS.');
      }
      try {
        connectionPkcs12 = await identityPreparer({ pkcs12: sourcePkcs12, passphrase, chainResolver });
        if (!Buffer.isBuffer(connectionPkcs12) || connectionPkcs12.byteLength < 1 || connectionPkcs12.byteLength > MAX_PKCS12_BYTES) {
          throw new Error('O certificado ativo não pôde ser preparado para a conexão mTLS.');
        }
        if (connectionPkcs12 !== sourcePkcs12) sourcePkcs12.fill(0);
        return await postWithMutualTls({ requestImpl, url: new URL(request.endpoint), request, pkcs12: connectionPkcs12, passphrase });
      } finally {
        connectionPkcs12?.fill(0);
        sourcePkcs12.fill(0);
        passphrase = '';
      }
    },
  });
}
