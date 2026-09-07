import { validateNfeCancellationXmlAgainstXsd } from './nfe-cancellation-xsd-validator.mjs';

export const NFE_CANCELLATION_SERVICE_REFERENCE = '2026-09-08';
export const NFE_CANCELLATION_ENDPOINT = 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx';
export const NFE_CANCELLATION_ACTION = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento';
export const NFE_CANCELLATION_CONTENT_TYPE = `application/soap+xml; charset=utf-8; action="${NFE_CANCELLATION_ACTION}"`;
export const NFE_CANCELLATION_TIMEOUT_MS = 30_000;
export const NFE_CANCELLATION_RESPONSE_LIMIT = 512 * 1024;

const SOAP_NAMESPACE = 'http://www.w3.org/2003/05/soap-envelope';
const NFE_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe';
const WSDL_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4';
const issue = (code, field, message) => ({ code, field, message });
const digits = (value) => String(value ?? '').replace(/\D/g, '');
const text = (value) => String(value ?? '').trim();
const tag = (xml, name) => text(xml).match(new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${name}\\b[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z_][\\w.-]*:)?${name}>`, 'i'))?.[1]?.replace(/<[^>]+>/g, '').trim() || '';
const block = (xml, name) => text(xml).match(new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${name}\\b[^>]*>[\\s\\S]*?<\\/(?:[A-Za-z_][\\w.-]*:)?${name}>`, 'i'))?.[0] || '';
const escapeXml = (value) => text(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function baseDiagnostic() {
  return { ok: true, valid: false, mode: 'cancelamento-nfe-homologacao', environment: 'homologacao', authority: 'SEFAZ/SP', endpoint: NFE_CANCELLATION_ENDPOINT, eventBuilt: false, eventSigned: false, certificateActive: false, transportConfigured: false, networkAttempted: false, transmissionAttempted: false, responseReceived: false, batchProcessed: false, canceled: false, batchStatus: '', batchReason: '', eventStatus: '', eventReason: '', protocolNumber: '', registeredAt: '', accessKey: '', eventId: '', processedEventReturned: false, sensitiveMaterialReturned: false, errors: [], warnings: [] };
}

export function validateNfeCancellationEndpoint(endpoint) {
  if (endpoint !== NFE_CANCELLATION_ENDPOINT) return { valid: false, error: 'Somente o endereço oficial de homologação do NFeRecepcaoEvento 4.00 da SEFAZ-SP é permitido.' };
  try {
    const url = new URL(endpoint);
    const valid = url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash;
    return { valid, error: valid ? '' : 'O endereço do evento precisa usar HTTPS, sem credenciais, parâmetros ou fragmentos.' };
  } catch { return { valid: false, error: 'O endereço do evento não é válido.' }; }
}

export function buildNfeCancellationEvent({ accessKey, authorizationProtocol, justification, eventSequence = 1, eventTime = new Date().toISOString() } = {}) {
  const key = digits(accessKey);
  const protocol = digits(authorizationProtocol);
  const reason = text(justification).replace(/\s+/g, ' ');
  const sequence = Number(eventSequence);
  const issuerDocument = key.slice(6, 20);
  const errors = [];
  if (!/^35\d{42}$/.test(key)) errors.push(issue('AV-NFE-CANCEL-EVENT-KEY', 'accessKey', 'A chave deve identificar uma NF-e modelo 55 emitida em São Paulo.'));
  if (!/^\d{15,17}$/.test(protocol)) errors.push(issue('AV-NFE-CANCEL-EVENT-PROTOCOL', 'authorizationProtocol', 'O protocolo de autorização original é inválido.'));
  if (reason.length < 15 || reason.length > 255) errors.push(issue('AV-NFE-CANCEL-EVENT-JUSTIFICATION', 'justification', 'A justificativa deve ter entre 15 e 255 caracteres.'));
  if (!Number.isSafeInteger(sequence) || sequence !== 1) errors.push(issue('AV-NFE-CANCEL-EVENT-SEQUENCE', 'eventSequence', 'O cancelamento da NF-e deve usar a sequência 1.'));
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(text(eventTime)) || !Number.isFinite(Date.parse(eventTime))) errors.push(issue('AV-NFE-CANCEL-EVENT-TIME', 'eventTime', 'A data do evento precisa conter data, hora e fuso válidos.'));
  const eventId = errors.length ? '' : `ID110111${key}${String(sequence).padStart(2, '0')}`;
  const eventXml = errors.length ? '' : `<evento xmlns="${NFE_NAMESPACE}" versao="1.00"><infEvento Id="${eventId}"><cOrgao>35</cOrgao><tpAmb>2</tpAmb><CNPJ>${issuerDocument}</CNPJ><chNFe>${key}</chNFe><dhEvento>${escapeXml(eventTime)}</dhEvento><tpEvento>110111</tpEvento><nSeqEvento>${sequence}</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Cancelamento</descEvento><nProt>${protocol}</nProt><xJust>${escapeXml(reason)}</xJust></detEvento></infEvento></evento>`;
  return { valid: errors.length === 0, errors, eventXml, eventId, accessKey: key, issuerDocument, eventSequence: sequence };
}

