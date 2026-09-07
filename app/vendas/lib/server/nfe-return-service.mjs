export const NFE_RETURN_REFERENCE = '2026-09-05';
export const NFE_RECEIPT_ENDPOINT = 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx';
export const NFE_RECEIPT_ACTION = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4/nfeRetAutorizacaoLote';
export const NFE_PROTOCOL_ENDPOINT = 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx';
export const NFE_PROTOCOL_ACTION = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF';
export const NFE_RETURN_TIMEOUT_MS = 30_000;
export const NFE_RETURN_RESPONSE_LIMIT = 512 * 1024;

const SOAP_NAMESPACE = 'http://www.w3.org/2003/05/soap-envelope';
const NFE_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe';
const RECEIPT_WSDL_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4';
const PROTOCOL_WSDL_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4';

function error(code, field, message) {
  return { code, field, message };
}

function xmlText(value) {
  return String(value || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').trim();
}

function tagBlock(xml, localName) {
  return new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\b[^>]*>[\\s\\S]*?<\\/(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\s*>`, 'i').exec(xml)?.[0] || '';
}

function tagValue(xml, localName) {
  const match = new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\s*>`, 'i').exec(xml);
  return match ? xmlText(match[1].replace(/<[^>]+>/g, '')) : '';
}

function rootAttributes(xml, localName) {
  return new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\b([^>]*)>`, 'i').exec(xml)?.[1] || '';
}

function attributeValue(attributes, name) {
  return new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i').exec(attributes)?.[2]?.trim() || '';
}

function validateResponseEnvelope(value, rootName) {
  const xml = typeof value === 'string' ? value.trim() : '';
  const errors = [];
  if (!xml) errors.push(error('AV-NFE-RETURN-EMPTY', 'response', 'A SEFAZ não devolveu resposta à consulta.'));
  if (xml && Buffer.byteLength(xml, 'utf8') > NFE_RETURN_RESPONSE_LIMIT) errors.push(error('AV-NFE-RETURN-SIZE', 'response', 'A resposta excedeu o limite seguro de 512 KB.'));
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) errors.push(error('AV-NFE-RETURN-DOCTYPE', 'response', 'A resposta contém declaração externa proibida.'));
  if (xml && (!/<(?:(?:[A-Za-z_][\w.-]*):)?Envelope\b/i.test(xml) || !/<(?:(?:[A-Za-z_][\w.-]*):)?Body\b/i.test(xml))) errors.push(error('AV-NFE-RETURN-SOAP', 'response', 'A resposta não contém um envelope SOAP reconhecível.'));
  const root = errors.length ? '' : tagBlock(xml, rootName);
  if (!root && !errors.length) errors.push(error('AV-NFE-RETURN-ROOT', `response.${rootName}`, tagValue(xml, 'Text') || `A resposta não contém ${rootName}.`));
  return { xml, root, errors };
}

function protocolFields(scope) {
  const protocolXml = tagBlock(scope, 'protNFe');
  const info = tagBlock(protocolXml, 'infProt');
  return {
    protocolXml,
    protocolEnvironment: tagValue(info, 'tpAmb'),
    accessKey: tagValue(info, 'chNFe'),
    protocolReceivedAt: tagValue(info, 'dhRecbto'),
    protocolNumber: tagValue(info, 'nProt'),
    protocolDigest: tagValue(info, 'digVal'),
    protocolStatus: tagValue(info, 'cStat'),
    protocolReason: tagValue(info, 'xMotivo'),
  };
}

function validateOfficialEndpoint(endpoint, expected) {
  if (endpoint !== expected) return { valid: false, error: 'Somente o endereço oficial de homologação da SEFAZ-SP é permitido.' };
  try {
    const url = new URL(endpoint);
    const valid = url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash;
    return { valid, error: valid ? '' : 'O endereço deve usar HTTPS, sem credenciais, parâmetros ou fragmentos.' };
  } catch {
    return { valid: false, error: 'O endereço de consulta não é válido.' };
  }
}

function soapRequest({ endpoint, action, wsdlNamespace, payload }) {
  return {
    valid: true,
    errors: [],
    endpoint,
    action,
    contentType: `application/soap+xml; charset=utf-8; action="${action}"`,
    environment: 'homologacao',
    payload,
    envelope: `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:soap12="${SOAP_NAMESPACE}"><soap12:Body><nfeDadosMsg xmlns="${wsdlNamespace}">${payload}</nfeDadosMsg></soap12:Body></soap12:Envelope>`,
  };
}

export function validateNfeReceiptEndpoint(endpoint) {
  return validateOfficialEndpoint(endpoint, NFE_RECEIPT_ENDPOINT);
}

export function validateNfeProtocolEndpoint(endpoint) {
  return validateOfficialEndpoint(endpoint, NFE_PROTOCOL_ENDPOINT);
}

export function buildNfeReceiptQuerySoapRequest({ receiptNumber } = {}) {
  const normalized = String(receiptNumber || '').replace(/\D/g, '').slice(0, 15);
  if (!/^\d{15}$/.test(normalized)) return { valid: false, errors: [error('AV-NFE-RECEIPT-NUMBER', 'receiptNumber', 'O recibo deve conter 15 dígitos.')], endpoint: NFE_RECEIPT_ENDPOINT, action: NFE_RECEIPT_ACTION, envelope: '', receiptNumber: normalized };
  return { ...soapRequest({ endpoint: NFE_RECEIPT_ENDPOINT, action: NFE_RECEIPT_ACTION, wsdlNamespace: RECEIPT_WSDL_NAMESPACE, payload: `<consReciNFe xmlns="${NFE_NAMESPACE}" versao="4.00"><tpAmb>2</tpAmb><nRec>${normalized}</nRec></consReciNFe>` }), receiptNumber: normalized };
}

export function buildNfeProtocolQuerySoapRequest({ accessKey } = {}) {
  const normalized = String(accessKey || '').replace(/\D/g, '').slice(0, 44);
  if (!/^\d{44}$/.test(normalized)) return { valid: false, errors: [error('AV-NFE-PROTOCOL-KEY', 'accessKey', 'A chave de acesso deve conter 44 dígitos.')], endpoint: NFE_PROTOCOL_ENDPOINT, action: NFE_PROTOCOL_ACTION, envelope: '', accessKey: normalized };
  return { ...soapRequest({ endpoint: NFE_PROTOCOL_ENDPOINT, action: NFE_PROTOCOL_ACTION, wsdlNamespace: PROTOCOL_WSDL_NAMESPACE, payload: `<consSitNFe xmlns="${NFE_NAMESPACE}" versao="4.00"><tpAmb>2</tpAmb><xServ>CONSULTAR</xServ><chNFe>${normalized}</chNFe></consSitNFe>` }), accessKey: normalized };
}

export function parseNfeReceiptQuerySoapResponse(value) {
  const envelope = validateResponseEnvelope(value, 'retConsReciNFe');
  const result = { valid: false, environment: '', stateCode: '', version: '', status: '', reason: '', receiptNumber: '', averageTime: '', receivedAt: '', processed: false, pending: false, authorized: false, needsProtocolConsultation: false, ...protocolFields(''), errors: [...envelope.errors] };
  if (!envelope.root) return result;
  result.version = attributeValue(rootAttributes(envelope.root, 'retConsReciNFe'), 'versao');
  result.environment = tagValue(envelope.root, 'tpAmb');
  result.stateCode = tagValue(envelope.root, 'cUF');
  result.status = tagValue(envelope.root, 'cStat');
  result.reason = tagValue(envelope.root, 'xMotivo');
  result.receiptNumber = tagValue(envelope.root, 'nRec');
  result.averageTime = tagValue(envelope.root, 'tMed');
  result.receivedAt = tagValue(envelope.root, 'dhRecbto');
  Object.assign(result, protocolFields(envelope.root));
  if (result.version !== '4.00') result.errors.push(error('AV-NFE-RECEIPT-VERSION', 'response.versao', 'A resposta não usa o leiaute 4.00.'));
  if (result.environment !== '2') result.errors.push(error('AV-NFE-RECEIPT-ENVIRONMENT', 'response.tpAmb', 'A resposta não pertence ao ambiente de homologação.'));
  if (result.stateCode !== '35') result.errors.push(error('AV-NFE-RECEIPT-UF', 'response.cUF', 'A resposta não pertence ao autorizador de São Paulo.'));
  if (!/^\d{3}$/.test(result.status) || !result.reason) result.errors.push(error('AV-NFE-RECEIPT-STATUS', 'response.cStat', 'A consulta não contém situação e motivo válidos.'));
  result.processed = result.status === '104';
  result.pending = result.status === '105';
  result.authorized = result.processed && result.protocolStatus === '100' && result.protocolEnvironment === '2' && /^\d{44}$/.test(result.accessKey) && Boolean(result.protocolNumber);
  result.needsProtocolConsultation = result.processed && ['204', '539'].includes(result.protocolStatus);
  if (result.processed && !result.protocolStatus) result.errors.push(error('AV-NFE-RECEIPT-PROTOCOL', 'response.protNFe', 'O lote foi processado sem resultado individual da NF-e.'));
  result.valid = result.errors.length === 0 && (result.pending || result.authorized || result.needsProtocolConsultation || Boolean(result.protocolStatus));
  return result;
}

export function parseNfeProtocolQuerySoapResponse(value) {
  const envelope = validateResponseEnvelope(value, 'retConsSitNFe');
  const result = { valid: false, environment: '', stateCode: '', version: '', status: '', reason: '', receivedAt: '', requestedAccessKey: '', found: false, authorized: false, canceled: false, ...protocolFields(''), errors: [...envelope.errors] };
  if (!envelope.root) return result;
  result.version = attributeValue(rootAttributes(envelope.root, 'retConsSitNFe'), 'versao');
  result.environment = tagValue(envelope.root, 'tpAmb');
  result.stateCode = tagValue(envelope.root, 'cUF');
  result.status = tagValue(envelope.root, 'cStat');
  result.reason = tagValue(envelope.root, 'xMotivo');
  result.receivedAt = tagValue(envelope.root, 'dhRecbto');
  result.requestedAccessKey = tagValue(envelope.root, 'chNFe');
  Object.assign(result, protocolFields(envelope.root));
  if (result.version !== '4.00') result.errors.push(error('AV-NFE-PROTOCOL-VERSION', 'response.versao', 'A resposta não usa o leiaute 4.00.'));
  if (result.environment !== '2') result.errors.push(error('AV-NFE-PROTOCOL-ENVIRONMENT', 'response.tpAmb', 'A resposta não pertence ao ambiente de homologação.'));
  if (result.stateCode !== '35') result.errors.push(error('AV-NFE-PROTOCOL-UF', 'response.cUF', 'A resposta não pertence ao autorizador de São Paulo.'));
  if (!/^\d{3}$/.test(result.status) || !result.reason) result.errors.push(error('AV-NFE-PROTOCOL-STATUS', 'response.cStat', 'A consulta não contém situação e motivo válidos.'));
  result.authorized = result.protocolStatus === '100' && result.protocolEnvironment === '2' && /^\d{44}$/.test(result.accessKey) && Boolean(result.protocolNumber);
  result.canceled = ['101', '135', '151', '155'].includes(result.protocolStatus || result.status);
  result.found = result.authorized || result.canceled || Boolean(result.protocolStatus);
  if (result.requestedAccessKey && result.accessKey && result.requestedAccessKey !== result.accessKey) result.errors.push(error('AV-NFE-PROTOCOL-KEY-MISMATCH', 'response.chNFe', 'A resposta contém protocolo de outra chave de acesso.'));
  result.valid = result.errors.length === 0;
  return result;
}

export function createDisabledNfeReturnTransport() {
  return Object.freeze({ id: 'transporte-retorno-nfe-nao-configurado', configured: false, async postSoap() { throw new Error('O transporte externo de consulta ainda não foi instalado.'); } });
}

export function createNfeReturnAdapter({ certificateAdapter, transport = createDisabledNfeReturnTransport(), receiptEndpoint = NFE_RECEIPT_ENDPOINT, protocolEndpoint = NFE_PROTOCOL_ENDPOINT } = {}) {
  async function run({ kind, request, endpoint, secureReference, expectedDocument, expectedMode, expectedAccessKey }) {
    const diagnostic = { ok: true, valid: false, kind, environment: 'homologacao', authority: 'SEFAZ/SP', endpoint, endpointValidated: false, requestBuilt: request.valid, certificateActive: false, transportConfigured: Boolean(transport?.configured === true && typeof transport.postSoap === 'function'), networkAttempted: false, responseReceived: false, authorized: false, sensitiveMaterialReturned: false, errors: [...request.errors], warnings: [] };
    const endpointResult = kind === 'receipt' ? validateNfeReceiptEndpoint(endpoint) : validateNfeProtocolEndpoint(endpoint);
    diagnostic.endpointValidated = endpointResult.valid;
    if (!endpointResult.valid) diagnostic.errors.push(error('AV-NFE-RETURN-ENDPOINT', 'transport.endpoint', endpointResult.error));
    try {
      const certificate = certificateAdapter && typeof certificateAdapter.inspectBinding === 'function' ? await certificateAdapter.inspectBinding({ secureReference, expectedDocument, expectedMode }) : null;
      diagnostic.certificateActive = certificate?.valid === true && certificate?.readyForMutualTls === true;
      if (!diagnostic.certificateActive) diagnostic.errors.push(error('AV-NFE-RETURN-CERTIFICATE', 'certificate', certificate?.errors?.[0]?.message || 'O certificado não está pronto para a conexão segura.'));
    } catch { diagnostic.errors.push(error('AV-NFE-RETURN-CERTIFICATE', 'certificate', 'O certificado não pôde ser confirmado com segurança.')); }
    if (!diagnostic.transportConfigured) diagnostic.errors.push(error('AV-NFE-RETURN-TRANSPORT', 'transport', 'O transporte SOAP 1.2 com mTLS ainda não está instalado.'));
    if (diagnostic.errors.length) { diagnostic.warnings = ['Nenhuma consulta externa foi aberta.']; return diagnostic; }
    diagnostic.networkAttempted = true;
    let response;
    try {
      response = await transport.postSoap({ endpoint, action: request.action, contentType: request.contentType, body: request.envelope, secureCertificateReference: String(secureReference || ''), timeoutMs: NFE_RETURN_TIMEOUT_MS, maxResponseBytes: NFE_RETURN_RESPONSE_LIMIT, followRedirects: false });
    } catch { diagnostic.errors.push(error('AV-NFE-RETURN-NETWORK', 'transport', 'A conexão segura de consulta não foi concluída.')); return diagnostic; }
    diagnostic.responseReceived = true;
    const parsed = kind === 'receipt' ? parseNfeReceiptQuerySoapResponse(response?.body) : parseNfeProtocolQuerySoapResponse(response?.body);
    Object.assign(diagnostic, parsed);
    diagnostic.errors = [...(parsed.errors || [])];
    if (expectedAccessKey && parsed.accessKey && parsed.accessKey !== String(expectedAccessKey)) {
      diagnostic.valid = false;
      diagnostic.authorized = false;
      diagnostic.errors.push(error('AV-NFE-RETURN-EXPECTED-KEY', 'response.chNFe', 'A resposta não corresponde à chave esperada.'));
    }
    return diagnostic;
  }
  function publicResult(promise) {
    return Promise.resolve(promise).then((value) => {
      const result = { ...value };
      delete result.protocolXml;
      result.sensitiveMaterialReturned = false;
      return result;
    });
  }
  return Object.freeze({
    id: 'avantalab-nfe-return-v1',
    queryReceipt(options = {}) {
      const request = buildNfeReceiptQuerySoapRequest(options);
      return publicResult(run({ ...options, kind: 'receipt', request, endpoint: receiptEndpoint }));
    },
    queryReceiptProtected(options = {}) {
      const request = buildNfeReceiptQuerySoapRequest(options);
      return run({ ...options, kind: 'receipt', request, endpoint: receiptEndpoint });
    },
    queryProtocol(options = {}) {
      const request = buildNfeProtocolQuerySoapRequest(options);
      return publicResult(run({ ...options, kind: 'protocol', request, endpoint: protocolEndpoint }));
    },
    queryProtocolProtected(options = {}) {
      const request = buildNfeProtocolQuerySoapRequest(options);
      return run({ ...options, kind: 'protocol', request, endpoint: protocolEndpoint });
    },
  });
}
