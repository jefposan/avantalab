export const NFE_STATUS_SERVICE_REFERENCE = '2026-08-31';
export const NFE_STATUS_SERVICE_ENDPOINT = 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx';
export const NFE_STATUS_SERVICE_ACTION = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4/nfeStatusServicoNF';
export const NFE_STATUS_SERVICE_CONTENT_TYPE = `application/soap+xml; charset=utf-8; action="${NFE_STATUS_SERVICE_ACTION}"`;
export const NFE_STATUS_SERVICE_RESPONSE_LIMIT = 256 * 1024;
export const NFE_STATUS_SERVICE_TIMEOUT_MS = 15_000;

import { isOfficialNfeEndpoint, resolveNationalNfeAuthority } from './nfe-national-authorities.mjs';

const SOAP_NAMESPACE = 'http://www.w3.org/2003/05/soap-envelope';
const NFE_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe';
const STATUS_WSDL_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4';
const HOMOLOGATION_ENVIRONMENT = '2';
const SAO_PAULO_CODE = '35';
const SERVICE_VERSION = '4.00';

function error(code, field, message) {
  return { code, field, message };
}

function baseDiagnostic() {
  return {
    ok: true,
    valid: false,
    mode: 'diagnostico-status-sefaz',
    environment: 'homologacao',
    authority: 'SEFAZ/SP',
    endpoint: NFE_STATUS_SERVICE_ENDPOINT,
    endpointValidated: false,
    requestBuilt: false,
    certificateActive: false,
    mutualTlsReady: false,
    transportConfigured: false,
    networkAttempted: false,
    responseReceived: false,
    serviceOperational: false,
    cStat: '',
    xMotivo: '',
    receivedAt: '',
    latencyMs: 0,
    sensitiveMaterialReturned: false,
    transmissionAttempted: false,
    errors: [],
    warnings: [],
  };
}

function xmlText(value) {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function tagValue(xml, localName) {
  const pattern = new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\s*>`, 'i');
  const match = pattern.exec(xml);
  return match ? xmlText(match[1].replace(/<[^>]+>/g, '')) : '';
}

function rootOpeningTag(xml, localName) {
  const pattern = new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\b([^>]*)>`, 'i');
  return pattern.exec(xml)?.[1] || '';
}

function attributeValue(attributes, name) {
  const match = new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i').exec(attributes);
  return match?.[2]?.trim() || '';
}

function resolveAuthority({ issuerUf = 'SP', environment = 'homologacao' } = {}) {
  return resolveNationalNfeAuthority({ uf: issuerUf, environment });
}

export function validateNfeStatusServiceEndpoint(endpoint, { issuerUf = 'SP', environment = 'homologacao' } = {}) {
  const authority = resolveAuthority({ issuerUf, environment });
  if (!authority || !isOfficialNfeEndpoint({ uf: authority.issuerUf, environment, service: 'status', endpoint })) {
    return { valid: false, error: 'O endereço de status não corresponde ao autorizador oficial da UF e do ambiente selecionados.' };
  }
  try {
    const url = new URL(endpoint);
    const valid = url.protocol === 'https:' && url.username === '' && url.password === '' && url.search === '' && url.hash === '';
    return { valid, error: valid ? '' : 'O endereço fiscal precisa usar HTTPS, sem credenciais, parâmetros ou fragmentos.' };
  } catch {
    return { valid: false, error: 'O endereço fiscal de homologação não é válido.' };
  }
}

export function buildNfeStatusServiceSoapRequest({ issuerUf = 'SP', environment = 'homologacao' } = {}) {
  const authority = resolveAuthority({ issuerUf, environment });
  if (!authority) throw new TypeError('Informe uma UF e ambiente NF-e reconhecidos.');
  const payload = `<consStatServ xmlns="${NFE_NAMESPACE}" versao="${SERVICE_VERSION}"><tpAmb>${authority.environmentCode}</tpAmb><cUF>${authority.issuerCode}</cUF><xServ>STATUS</xServ></consStatServ>`;
  const envelope = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:soap12="${SOAP_NAMESPACE}"><soap12:Body><nfeDadosMsg xmlns="${STATUS_WSDL_NAMESPACE}">${payload}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;
  return Object.freeze({
    endpoint: authority.endpoints.status,
    action: NFE_STATUS_SERVICE_ACTION,
    contentType: NFE_STATUS_SERVICE_CONTENT_TYPE,
    environment: authority.environment,
    stateCode: authority.issuerCode,
    issuerUf: authority.issuerUf,
    authority: authority.authority,
    version: SERVICE_VERSION,
    payload,
    envelope,
  });
}

