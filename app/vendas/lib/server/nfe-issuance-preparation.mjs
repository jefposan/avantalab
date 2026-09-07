import { createHash } from 'node:crypto';
import { normalizeFiscalNumberingLedger, peekNextFiscalNumber } from '../fiscal-numbering.mjs';
import { buildUnsignedNfeSpXml, prototypeDraftToNfeSpXmlInput } from '../nfe-sp-xml.mjs';
import { validateNfeXmlAgainstXsd } from './nfe-xsd-validator.mjs';

export const NFE_ISSUANCE_PREPARATION_REFERENCE = '2026-09-05';

function diagnosticError(code, field, message) {
  return { code, field, message };
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function preparationFingerprint(attemptKey, draftId, issuerDocument) {
  return createHash('sha256').update(`${attemptKey}:${draftId}:${issuerDocument}`, 'utf8').digest('hex').toUpperCase();
}

export function deriveNfeNumericCode(attemptKey, draftId, issuerDocument) {
  const digest = preparationFingerprint(attemptKey, draftId, issuerDocument);
  return String(Number.parseInt(digest.slice(0, 12), 16) % 100000000).padStart(8, '0');
}

function baseResult() {
  return {
    ok: true,
    valid: false,
    mode: 'preparacao-emissao-sem-reserva',
    environment: 'homologacao',
    reference: NFE_ISSUANCE_PREPARATION_REFERENCE,
    preparationId: '',
    documentType: 'nfe',
    draftId: '',
    originId: '',
    series: '',
    candidateNumber: 0,
    technicalNumericCode: '',
    numberPreviouslyReserved: false,
    numberReservationAttempted: false,
    numberingMutated: false,
    accessKeyPreview: '',
    preXmlBuilt: false,
    schemaValidationExecuted: false,
    schemaValid: false,
    documentReadyForSecureConnector: false,
    certificateInspected: false,
    statusServiceChecked: false,
    signatureAttempted: false,
    authorizationAttempted: false,
    transmissionAttempted: false,
    readyForExternalHomologation: false,
    errors: [],
    warnings: [],
    steps: [],
  };
}

export async function buildNfeIssuancePreparation({ draft, client, config, numberingLedger, attemptKey, issuedAt } = {}) {
  const result = baseResult();
  const normalizedDraft = draft && typeof draft === 'object' ? draft : {};
  const normalizedClient = client && typeof client === 'object' ? client : {};
  const normalizedConfig = config && typeof config === 'object' ? config : {};
  const normalizedAttemptKey = text(attemptKey);
  const draftId = text(normalizedDraft.id);
  const issuerDocument = digits(normalizedDraft.issuer?.document);
  result.draftId = draftId;
  result.originId = text(normalizedDraft.originId);

  if (!/^[A-Za-z0-9][A-Za-z0-9:_-]{7,119}$/.test(normalizedAttemptKey)) result.errors.push(diagnosticError('AV-NFE-ISSUE-IDEMPOTENCY', 'attemptKey', 'A preparação exige uma chave idempotente estável, sem dados secretos.'));
  if (!draftId) result.errors.push(diagnosticError('AV-NFE-ISSUE-DRAFT', 'draft.id', 'O rascunho fiscal não foi identificado.'));
  if (normalizedDraft.documentType !== 'nfe') result.errors.push(diagnosticError('AV-NFE-ISSUE-DOCUMENT', 'draft.documentType', 'Esta primeira preparação aceita somente NF-e modelo 55.'));
  if (normalizedDraft.status === 'Cancelado') result.errors.push(diagnosticError('AV-NFE-ISSUE-CANCELLED', 'draft.status', 'Um rascunho cancelado não pode iniciar uma tentativa de emissão.'));
  if (text(normalizedDraft.environment) && !/homologa/i.test(text(normalizedDraft.environment))) result.errors.push(diagnosticError('AV-NFE-ISSUE-ENVIRONMENT', 'draft.environment', 'A preparação está travada no ambiente de homologação.'));
  if (text(normalizedDraft.issuer?.uf).toUpperCase() !== 'SP') result.errors.push(diagnosticError('AV-NFE-ISSUE-UF', 'draft.issuer.uf', 'O primeiro conector direto aceita somente emitente de São Paulo.'));
  if (issuerDocument.length !== 14) result.errors.push(diagnosticError('AV-NFE-ISSUE-ISSUER', 'draft.issuer.document', 'O CNPJ do emitente não está completo.'));

  const ledger = normalizeFiscalNumberingLedger(numberingLedger, { nfe: normalizedDraft.issuer?.series || normalizedDraft.series });
  const existingReservation = ledger.reservations.find((entry) => entry.draftId === draftId);
  if (existingReservation && ['void_pending', 'voided'].includes(existingReservation.status)) {
    result.errors.push(diagnosticError('AV-NFE-ISSUE-NUMBER-VOID', 'numbering.reservation', 'A numeração vinculada a este rascunho está em inutilização e não pode ser usada.'));
  }
  if (existingReservation?.status === 'authorized') {
    result.errors.push(diagnosticError('AV-NFE-ISSUE-AUTHORIZED', 'numbering.reservation', 'Este rascunho já possui uma numeração autorizada e não pode iniciar outra emissão.'));
  }
  const candidate = existingReservation
    ? { ok: true, series: existingReservation.series, number: existingReservation.number }
    : peekNextFiscalNumber(ledger, { documentType: 'nfe' });
  if (!candidate.ok || !candidate.series || !candidate.number) {
    result.errors.push(diagnosticError('AV-NFE-ISSUE-NUMBERING', 'numbering.sequence', candidate.error || 'Não foi possível identificar o próximo número fiscal.'));
  } else {
    result.series = candidate.series;
    result.candidateNumber = candidate.number;
    result.numberPreviouslyReserved = Boolean(existingReservation);
  }

  if (result.errors.length) {
    result.steps = [
      { id: 'preflight', label: 'Conferir rascunho', state: 'blocked' },
      { id: 'numbering', label: 'Identificar próximo número', state: result.candidateNumber ? 'ready' : 'blocked' },
      { id: 'xml', label: 'Validar documento fiscal', state: 'waiting' },
      { id: 'connector', label: 'Conector seguro', state: 'blocked' },
    ];
    return result;
  }

  const fingerprint = preparationFingerprint(normalizedAttemptKey, draftId, issuerDocument);
  result.preparationId = `prep-${fingerprint.slice(0, 20).toLocaleLowerCase('en-US')}`;
  const numericCode = deriveNfeNumericCode(normalizedAttemptKey, draftId, issuerDocument);
  result.technicalNumericCode = numericCode;
  const draftWithCandidate = {
    ...normalizedDraft,
    series: result.series,
    issuer: { ...(normalizedDraft.issuer || {}), series: result.series },
  };
  const input = prototypeDraftToNfeSpXmlInput({
    draft: draftWithCandidate,
    client: normalizedClient,
    config: {
      ...normalizedConfig,
      testDocumentNumber: String(result.candidateNumber),
      testNumericCode: numericCode,
    },
    issuedAt,
  });
  const generated = buildUnsignedNfeSpXml(input);
  result.preXmlBuilt = generated.valid && Boolean(generated.xml);
  result.accessKeyPreview = generated.accessKey || '';
  result.errors.push(...generated.errors);
  result.warnings.push(...generated.warnings.filter((warning) => !warning.startsWith('Este gerador puro')));
  if (result.preXmlBuilt) {
    const schema = await validateNfeXmlAgainstXsd(generated.xml);
    result.schemaValidationExecuted = schema.executed;
    result.schemaValid = schema.valid;
    result.errors.push(...schema.errors);
  }
  result.documentReadyForSecureConnector = result.preXmlBuilt && result.schemaValidationExecuted && result.schemaValid && result.errors.length === 0;
  result.valid = result.documentReadyForSecureConnector;
  result.steps = [
    { id: 'preflight', label: 'Conferir rascunho', state: result.errors.some((entry) => entry.field.startsWith('draft')) ? 'blocked' : 'ready' },
    { id: 'numbering', label: existingReservation ? 'Reutilizar número protegido' : 'Identificar próximo número', state: 'ready' },
    { id: 'xml', label: 'Validar documento fiscal', state: result.documentReadyForSecureConnector ? 'ready' : 'blocked' },
    { id: 'certificate', label: 'Confirmar certificado digital', state: 'waiting' },
    { id: 'reserve', label: existingReservation ? 'Número já reservado' : 'Reservar número na confirmação', state: existingReservation ? 'ready' : 'waiting' },
    { id: 'authorization', label: 'Enviar para autorização', state: 'blocked' },
  ];
  result.warnings.unshift(existingReservation
    ? 'A preparação reutilizou a reserva existente; nenhum novo número foi consumido.'
    : 'O número exibido é apenas o próximo candidato. A sequência não foi alterada e nenhuma reserva foi criada.');
  result.warnings.push('Certificado, assinatura, disponibilidade da SEFAZ, autorização e protocolo permanecem bloqueados nesta etapa.');
  return result;
}