export function buildNfeCancellationSoapRequest({ signedEventXml, lotId } = {}) {
  const source = text(signedEventXml);
  const normalizedLotId = digits(lotId).slice(0, 15);
  const event = block(source, 'evento');
  const info = block(event, 'infEvento');
  const accessKey = tag(info, 'chNFe');
  const eventId = info.match(/\bId=["']([^"']+)["']/i)?.[1] || '';
  const errors = [];
  if (!source || Buffer.byteLength(source, 'utf8') > 256 * 1024 || /<!DOCTYPE|<!ENTITY|<!\[CDATA\[|<!--/i.test(source)) errors.push(issue('AV-NFE-CANCEL-REQUEST-XML', 'signedEventXml', 'O evento assinado é inválido.'));
  if (!/^\d{1,15}$/.test(normalizedLotId) || BigInt(normalizedLotId || '0') < 1n) errors.push(issue('AV-NFE-CANCEL-REQUEST-LOT', 'lotId', 'O lote deve possuir de 1 a 15 dígitos e ser maior que zero.'));
  if (!/^35\d{42}$/.test(accessKey) || eventId !== `ID110111${accessKey}01`) errors.push(issue('AV-NFE-CANCEL-REQUEST-ID', 'infEvento.Id', 'A identificação do evento assinado é inválida.'));
  if (tag(info, 'cOrgao') !== '35' || tag(info, 'tpAmb') !== '2' || tag(info, 'tpEvento') !== '110111' || tag(info, 'nSeqEvento') !== '1') errors.push(issue('AV-NFE-CANCEL-REQUEST-SCOPE', 'infEvento', 'O evento não pertence ao cancelamento de NF-e em homologação paulista.'));
  if (!/<(?:[A-Za-z_][\w.-]*:)?Signature\b/i.test(event)) errors.push(issue('AV-NFE-CANCEL-REQUEST-SIGNATURE', 'Signature', 'O evento precisa estar assinado antes da transmissão.'));
  if (errors.length) return { valid: false, errors, envelope: '', endpoint: NFE_CANCELLATION_ENDPOINT, action: NFE_CANCELLATION_ACTION, contentType: NFE_CANCELLATION_CONTENT_TYPE, accessKey, eventId };
  const payload = `<envEvento xmlns="${NFE_NAMESPACE}" versao="1.00"><idLote>${normalizedLotId}</idLote>${event}</envEvento>`;
  const envelope = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:soap12="${SOAP_NAMESPACE}"><soap12:Body><nfeDadosMsg xmlns="${WSDL_NAMESPACE}">${payload}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;
  return { valid: true, errors: [], envelope, payload, endpoint: NFE_CANCELLATION_ENDPOINT, action: NFE_CANCELLATION_ACTION, contentType: NFE_CANCELLATION_CONTENT_TYPE, accessKey, eventId, lotId: normalizedLotId };
}

export function parseNfeCancellationSoapResponse(value, expected = {}) {
  const xml = text(value);
  const result = { valid: false, batchProcessed: false, canceled: false, environment: '', stateCode: '', batchStatus: '', batchReason: '', eventStatus: '', eventReason: '', protocolNumber: '', registeredAt: '', accessKey: '', eventType: '', eventSequence: '', eventId: '', retEnvXml: '', retEventXml: '', errors: [] };
  if (!xml || Buffer.byteLength(xml, 'utf8') > NFE_CANCELLATION_RESPONSE_LIMIT || /<!DOCTYPE|<!ENTITY|<!\[CDATA\[|<!--/i.test(xml)) { result.errors.push(issue('AV-NFE-CANCEL-RESPONSE-XML', 'response', 'A resposta do evento é vazia ou inválida.')); return result; }
  if (!/<(?:[A-Za-z_][\w.-]*:)?Envelope\b/i.test(xml) || !/<(?:[A-Za-z_][\w.-]*:)?Body\b/i.test(xml)) { result.errors.push(issue('AV-NFE-CANCEL-RESPONSE-SOAP', 'response', 'A resposta não contém um envelope SOAP reconhecível.')); return result; }
  const retEnv = block(xml, 'retEnvEvento');
  const retEvent = block(retEnv, 'retEvento');
  const info = block(retEvent, 'infEvento');
  if (!retEnv || !retEvent || !info) { result.errors.push(issue('AV-NFE-CANCEL-RESPONSE-ROOT', 'response.retEvento', tag(xml, 'Text') || 'A resposta não contém o resultado individual do evento.')); return result; }
  Object.assign(result, { environment: tag(retEnv, 'tpAmb'), stateCode: tag(retEnv, 'cOrgao'), batchStatus: tag(retEnv, 'cStat'), batchReason: tag(retEnv, 'xMotivo'), eventStatus: tag(info, 'cStat'), eventReason: tag(info, 'xMotivo'), protocolNumber: tag(info, 'nProt'), registeredAt: tag(info, 'dhRegEvento'), accessKey: tag(info, 'chNFe'), eventType: tag(info, 'tpEvento'), eventSequence: tag(info, 'nSeqEvento'), eventId: info.match(/\bId=["']([^"']+)["']/i)?.[1] || '', retEnvXml: retEnv, retEventXml: retEvent });
  result.batchProcessed = result.batchStatus === '128';
  result.canceled = result.batchProcessed && ['135', '155'].includes(result.eventStatus);
  if (result.environment !== '2' || result.stateCode !== '35') result.errors.push(issue('AV-NFE-CANCEL-RESPONSE-SCOPE', 'response', 'A resposta não pertence à homologação da SEFAZ-SP.'));
  if (!result.batchProcessed || !result.batchReason) result.errors.push(issue('AV-NFE-CANCEL-RESPONSE-BATCH', 'response.cStat', 'O lote de evento não foi confirmado como processado.'));
  if (!result.canceled || !/^\d{15,17}$/.test(result.protocolNumber) || !Number.isFinite(Date.parse(result.registeredAt))) result.errors.push(issue('AV-NFE-CANCEL-RESPONSE-EVENT', 'response.retEvento', 'O autorizador não confirmou o cancelamento com protocolo válido.'));
  if (result.eventType !== '110111' || result.eventSequence !== '1') result.errors.push(issue('AV-NFE-CANCEL-RESPONSE-TYPE', 'response.tpEvento', 'O retorno não corresponde ao evento de cancelamento solicitado.'));
  if (text(expected.accessKey) && result.accessKey !== text(expected.accessKey)) result.errors.push(issue('AV-NFE-CANCEL-RESPONSE-KEY', 'response.chNFe', 'A resposta pertence a outra NF-e.'));
  if (result.eventId && result.eventId !== `ID${result.protocolNumber}`) result.errors.push(issue('AV-NFE-CANCEL-RESPONSE-ID', 'response.Id', 'A identificação do retorno não corresponde ao protocolo do evento.'));
  result.valid = result.errors.length === 0;
  if (!result.valid) result.canceled = false;
  return result;
}

export function createDisabledNfeCancellationTransport() {
  return Object.freeze({ id: 'transporte-cancelamento-nao-configurado', configured: false, async postSoap() { throw new Error('O transporte externo de cancelamento ainda não foi instalado.'); } });
}

export function createNfeCancellationAdapter({ certificateAdapter, signingProvider, transport = createDisabledNfeCancellationTransport(), endpoint = NFE_CANCELLATION_ENDPOINT, clock = () => new Date().toISOString(), lotIdGenerator = () => String(Date.now()).slice(-15) } = {}) {
  const configured = Boolean(certificateAdapter?.inspectBinding && signingProvider?.configured === true && signingProvider?.signEventXml && transport?.configured === true && transport?.postSoap && validateNfeCancellationEndpoint(endpoint).valid);
  async function run(options = {}, includeProcessedEvent = false) {
    const diagnostic = baseDiagnostic();
    diagnostic.transportConfigured = transport?.configured === true;
    const built = buildNfeCancellationEvent({ ...options, eventTime: options.eventTime || clock() });
    diagnostic.eventBuilt = built.valid;
    diagnostic.accessKey = built.accessKey;
    diagnostic.eventId = built.eventId;
    diagnostic.errors.push(...built.errors);
    if (!validateNfeCancellationEndpoint(endpoint).valid) diagnostic.errors.push(issue('AV-NFE-CANCEL-ENDPOINT', 'endpoint', 'O endereço do autorizador não passou pela validação interna.'));
    try {
      const certificate = await certificateAdapter?.inspectBinding?.({ secureReference: options.secureReference, expectedDocument: options.expectedDocument, expectedMode: options.expectedMode });
      diagnostic.certificateActive = certificate?.valid === true && certificate?.readyForMutualTls === true && certificate?.readyForXmlSignature === true;
      if (!diagnostic.certificateActive) diagnostic.errors.push(issue('AV-NFE-CANCEL-CERTIFICATE', 'certificate', certificate?.errors?.[0]?.message || 'O certificado digital não está pronto para o evento.'));
    } catch { diagnostic.errors.push(issue('AV-NFE-CANCEL-CERTIFICATE', 'certificate', 'O certificado digital não pôde ser confirmado.')); }
    if (!configured) diagnostic.errors.push(issue('AV-NFE-CANCEL-CONNECTOR', 'transport', 'O conector de cancelamento não está integralmente configurado.'));
    if (diagnostic.errors.length) { diagnostic.warnings = ['Nenhuma conexão foi aberta e nenhum evento foi transmitido.']; return diagnostic; }
    let signed;
    try {
      signed = await signingProvider.signEventXml({ reference: options.secureReference, unsignedEventXml: built.eventXml, expectedAccessKey: built.accessKey, expectedIssuerDocument: options.expectedDocument });
      diagnostic.eventSigned = signed?.signatureVerified === true && signed?.signedXsdValid === true && signed?.accessKey === built.accessKey;
      if (!diagnostic.eventSigned) diagnostic.errors.push(issue('AV-NFE-CANCEL-SIGNATURE-XSD', 'signature', 'O evento assinado não possui validação criptográfica e XSD confirmadas.'));
    } catch { diagnostic.errors.push(issue('AV-NFE-CANCEL-SIGNATURE', 'signature', 'O evento não pôde ser assinado pelo certificado ativo.')); return diagnostic; }
    if (diagnostic.errors.length) return diagnostic;
    const request = buildNfeCancellationSoapRequest({ signedEventXml: signed.signedEventXml, lotId: lotIdGenerator() });
    diagnostic.errors.push(...request.errors);
    if (!request.valid) return diagnostic;
    diagnostic.networkAttempted = true;
    diagnostic.transmissionAttempted = true;
    let response;
    try { response = await transport.postSoap({ endpoint, action: request.action, contentType: request.contentType, body: request.envelope, secureCertificateReference: String(options.secureReference || ''), timeoutMs: NFE_CANCELLATION_TIMEOUT_MS, maxResponseBytes: NFE_CANCELLATION_RESPONSE_LIMIT, followRedirects: false }); }
    catch { diagnostic.errors.push(issue('AV-NFE-CANCEL-NETWORK', 'transport', 'A conexão segura do cancelamento não foi concluída.')); return diagnostic; }
    diagnostic.responseReceived = true;
    const parsed = parseNfeCancellationSoapResponse(response?.body, { accessKey: built.accessKey, eventId: built.eventId });
    Object.assign(diagnostic, { valid: parsed.valid, batchProcessed: parsed.batchProcessed, canceled: parsed.canceled, batchStatus: parsed.batchStatus, batchReason: parsed.batchReason, eventStatus: parsed.eventStatus, eventReason: parsed.eventReason, protocolNumber: parsed.protocolNumber, registeredAt: parsed.registeredAt });
    diagnostic.errors.push(...parsed.errors);
    if (parsed.valid) {
      const responseSchema = await validateNfeCancellationXmlAgainstXsd(parsed.retEnvXml, 'retEnvEvento');
      if (!responseSchema.valid) diagnostic.errors.push(issue('AV-NFE-CANCEL-RESPONSE-XSD', 'response', 'O retorno foi recusado pelo XSD oficial do evento.'));
      const processed = `<procEventoNFe xmlns="${NFE_NAMESPACE}" versao="1.00">${signed.signedEventXml}${parsed.retEventXml}</procEventoNFe>`;
      const processedSchema = responseSchema.valid ? await validateNfeCancellationXmlAgainstXsd(processed, 'procEventoNFe') : { valid: false };
      if (!processedSchema.valid) diagnostic.errors.push(issue('AV-NFE-CANCEL-PROCESSED-XSD', 'processedEvent', 'O evento processado foi recusado pelo XSD oficial.'));
      diagnostic.valid = diagnostic.errors.length === 0;
      diagnostic.canceled = diagnostic.valid;
      if (includeProcessedEvent && diagnostic.valid) diagnostic.processedEventXml = processed;
    }
    diagnostic.warnings = parsed.valid ? ['O cancelamento só se torna definitivo após a guarda imutável do evento e a atualização atômica da emissão.'] : [];
    return diagnostic;
  }
  return Object.freeze({ id: 'avantalab-nfe-cancellation-v1', configured, cancel(options = {}) { return run(options, false); }, cancelProtected(options = {}) { return run(options, true); } });
}