export function parseNfeStatusServiceSoapResponse(value, { issuerUf = 'SP', environment = 'homologacao' } = {}) {
  const authority = resolveAuthority({ issuerUf, environment });
  const xml = typeof value === 'string' ? value.trim() : '';
  const result = {
    valid: false,
    serviceOperational: false,
    environment: '',
    stateCode: '',
    version: '',
    cStat: '',
    xMotivo: '',
    receivedAt: '',
    errors: [],
  };
  if (!xml) {
    result.errors.push(error('AV-NFE-STATUS-EMPTY', 'response', 'A SEFAZ não devolveu uma resposta XML.'));
    return result;
  }
  if (Buffer.byteLength(xml, 'utf8') > NFE_STATUS_SERVICE_RESPONSE_LIMIT) {
    result.errors.push(error('AV-NFE-STATUS-SIZE', 'response', 'A resposta excedeu o limite seguro de 256 KB.'));
    return result;
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    result.errors.push(error('AV-NFE-STATUS-DOCTYPE', 'response', 'A resposta contém declaração externa proibida.'));
    return result;
  }
  if (!/<(?:(?:[A-Za-z_][\w.-]*):)?Envelope\b/i.test(xml) || !/<(?:(?:[A-Za-z_][\w.-]*):)?Body\b/i.test(xml)) {
    result.errors.push(error('AV-NFE-STATUS-SOAP', 'response', 'A resposta não contém um envelope SOAP 1.2 reconhecível.'));
    return result;
  }
  const rootAttributes = rootOpeningTag(xml, 'retConsStatServ');
  if (!rootAttributes) {
    const faultReason = tagValue(xml, 'Text') || tagValue(xml, 'faultstring');
    result.errors.push(error('AV-NFE-STATUS-ROOT', 'response.retConsStatServ', faultReason || 'A resposta não contém retConsStatServ.'));
    return result;
  }
  result.version = attributeValue(rootAttributes, 'versao');
  result.environment = tagValue(xml, 'tpAmb');
  result.stateCode = tagValue(xml, 'cUF');
  result.cStat = tagValue(xml, 'cStat');
  result.xMotivo = tagValue(xml, 'xMotivo');
  result.receivedAt = tagValue(xml, 'dhRecbto');
  if (result.version !== SERVICE_VERSION) result.errors.push(error('AV-NFE-STATUS-VERSION', 'response.versao', 'A resposta não usa o leiaute 4.00 esperado.'));
  if (!authority) result.errors.push(error('AV-NFE-STATUS-AUTHORITY', 'issuer.uf', 'A UF informada não possui autorizador NF-e configurado.'));
  else {
    if (result.environment !== authority.environmentCode) result.errors.push(error('AV-NFE-STATUS-ENVIRONMENT', 'response.tpAmb', 'A resposta não pertence ao ambiente fiscal esperado.'));
    if (result.stateCode !== authority.issuerCode) result.errors.push(error('AV-NFE-STATUS-UF', 'response.cUF', 'A resposta não pertence ao autorizador da UF do emitente.'));
  }
  if (!/^\d{3}$/.test(result.cStat)) result.errors.push(error('AV-NFE-STATUS-CSTAT', 'response.cStat', 'A resposta não contém um código de situação válido.'));
  if (!result.xMotivo) result.errors.push(error('AV-NFE-STATUS-REASON', 'response.xMotivo', 'A resposta não descreve o motivo retornado pela SEFAZ.'));
  result.valid = result.errors.length === 0;
  result.serviceOperational = result.valid && result.cStat === '107';
  return result;
}

export function createDisabledNfeStatusServiceTransport() {
  return Object.freeze({
    id: 'transporte-sefaz-nao-configurado',
    configured: false,
    async postSoap() {
      throw new Error('O transporte externo da SEFAZ ainda não foi instalado neste protótipo.');
    },
  });
}

