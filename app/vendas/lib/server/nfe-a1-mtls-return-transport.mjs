import { request as nodeHttpsRequest } from 'node:https';

import { prepareNfeA1Pkcs12ForMutualTls } from './nfe-a1-certificate.mjs';
import {
  NFE_PROTOCOL_ACTION,
  NFE_PROTOCOL_ENDPOINT,
  NFE_RECEIPT_ACTION,
  NFE_RECEIPT_ENDPOINT,
  NFE_RETURN_RESPONSE_LIMIT,
  NFE_RETURN_TIMEOUT_MS,
} from './nfe-return-service.mjs';
import { validateSecureCertificateReference } from './nfe-certificate-vault.mjs';

export const NFE_A1_MTLS_RETURN_TRANSPORT_REFERENCE = '2026-09-04';

const MAX_PKCS12_BYTES = 5 * 1024 * 1024;
const MAX_PASSPHRASE_BYTES = 512;
const MAX_REQUEST_BYTES = 64 * 1024;
const FORBIDDEN_OPERATION = /<(?:[A-Za-z_][\w.-]*:)?(?:enviNFe|consStatServ|inutNFe|evento|consCad|distDFeInt)\b/i;

function openingTagCount(xml, localName) {
  return (xml.match(new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${localName}\\b`, 'gi')) || []).length;
}

function expectedContentType(action) {
  return `application/soap+xml; charset=utf-8; action="${action}"`;
}

function commonRequestIsSafe(request) {
  const source = typeof request.body === 'string' ? request.body.trim() : '';
  const reference = validateSecureCertificateReference(request.secureCertificateReference);
  return reference.valid
    && request.followRedirects === false
    && Number.isInteger(request.timeoutMs) && request.timeoutMs > 0 && request.timeoutMs <= NFE_RETURN_TIMEOUT_MS
    && Number.isInteger(request.maxResponseBytes) && request.maxResponseBytes > 0 && request.maxResponseBytes <= NFE_RETURN_RESPONSE_LIMIT
    && Buffer.byteLength(source, 'utf8') > 0 && Buffer.byteLength(source, 'utf8') <= MAX_REQUEST_BYTES
    && openingTagCount(source, 'Envelope') === 1
    && openingTagCount(source, 'Body') === 1
    && openingTagCount(source, 'nfeDadosMsg') === 1
    && openingTagCount(source, 'NFe') === 0
    && openingTagCount(source, 'Signature') === 0
    && openingTagCount(source, 'enviNFe') === 0
    && !FORBIDDEN_OPERATION.test(source)
    && !/<!DOCTYPE|<!ENTITY|<!\[CDATA\[|<!--/i.test(source);
}

function receiptRequestIsSafe(request) {
  const source = typeof request.body === 'string' ? request.body.trim() : '';
  const receiptNumber = /<(?:[A-Za-z_][\w.-]*:)?nRec>(\d{15})<\/(?:[A-Za-z_][\w.-]*:)?nRec>/i.exec(source)?.[1] || '';
  return commonRequestIsSafe(request)
    && request.endpoint === NFE_RECEIPT_ENDPOINT
    && request.action === NFE_RECEIPT_ACTION
    && request.contentType === expectedContentType(NFE_RECEIPT_ACTION)
    && receiptNumber.startsWith('35')
    && openingTagCount(source, 'consReciNFe') === 1
    && openingTagCount(source, 'tpAmb') === 1
    && openingTagCount(source, 'nRec') === 1
    && openingTagCount(source, 'consSitNFe') === 0
    && openingTagCount(source, 'chNFe') === 0
    && /<(?:[A-Za-z_][\w.-]*:)?consReciNFe\b[^>]*\bversao=["']4\.00["']/i.test(source)
    && /<(?:[A-Za-z_][\w.-]*:)?tpAmb>2<\/(?:[A-Za-z_][\w.-]*:)?tpAmb>/i.test(source);
}

function protocolRequestIsSafe(request) {
  const source = typeof request.body === 'string' ? request.body.trim() : '';
  const accessKey = /<(?:[A-Za-z_][\w.-]*:)?chNFe>(\d{44})<\/(?:[A-Za-z_][\w.-]*:)?chNFe>/i.exec(source)?.[1] || '';
  return commonRequestIsSafe(request)
    && request.endpoint === NFE_PROTOCOL_ENDPOINT
    && request.action === NFE_PROTOCOL_ACTION
    && request.contentType === expectedContentType(NFE_PROTOCOL_ACTION)
    && accessKey.startsWith('35')
    && openingTagCount(source, 'consSitNFe') === 1
    && openingTagCount(source, 'tpAmb') === 1
    && openingTagCount(source, 'xServ') === 1
    && openingTagCount(source, 'chNFe') === 1
    && openingTagCount(source, 'consReciNFe') === 0
    && openingTagCount(source, 'nRec') === 0
    && /<(?:[A-Za-z_][\w.-]*:)?consSitNFe\b[^>]*\bversao=["']4\.00["']/i.test(source)
    && /<(?:[A-Za-z_][\w.-]*:)?tpAmb>2<\/(?:[A-Za-z_][\w.-]*:)?tpAmb>/i.test(source)
    && /<(?:[A-Za-z_][\w.-]*:)?xServ>CONSULTAR<\/(?:[A-Za-z_][\w.-]*:)?xServ>/i.test(source);
}

function returnRequestIsSafe(request) {
  if (request?.endpoint === NFE_RECEIPT_ENDPOINT) return receiptRequestIsSafe(request);
  if (request?.endpoint === NFE_PROTOCOL_ENDPOINT) return protocolRequestIsSafe(request);
  return false;
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
      reject(new Error('O serviço de consulta devolveu um código HTTP inesperado.'));
      return;
    }
    if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
      response?.resume?.();
      reject(new Error('A resposta da consulta excede o limite permitido.'));
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
        fail(new Error('A resposta da consulta excede o limite permitido.'));
        return;
      }
      chunks.push(bytes);
    });
    response.on('error', () => fail(new Error('A resposta da consulta foi interrompida.')));
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
        'User-Agent': 'AvantaLab-Fiscal-Return/1.0',
      },
    }, (response) => {
      readResponse(response, request.maxResponseBytes)
        .then((value) => finish(resolve, value))
        .catch((error) => finish(reject, error));
    });
    socketRequest.setTimeout(request.timeoutMs, () => socketRequest.destroy(new Error('A consulta fiscal excedeu o tempo limite.')));
    socketRequest.on('error', () => finish(reject, new Error('A conexão mTLS de consulta fiscal não foi concluída.')));
    socketRequest.end(request.body, 'utf8');
  });
}

export function createNfeA1MtlsReturnTransport({
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
    id: 'avantalab-nfe-a1-mtls-return-v1',
    configured,
    async postSoap(request = {}) {
      if (!configured || !returnRequestIsSafe(request)) throw new Error('A consulta mTLS de retorno não atende ao contrato seguro.');
      const secret = await secretLoader.load(request.secureCertificateReference);
      const sourcePkcs12 = normalizePkcs12(secret?.pkcs12);
      let connectionPkcs12 = null;
      let passphrase = typeof secret?.passphrase === 'string' ? secret.passphrase : '';
      if (!sourcePkcs12 || sourcePkcs12.byteLength < 1 || sourcePkcs12.byteLength > MAX_PKCS12_BYTES || Buffer.byteLength(passphrase, 'utf8') < 1 || Buffer.byteLength(passphrase, 'utf8') > MAX_PASSPHRASE_BYTES) {
        sourcePkcs12?.fill(0);
        passphrase = '';
        throw new Error('O certificado ativo não pôde ser carregado para a consulta mTLS.');
      }
      try {
        connectionPkcs12 = await identityPreparer({ pkcs12: sourcePkcs12, passphrase, chainResolver });
        if (!Buffer.isBuffer(connectionPkcs12) || connectionPkcs12.byteLength < 1 || connectionPkcs12.byteLength > MAX_PKCS12_BYTES) {
          throw new Error('O certificado ativo não pôde ser preparado para a consulta mTLS.');
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
