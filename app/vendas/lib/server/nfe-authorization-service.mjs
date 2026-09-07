export const NFE_AUTHORIZATION_REFERENCE = '2026-09-02';
export const NFE_AUTHORIZATION_ENDPOINT = 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx';
export const NFE_AUTHORIZATION_ACTION = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote';
export const NFE_AUTHORIZATION_CONTENT_TYPE = `application/soap+xml; charset=utf-8; action="${NFE_AUTHORIZATION_ACTION}"`;
export const NFE_AUTHORIZATION_TIMEOUT_MS = 30_000;
export const NFE_AUTHORIZATION_RESPONSE_LIMIT = 512 * 1024;

const SOAP_NAMESPACE = 'http://www.w3.org/2003/05/soap-envelope';
const NFE_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe';
const AUTHORIZATION_WSDL_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4';
const MAX_SIGNED_XML_BYTES = 1024 * 1024;

function error(code, field, message) {
  return { code, field, message };
}

function xmlText(value) {
  return String(value || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').trim();
}

function tagValue(xml, localName) {
  const match = new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\s*>`, 'i').exec(xml);
  return match ? xmlText(match[1].replace(/<[^>]+>/g, '')) : '';
}

function tagBlock(xml, localName) {
  return new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\b[^>]*>[\\s\\S]*?<\\/(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\s*>`, 'i').exec(xml)?.[0] || '';
}