export function createNfeStatusServiceAdapter({
  certificateAdapter,
  transport = createDisabledNfeStatusServiceTransport(),
  endpoint = NFE_STATUS_SERVICE_ENDPOINT,
  now = () => Date.now(),
} = {}) {
  return Object.freeze({
    id: 'avantalab-nfe-status-service-v1',
    async checkAvailability({ secureReference, expectedDocument, expectedMode, issuerUf = 'SP', environment = 'homologacao' } = {}) {
      const diagnostic = baseDiagnostic();
      const authority = resolveAuthority({ issuerUf, environment });
      diagnostic.environment = environment;
      diagnostic.authority = authority?.authority || '';
      const resolvedEndpoint = endpoint === NFE_STATUS_SERVICE_ENDPOINT ? authority?.endpoints.status : endpoint;
      diagnostic.endpoint = resolvedEndpoint || '';
      if (environment !== 'homologacao') diagnostic.errors.push(error('AV-NFE-STATUS-ENVIRONMENT-LOCK', 'environment', 'A consulta nacional está liberada somente para homologação até a validação fiscal de produção.'));
      if (!authority) diagnostic.errors.push(error('AV-NFE-STATUS-AUTHORITY', 'issuer.uf', 'A UF do emitente não possui autorizador NF-e configurado.'));
      const endpointResult = validateNfeStatusServiceEndpoint(resolvedEndpoint, { issuerUf, environment });
      diagnostic.endpointValidated = endpointResult.valid;
      let request = null;
      try { request = buildNfeStatusServiceSoapRequest({ issuerUf, environment }); diagnostic.requestBuilt = true; }
      catch { diagnostic.errors.push(error('AV-NFE-STATUS-REQUEST', 'issuer.uf', 'Não foi possível preparar a consulta para a UF do emitente.')); }
      diagnostic.transportConfigured = Boolean(transport?.configured === true && typeof transport.postSoap === 'function');
      if (!endpointResult.valid) diagnostic.errors.push(error('AV-NFE-STATUS-ENDPOINT', 'transport.endpoint', endpointResult.error));

      let certificateDiagnostic;
      if (!certificateAdapter || typeof certificateAdapter.inspectBinding !== 'function') {
        diagnostic.errors.push(error('AV-NFE-STATUS-CERTIFICATE-ADAPTER', 'certificate', 'O adaptador de certificado digital não está disponível no servidor.'));
      } else {
        try {
          certificateDiagnostic = await certificateAdapter.inspectBinding({ secureReference, expectedDocument, expectedMode });
          diagnostic.certificateActive = certificateDiagnostic.valid === true;
          diagnostic.mutualTlsReady = certificateDiagnostic.readyForMutualTls === true;
          if (!diagnostic.certificateActive || !diagnostic.mutualTlsReady) {
            diagnostic.errors.push(error('AV-NFE-STATUS-CERTIFICATE', 'certificate', certificateDiagnostic.errors?.[0]?.message || 'Ative um certificado digital apto à conexão segura antes de consultar a SEFAZ.'));
          }
        } catch {
          diagnostic.errors.push(error('AV-NFE-STATUS-CERTIFICATE', 'certificate', 'O servidor não conseguiu verificar o certificado digital com segurança.'));
        }
      }
      if (!diagnostic.transportConfigured) {
        diagnostic.errors.push(error('AV-NFE-STATUS-TRANSPORT', 'transport', 'O transporte SOAP 1.2 com conexão segura ainda não foi instalado neste protótipo.'));
      }
      if (diagnostic.errors.length) {
        diagnostic.warnings = ['O envelope foi validado localmente; nenhuma conexão externa foi aberta e nenhum documento fiscal foi transmitido.'];
        return diagnostic;
      }

      const startedAt = now();
      diagnostic.networkAttempted = true;
      let response;
      try {
        response = await transport.postSoap({
          endpoint: resolvedEndpoint,
          action: request.action,
          contentType: request.contentType,
          body: request.envelope,
          secureCertificateReference: String(secureReference || ''),
          timeoutMs: NFE_STATUS_SERVICE_TIMEOUT_MS,
          maxResponseBytes: NFE_STATUS_SERVICE_RESPONSE_LIMIT,
          followRedirects: false,
          issuerUf: authority?.issuerUf,
          environment,
        });
      } catch {
        diagnostic.errors.push(error('AV-NFE-STATUS-NETWORK', 'transport', 'A conexão segura com o serviço de status não foi concluída.'));
        diagnostic.latencyMs = Math.max(0, now() - startedAt);
        return diagnostic;
      }
      diagnostic.latencyMs = Math.max(0, now() - startedAt);
      diagnostic.responseReceived = true;
      const parsed = parseNfeStatusServiceSoapResponse(response?.body, { issuerUf, environment });
      diagnostic.cStat = parsed.cStat;
      diagnostic.xMotivo = parsed.xMotivo;
      diagnostic.receivedAt = parsed.receivedAt;
      diagnostic.serviceOperational = parsed.serviceOperational;
      diagnostic.errors.push(...parsed.errors);
      if (parsed.valid && !parsed.serviceOperational) {
        diagnostic.errors.push(error('AV-NFE-STATUS-UNAVAILABLE', 'response.cStat', `A SEFAZ respondeu ${parsed.cStat}: ${parsed.xMotivo}.`));
      }
      diagnostic.valid = parsed.valid && parsed.serviceOperational && diagnostic.errors.length === 0;
      diagnostic.warnings = ['Esta consulta verifica somente a disponibilidade do autorizador; ela não envia, autoriza ou cancela NF-e.'];
      return diagnostic;
    },
  });
}
