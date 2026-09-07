import { request as nodeHttpsRequest } from 'node:https';

import { prepareNfeA1Pkcs12ForMutualTls } from './nfe-a1-certificate.mjs';
import {
  NFE_AUTHORIZATION_ACTION,
  NFE_AUTHORIZATION_CONTENT_TYPE,
  NFE_AUTHORIZATION_ENDPOINT,
  NFE_AUTHORIZATION_RESPONSE_LIMIT,
  NFE_AUTHORIZATION_TIMEOUT_MS,
} from './nfe-authorization-service.mjs';
import { validateSecureCertificateReference } from './nfe-certificate-vault.mjs';

export const NFE_A1_MTLS_AUTHORIZATION_TRANSPORT_REFERENCE = '2026-09-04';

const MAX_PKCS12_BYTES = 5 * 1024 * 1024;
const MAX_PASSPHRASE_BYTES = 512;
const MAX_REQUEST_BYTES = (1024 * 1024) + (64 * 1024);
const FORBIDDEN_OPERATION = /<(?:[A-Za-z_][\w.-]*:)?(?:consStatServ|inutNFe|evento|consSitNFe|consReciNFe|consCad|distDFeInt)\b/i;

function openingTagCount(xml, localName) {
  return (xml.match(new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${localName}\\b`, 'gi')) || []).length;
}

function authorizationRequestIsSafe({ endpoint, action, contentType, body, secureCertificateReference, timeoutMs, maxResponseBytes, followRedirects }) {
  const reference = validateSecureCertificateReference(secureCertificateReference);
  const source = typeof body === 'string' ? body.trim() : '';
  const accessKey = /<(?:[A-Za-z_][\w.-]*:)?infNFe\b[^>]*\bId=["']NFe(\d{44})["']/i.exec(source)?.[1] || '';
  return endpoint === NFE_AUTHORIZATION_ENDPOINT
    && action === NFE_AUTHORIZATION_ACTION
    && contentType === NFE_AUTHORIZATION_CONTENT_TYPE
    && reference.valid
    && followRedirects === false
    && Number.isInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= NFE_AUTHORIZATION_TIMEOUT_MS
    && Number.isInteger(maxResponseBytes) && maxResponseBytes > 0 && maxResponseBytes <= NFE_AUTHORIZATION_RESPONSE_LIMIT
    && Buffer.byteLength(source, 'utf8') > 0 && Buffer.byteLength(source, 'utf8') <= MAX_REQUEST_BYTES
    && /<(?:[A-Za-z_][\w.-]*:)?Envelope\b/i.test(source)
    && /<(?:[A-Za-z_][\w.-]*:)?enviNFe\b[^>]*\bversao=["']4\.00["']/i.test(source)
    && /<(?:[A-Za-z_][\w.-]*:)?idLote>\d{1,15}<\/(?:[A-Za-z_][\w.-]*:)?idLote>/i.test(source)
    && /<(?:[A-Za-z_][\w.-]*:)?indSinc>1<\/(?:[A-Za-z_][\w.-]*:)?indSinc>/i.test(source)
    && /<(?:[A-Za-z_][\w.-]*:)?tpAmb>2<\/(?:[A-Za-z_][\w.-]*:)?tpAmb>/i.test(source)
    && /<(?:[A-Za-z_][\w.-]*:)?cUF>35<\/(?:[A-Za-z_][\w.-]*:)?cUF>/i.test(source)
    && /<(?:[A-Za-z_][\w.-]*:)?mod>55<\/(?:[A-Za-z_][\w.-]*:)?mod>/i.test(source)
    && accessKey.startsWith('35')
    && openingTagCount(source, 'Envelope') === 1
    && openingTagCount(source, 'enviNFe') === 1
    && openingTagCount(source, 'idLote') === 1
    && openingTagCount(source, 'indSinc') === 1
    && openingTagCount(source, 'NFe') === 1
    && openingTagCount(source, 'infNFe') === 1
    && openingTagCount(source, 'tpAmb') === 1
    && openingTagCount(source, 'cUF') === 1
    && openingTagCount(source, 'mod') === 1
    && openingTagCount(source, 'Signature') === 1
    && openingTagCount(source, 'SignatureValue') === 1
    && !FORBIDDEN_OPERATION.test(source)
    && !/<!DOCTYPE|<!ENTITY|<!\[CDATA\[|<!--/i.test(source);
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
      reject(new Error('O serviço de autorização devolveu um código HTTP inesperado.'));
      return;
    }
    if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
      response?.resume?.();
      reject(new Error('A resposta de autorização excede o limite permitido.'));
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
        fail(new Error('A resposta de autorização excede o limite permitido.'));
        return;
      }
      chunks.push(bytes);
    });
    response.on('error', () => fail(new Error('A resposta de autorização foi interrompida.')));
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
        'User-Agent': 'AvantaLab-Fiscal-Authorization/1.0',
      },
    }, (response) => {
      readResponse(response, request.maxResponseBytes)
        .then((value) => finish(resolve, value))
        .catch((error) => finish(reject, error));
    });
    socketRequest.setTimeout(request.timeoutMs, () => socketRequest.destroy(new Error('A autorização excedeu o tempo limite.')));
    socketRequest.on('error', () => finish(reject, new Error('A conexão mTLS com o serviço de autorização não foi concluída.')));
    socketRequest.end(request.body, 'utf8');
  });
}

export function createNfeA1MtlsAuthorizationTransport({
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
    id: 'avantalab-nfe-a1-mtls-authorization-v1',
    configured,
    async postSoap(request = {}) {
      if (!configured || !authorizationRequestIsSafe(request)) throw new Error('A autorização mTLS não atende ao contrato seguro.');
      const secret = await secretLoader.load(request.secureCertificateReference);
      const sourcePkcs12 = normalizePkcs12(secret?.pkcs12);
      let connectionPkcs12 = null;
      let passphrase = typeof secret?.passphrase === 'string' ? secret.passphrase : '';
      if (!sourcePkcs12 || sourcePkcs12.byteLength < 1 || sourcePkcs12.byteLength > MAX_PKCS12_BYTES || Buffer.byteLength(passphrase, 'utf8') < 1 || Buffer.byteLength(passphrase, 'utf8') > MAX_PASSPHRASE_BYTES) {
        sourcePkcs12?.fill(0);
        passphrase = '';
        throw new Error('O certificado ativo não pôde ser carregado para a autorização mTLS.');
      }
      try {
        connectionPkcs12 = await identityPreparer({ pkcs12: sourcePkcs12, passphrase, chainResolver });
        if (!Buffer.isBuffer(connectionPkcs12) || connectionPkcs12.byteLength < 1 || connectionPkcs12.byteLength > MAX_PKCS12_BYTES) {
          throw new Error('O certificado ativo não pôde ser preparado para a autorização mTLS.');
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