function rootAttributes(xml, localName) {
  return new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\b([^>]*)>`, 'i').exec(xml)?.[1] || '';
}

function attributeValue(attributes, name) {
  return new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i').exec(attributes)?.[2]?.trim() || '';
}

function baseDiagnostic() {
  return {
    ok: true,
    valid: false,
    mode: 'autorizacao-nfe-homologacao',
    environment: 'homologacao',
    authority: 'SEFAZ/SP',
    endpoint: NFE_AUTHORIZATION_ENDPOINT,
    endpointValidated: false,
    requestBuilt: false,
    signedXmlValidated: false,
    certificateActive: false,
    statusServiceOperational: false,
    transportConfigured: false,
    networkAttempted: false,
    transmissionAttempted: false,
    responseReceived: false,
    batchProcessed: false,
    authorized: false,
    needsReceiptConsultation: false,
    needsProtocolConsultation: false,
    batchStatus: '',
    batchReason: '',
    receiptNumber: '',
    protocolStatus: '',
    protocolReason: '',
    protocolNumber: '',
    accessKey: '',
    receivedAt: '',
    signedXmlReturned: false,
    sensitiveMaterialReturned: false,
    errors: [],
    warnings: [],
  };
}

export function validateNfeAuthorizationEndpoint(endpoint) {
  if (endpoint !== NFE_AUTHORIZATION_ENDPOINT) return { valid: false, error: 'Somente o endereço oficial de homologação do NFeAutorizacao 4.00 da SEFAZ-SP é permitido.' };
  try {
    const url = new URL(endpoint);
    const valid = url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash;
    return { valid, error: valid ? '' : 'O endereço de autorização precisa usar HTTPS, sem credenciais, parâmetros ou fragmentos.' };
  } catch {
    return { valid: false, error: 'O endereço de autorização não é válido.' };
  }
}

export function validateSignedNfeForAuthorization(value) {
  const xml = typeof value === 'string' ? value.trim() : '';
  const errors = [];
  if (!xml) errors.push(error('AV-NFE-AUTH-XML-EMPTY', 'signedXml', 'O XML assinado não foi fornecido pelo serviço interno de assinatura.'));
  if (xml && Buffer.byteLength(xml, 'utf8') > MAX_SIGNED_XML_BYTES) errors.push(error('AV-NFE-AUTH-XML-SIZE', 'signedXml', 'O XML assinado excede o limite de 1 MB desta etapa.'));
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) errors.push(error('AV-NFE-AUTH-XML-DOCTYPE', 'signedXml', 'O XML contém declaração externa proibida.'));
  const nfeBlock = tagBlock(xml, 'NFe');
  const infAttributes = rootAttributes(nfeBlock, 'infNFe');
  const accessKey = attributeValue(infAttributes, 'Id').replace(/^NFe/i, '');
  if (!nfeBlock) errors.push(error('AV-NFE-AUTH-XML-NFE', 'signedXml.NFe', 'O conteúdo não possui uma NF-e reconhecível.'));
  if (!/<(?:[A-Za-z_][\w.-]*:)?Signature\b/i.test(nfeBlock)) errors.push(error('AV-NFE-AUTH-XML-SIGNATURE', 'signedXml.Signature', 'A NF-e precisa estar assinada antes da autorização.'));
  if (!/^\d{44}$/.test(accessKey)) errors.push(error('AV-NFE-AUTH-XML-KEY', 'signedXml.infNFe.Id', 'A identificação da NF-e não contém uma chave de acesso válida.'));
  if (tagValue(nfeBlock, 'tpAmb') !== '2') errors.push(error('AV-NFE-AUTH-XML-ENVIRONMENT', 'signedXml.tpAmb', 'Somente NF-e do ambiente de homologação pode entrar neste conector.'));
  if (tagValue(nfeBlock, 'mod') !== '55') errors.push(error('AV-NFE-AUTH-XML-MODEL', 'signedXml.mod', 'O primeiro conector aceita somente NF-e modelo 55.'));
  return { valid: errors.length === 0, xml, nfeBlock, accessKey, errors };
}

export function buildNfeAuthorizationSoapRequest({ signedXml, lotId, synchronous = true } = {}) {
  const validation = validateSignedNfeForAuthorization(signedXml);
  const normalizedLotId = String(lotId || '').replace(/\D/g, '').slice(0, 15);
  const errors = [...validation.errors];
  if (!normalizedLotId || BigInt(normalizedLotId) < 1n) errors.push(error('AV-NFE-AUTH-LOT', 'lotId', 'Informe um identificador numérico de lote entre 1 e 15 dígitos.'));
  if (errors.length) return { valid: false, errors, endpoint: NFE_AUTHORIZATION_ENDPOINT, action: NFE_AUTHORIZATION_ACTION, contentType: NFE_AUTHORIZATION_CONTENT_TYPE, envelope: '', accessKey: validation.accessKey, lotId: normalizedLotId };
  const payload = `<enviNFe xmlns="${NFE_NAMESPACE}" versao="4.00"><idLote>${normalizedLotId}</idLote><indSinc>${synchronous ? '1' : '0'}</indSinc>${validation.nfeBlock}</enviNFe>`;
  const envelope = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:soap12="${SOAP_NAMESPACE}"><soap12:Body><nfeDadosMsg xmlns="${AUTHORIZATION_WSDL_NAMESPACE}">${payload}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;
  return { valid: true, errors: [], endpoint: NFE_AUTHORIZATION_ENDPOINT, action: NFE_AUTHORIZATION_ACTION, contentType: NFE_AUTHORIZATION_CONTENT_TYPE, environment: 'homologacao', payload, envelope, accessKey: validation.accessKey, lotId: normalizedLotId };
}

export function parseNfeAuthorizationSoapResponse(value) {
  const xml = typeof value === 'string' ? value.trim() : '';
  const result = { valid: false, environment: '', stateCode: '', version: '', batchStatus: '', batchReason: '', receiptNumber: '', receivedAt: '', protocolStatus: '', protocolReason: '', protocolNumber: '', protocolXml: '', accessKey: '', batchProcessed: false, authorized: false, needsReceiptConsultation: false, needsProtocolConsultation: false, errors: [] };
  if (!xml) { result.errors.push(error('AV-NFE-AUTH-RESPONSE-EMPTY', 'response', 'A SEFAZ não devolveu resposta à autorização.')); return result; }
  if (Buffer.byteLength(xml, 'utf8') > NFE_AUTHORIZATION_RESPONSE_LIMIT) { result.errors.push(error('AV-NFE-AUTH-RESPONSE-SIZE', 'response', 'A resposta de autorização excedeu o limite seguro de 512 KB.')); return result; }
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) { result.errors.push(error('AV-NFE-AUTH-RESPONSE-DOCTYPE', 'response', 'A resposta contém declaração externa proibida.')); return result; }
  if (!/<(?:(?:[A-Za-z_][\w.-]*):)?Envelope\b/i.test(xml) || !/<(?:(?:[A-Za-z_][\w.-]*):)?Body\b/i.test(xml)) { result.errors.push(error('AV-NFE-AUTH-RESPONSE-SOAP', 'response', 'A resposta não contém um envelope SOAP 1.2 reconhecível.')); return result; }
  const retBlock = tagBlock(xml, 'retEnviNFe');
  if (!retBlock) { result.errors.push(error('AV-NFE-AUTH-RESPONSE-ROOT', 'response.retEnviNFe', tagValue(xml, 'Text') || 'A resposta não contém retEnviNFe.')); return result; }
  result.version = attributeValue(rootAttributes(retBlock, 'retEnviNFe'), 'versao');
  result.environment = tagValue(retBlock, 'tpAmb');
  result.stateCode = tagValue(retBlock, 'cUF');
  result.batchStatus = tagValue(retBlock, 'cStat');
  result.batchReason = tagValue(retBlock, 'xMotivo');
  result.receiptNumber = tagValue(retBlock, 'nRec');
  result.receivedAt = tagValue(retBlock, 'dhRecbto');
  const protocolBlock = tagBlock(retBlock, 'infProt');
  result.protocolXml = tagBlock(retBlock, 'protNFe');
  result.protocolStatus = tagValue(protocolBlock, 'cStat');
  result.protocolReason = tagValue(protocolBlock, 'xMotivo');
  result.protocolNumber = tagValue(protocolBlock, 'nProt');
  result.accessKey = tagValue(protocolBlock, 'chNFe');
  if (result.version !== '4.00') result.errors.push(error('AV-NFE-AUTH-RESPONSE-VERSION', 'response.versao', 'A resposta não usa o leiaute 4.00.'));
  if (result.environment !== '2') result.errors.push(error('AV-NFE-AUTH-RESPONSE-ENVIRONMENT', 'response.tpAmb', 'A resposta não pertence ao ambiente de homologação.'));
  if (result.stateCode !== '35') result.errors.push(error('AV-NFE-AUTH-RESPONSE-UF', 'response.cUF', 'A resposta não pertence ao autorizador de São Paulo.'));
  if (!/^\d{3}$/.test(result.batchStatus) || !result.batchReason) result.errors.push(error('AV-NFE-AUTH-RESPONSE-STATUS', 'response.cStat', 'A resposta do lote não contém situação e motivo válidos.'));
  result.batchProcessed = result.batchStatus === '104';
  result.needsReceiptConsultation = result.batchStatus === '103' && /^\d{15}$/.test(result.receiptNumber);
  result.authorized = result.batchProcessed && result.protocolStatus === '100' && /^\d{44}$/.test(result.accessKey) && Boolean(result.protocolNumber);
  result.needsProtocolConsultation = result.batchProcessed && ['204', '539'].includes(result.protocolStatus);
  if (result.batchProcessed && !result.protocolStatus) result.errors.push(error('AV-NFE-AUTH-RESPONSE-PROTOCOL', 'response.protNFe', 'O lote foi processado sem resultado individual da NF-e.'));
  result.valid = result.errors.length === 0 && (result.authorized || result.needsReceiptConsultation || Boolean(result.protocolStatus));
  return result;
}

export function createDisabledNfeAuthorizationTransport() {
  return Object.freeze({ id: 'transporte-autorizacao-nao-configurado', configured: false, async postSoap() { throw new Error('O transporte externo de autorização ainda não foi instalado.'); } });
}

export function createNfeAuthorizationAdapter({ certificateAdapter, statusAdapter, transport = createDisabledNfeAuthorizationTransport(), endpoint = NFE_AUTHORIZATION_ENDPOINT } = {}) {
  async function run(options = {}, includeProtocol = false) {
    const { signedXml, lotId, secureReference, expectedDocument, expectedMode, expectedAccessKey } = options;
    const diagnostic = baseDiagnostic();
    diagnostic.endpoint = endpoint;
    const endpointResult = validateNfeAuthorizationEndpoint(endpoint);
    diagnostic.endpointValidated = endpointResult.valid;
    const request = buildNfeAuthorizationSoapRequest({ signedXml, lotId, synchronous: true });
    diagnostic.requestBuilt = request.valid;
    diagnostic.signedXmlValidated = request.valid;
    diagnostic.accessKey = request.accessKey || '';
    diagnostic.transportConfigured = Boolean(transport?.configured === true && typeof transport.postSoap === 'function');
    if (!endpointResult.valid) diagnostic.errors.push(error('AV-NFE-AUTH-ENDPOINT', 'transport.endpoint', endpointResult.error));
    diagnostic.errors.push(...request.errors);
    if (expectedAccessKey && request.accessKey !== String(expectedAccessKey)) diagnostic.errors.push(error('AV-NFE-AUTH-KEY-MISMATCH', 'signedXml.infNFe.Id', 'A chave do XML assinado não corresponde à tentativa preparada.'));
    try {
      const certificate = certificateAdapter && typeof certificateAdapter.inspectBinding === 'function' ? await certificateAdapter.inspectBinding({ secureReference, expectedDocument, expectedMode }) : null;
      diagnostic.certificateActive = certificate?.valid === true && certificate?.readyForMutualTls === true && certificate?.readyForXmlSignature === true;
      if (!diagnostic.certificateActive) diagnostic.errors.push(error('AV-NFE-AUTH-CERTIFICATE', 'certificate', certificate?.errors?.[0]?.message || 'O certificado digital não está pronto para assinatura e conexão segura.'));
    } catch { diagnostic.errors.push(error('AV-NFE-AUTH-CERTIFICATE', 'certificate', 'O certificado digital não pôde ser confirmado com segurança.')); }
    try {
      const status = statusAdapter && typeof statusAdapter.checkAvailability === 'function' ? await statusAdapter.checkAvailability({ secureReference, expectedDocument, expectedMode }) : null;
      diagnostic.statusServiceOperational = status?.valid === true && status?.serviceOperational === true;
      if (!diagnostic.statusServiceOperational) diagnostic.errors.push(error('AV-NFE-AUTH-STATUS', 'statusService', status?.errors?.[0]?.message || 'O serviço de autorização não teve disponibilidade confirmada.'));
    } catch { diagnostic.errors.push(error('AV-NFE-AUTH-STATUS', 'statusService', 'A disponibilidade da SEFAZ não pôde ser confirmada.')); }
    if (!diagnostic.transportConfigured) diagnostic.errors.push(error('AV-NFE-AUTH-TRANSPORT', 'transport', 'O transporte SOAP 1.2 com mTLS ainda não está instalado.'));
    if (diagnostic.errors.length) { diagnostic.warnings = ['Nenhuma conexão de autorização foi aberta e nenhuma NF-e foi transmitida.']; return diagnostic; }
    diagnostic.networkAttempted = true;
    diagnostic.transmissionAttempted = true;
    let response;
    try {
      response = await transport.postSoap({ endpoint, action: request.action, contentType: request.contentType, body: request.envelope, secureCertificateReference: String(secureReference || ''), timeoutMs: NFE_AUTHORIZATION_TIMEOUT_MS, maxResponseBytes: NFE_AUTHORIZATION_RESPONSE_LIMIT, followRedirects: false });
    } catch { diagnostic.errors.push(error('AV-NFE-AUTH-NETWORK', 'transport', 'A conexão segura de autorização não foi concluída.')); return diagnostic; }
    diagnostic.responseReceived = true;
    const parsed = parseNfeAuthorizationSoapResponse(response?.body);
    Object.assign(diagnostic, { valid: parsed.valid, batchProcessed: parsed.batchProcessed, authorized: parsed.authorized, needsReceiptConsultation: parsed.needsReceiptConsultation, needsProtocolConsultation: parsed.needsProtocolConsultation, batchStatus: parsed.batchStatus, batchReason: parsed.batchReason, receiptNumber: parsed.receiptNumber, protocolStatus: parsed.protocolStatus, protocolReason: parsed.protocolReason, protocolNumber: parsed.protocolNumber, accessKey: parsed.accessKey || request.accessKey, receivedAt: parsed.receivedAt });
    if (includeProtocol) diagnostic.protocolXml = parsed.protocolXml;
    diagnostic.errors.push(...parsed.errors);
    if (parsed.accessKey && parsed.accessKey !== request.accessKey) { diagnostic.authorized = false; diagnostic.valid = false; diagnostic.errors.push(error('AV-NFE-AUTH-RESPONSE-KEY', 'response.chNFe', 'A resposta pertence a outra chave de acesso.')); }
    diagnostic.warnings = parsed.authorized ? ['A autorização só poderá ser persistida após gravar procNFe, protocolo e auditoria imutável.'] : [];
    return diagnostic;
  }
  return Object.freeze({
    id: 'avantalab-nfe-authorization-v1',
    authorize(options = {}) { return run(options, false); },
    authorizeProtected(options = {}) { return run(options, true); },
  });
}
