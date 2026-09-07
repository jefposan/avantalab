export const FISCAL_NUMBERING_DOCUMENTS = ['nfe', 'nfce', 'nfse'];

const MAX_FISCAL_NUMBER = 999999999;

function documentIsSupported(value) {
  return FISCAL_NUMBERING_DOCUMENTS.includes(value);
}

function normalizeSeries(documentType, value) {
  const limit = documentType === 'nfse' ? 5 : 3;
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, limit);
  return digits || (documentType === 'nfse' ? '90001' : '1');
}

function positiveInteger(value, fallback = 1) {
  const number = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(number) && number >= 1 && number <= MAX_FISCAL_NUMBER ? number : fallback;
}

function eventId(prefix, at, index) {
  return `${prefix}-${String(at || 'local').replace(/\D/g, '').slice(-14) || 'local'}-${index + 1}`;
}

function activeSequence(ledger, documentType) {
  return ledger.sequences.find((sequence) => sequence.documentType === documentType && sequence.active)
    ?? ledger.sequences.find((sequence) => sequence.documentType === documentType);
}

function maximumOccupiedNumber(ledger, documentType, series) {
  const reserved = ledger.reservations
    .filter((entry) => entry.documentType === documentType && entry.series === series)
    .reduce((maximum, entry) => Math.max(maximum, entry.number), 0);
  const voided = ledger.voidRequests
    .filter((entry) => entry.documentType === documentType && entry.series === series && entry.status !== 'rejected')
    .reduce((maximum, entry) => Math.max(maximum, entry.endNumber), 0);
  return Math.max(reserved, voided);
}

function numberIsUnavailable(ledger, documentType, series, number) {
  return ledger.reservations.some((entry) => entry.documentType === documentType && entry.series === series && entry.number === number)
    || ledger.voidRequests.some((entry) => entry.documentType === documentType && entry.series === series && entry.status !== 'rejected' && number >= entry.startNumber && number <= entry.endNumber);
}

export function peekNextFiscalNumber(input, { documentType, series } = {}) {
  const ledger = normalizeFiscalNumberingLedger(input);
  if (!documentIsSupported(documentType)) return { ok: false, error: 'Tipo de documento fiscal inválido.', ledger };
  const normalizedSeries = series ? normalizeSeries(documentType, series) : '';
  const sequence = normalizedSeries
    ? ledger.sequences.find((entry) => entry.documentType === documentType && entry.series === normalizedSeries)
    : activeSequence(ledger, documentType);
  if (!sequence) return { ok: false, error: 'Configure a série antes de consultar a numeração.', ledger };
  let number = sequence.nextNumber;
  while (number <= MAX_FISCAL_NUMBER && numberIsUnavailable(ledger, documentType, sequence.series, number)) number += 1;
  if (number > MAX_FISCAL_NUMBER) return { ok: false, error: 'A série fiscal não possui numeração disponível.', ledger };
  return { ok: true, documentType, series: sequence.series, number, ledger };
}

export function createFiscalNumberingLedger(seriesByDocument = {}) {
  return {
    version: 1,
    sequences: FISCAL_NUMBERING_DOCUMENTS.map((documentType) => ({
      documentType,
      series: normalizeSeries(documentType, seriesByDocument[documentType]),
      nextNumber: 1,
      lastReservedNumber: 0,
      active: true,
      updatedAt: '',
    })),
    reservations: [],
    voidRequests: [],
    audit: [],
  };
}

export function normalizeFiscalNumberingLedger(input, seriesByDocument = {}) {
  const base = createFiscalNumberingLedger(seriesByDocument);
  if (!input || typeof input !== 'object') return base;

  const reservations = Array.isArray(input.reservations) ? input.reservations.flatMap((entry, index) => {
    if (!entry || !documentIsSupported(entry.documentType)) return [];
    const documentType = entry.documentType;
    const number = positiveInteger(entry.number, 0);
    if (!number) return [];
    return [{
      id: String(entry.id || `reservation-${index + 1}`),
      idempotencyKey: String(entry.idempotencyKey || entry.draftId || `legacy-${index + 1}`),
      draftId: String(entry.draftId || ''),
      originId: String(entry.originId || ''),
      documentType,
      series: normalizeSeries(documentType, entry.series),
      number,
      status: ['reserved', 'authorized', 'void_pending', 'voided'].includes(entry.status) ? entry.status : 'reserved',
      reservedAt: String(entry.reservedAt || ''),
      updatedAt: String(entry.updatedAt || entry.reservedAt || ''),
    }];
  }) : [];

  const voidRequests = Array.isArray(input.voidRequests) ? input.voidRequests.flatMap((entry, index) => {
    if (!entry || !documentIsSupported(entry.documentType)) return [];
    const documentType = entry.documentType;
    const startNumber = positiveInteger(entry.startNumber, 0);
    const endNumber = positiveInteger(entry.endNumber, 0);
    if (!startNumber || !endNumber || startNumber > endNumber) return [];
    return [{
      id: String(entry.id || `void-${index + 1}`),
      documentType,
      series: normalizeSeries(documentType, entry.series),
      startNumber,
      endNumber,
      reason: String(entry.reason || ''),
      status: ['pending', 'confirmed', 'rejected'].includes(entry.status) ? entry.status : 'pending',
      protocol: String(entry.protocol || ''),
      requestedAt: String(entry.requestedAt || ''),
      updatedAt: String(entry.updatedAt || entry.requestedAt || ''),
    }];
  }) : [];

  const sourceSequences = Array.isArray(input.sequences) ? input.sequences : [];
  const sequences = [];
  FISCAL_NUMBERING_DOCUMENTS.forEach((documentType) => {
    const candidates = sourceSequences.filter((entry) => entry?.documentType === documentType);
    candidates.forEach((entry, index) => {
      const series = normalizeSeries(documentType, entry.series);
      if (sequences.some((sequence) => sequence.documentType === documentType && sequence.series === series)) return;
      sequences.push({
        documentType,
        series,
        nextNumber: positiveInteger(entry.nextNumber, 1),
        lastReservedNumber: Math.max(0, Number.parseInt(String(entry.lastReservedNumber ?? 0), 10) || 0),
        active: entry.active === true || (index === 0 && !candidates.some((candidate) => candidate?.active === true)),
        updatedAt: String(entry.updatedAt || ''),
      });
    });
    if (!sequences.some((sequence) => sequence.documentType === documentType)) {
      sequences.push(base.sequences.find((sequence) => sequence.documentType === documentType));
    }
    const active = sequences.find((sequence) => sequence.documentType === documentType && sequence.active)
      ?? sequences.find((sequence) => sequence.documentType === documentType);
    sequences.forEach((sequence) => {
      if (sequence.documentType === documentType) sequence.active = sequence === active;
      const maximum = Math.max(sequence.lastReservedNumber, maximumOccupiedNumber({ reservations, voidRequests }, documentType, sequence.series));
      sequence.lastReservedNumber = maximum;
      sequence.nextNumber = Math.max(sequence.nextNumber, maximum + 1);
    });
  });

  const audit = Array.isArray(input.audit) ? input.audit.flatMap((entry, index) => entry && typeof entry === 'object' ? [{
    id: String(entry.id || `audit-${index + 1}`),
    at: String(entry.at || ''),
    actor: String(entry.actor || 'Sistema'),
    action: String(entry.action || 'registro'),
    description: String(entry.description || ''),
  }] : []) : [];

  return { version: 1, sequences, reservations, voidRequests, audit };
}

export function validateFiscalNumberingLedger(input) {
  const ledger = normalizeFiscalNumberingLedger(input);
  const errors = [];
  FISCAL_NUMBERING_DOCUMENTS.forEach((documentType) => {
    if (ledger.sequences.filter((sequence) => sequence.documentType === documentType && sequence.active).length !== 1) errors.push(`Defina uma única série ativa para ${documentType.toUpperCase()}.`);
  });
  const occupied = new Set();
  ledger.reservations.forEach((entry) => {
    const key = `${entry.documentType}:${entry.series}:${entry.number}`;
    if (occupied.has(key)) errors.push(`A numeração ${entry.series}/${entry.number} está duplicada.`);
    occupied.add(key);
  });
  const idempotency = new Set();
  ledger.reservations.forEach((entry) => {
    if (idempotency.has(entry.idempotencyKey)) errors.push('Existe uma chave de reserva fiscal duplicada.');
    idempotency.add(entry.idempotencyKey);
  });
  return { valid: errors.length === 0, errors };
}

export function configureFiscalSequence(input, { documentType, series, nextNumber, actor = 'Sistema', now = new Date().toISOString() }) {
  const ledger = normalizeFiscalNumberingLedger(input);
  if (!documentIsSupported(documentType)) return { ok: false, error: 'Tipo de documento fiscal inválido.', ledger };
  const normalizedSeries = normalizeSeries(documentType, series);
  const normalizedNextNumber = positiveInteger(nextNumber, 0);
  if (!normalizedNextNumber) return { ok: false, error: 'Informe um próximo número entre 1 e 999.999.999.', ledger };
  const occupied = maximumOccupiedNumber(ledger, documentType, normalizedSeries);
  if (normalizedNextNumber <= occupied) return { ok: false, error: `O próximo número deve ser maior que ${occupied.toLocaleString('pt-BR')}, já reservado ou inutilizado nessa série.`, ledger };

  ledger.sequences.forEach((sequence) => {
    if (sequence.documentType === documentType) sequence.active = false;
  });
  let target = ledger.sequences.find((sequence) => sequence.documentType === documentType && sequence.series === normalizedSeries);
  if (!target) {
    target = { documentType, series: normalizedSeries, nextNumber: normalizedNextNumber, lastReservedNumber: occupied, active: true, updatedAt: now };
    ledger.sequences.push(target);
  } else {
    target.nextNumber = normalizedNextNumber;
    target.lastReservedNumber = Math.max(target.lastReservedNumber, occupied);
    target.active = true;
    target.updatedAt = now;
  }
  ledger.audit.unshift({ id: eventId('audit', now, ledger.audit.length), at: now, actor, action: 'sequence_configured', description: `${documentType.toUpperCase()} configurada na série ${normalizedSeries}, próximo número ${normalizedNextNumber}.` });
  return { ok: true, ledger: normalizeFiscalNumberingLedger(ledger) };
}

export function reserveFiscalNumber(input, { documentType, series, draftId, originId = '', idempotencyKey, actor = 'Sistema', now = new Date().toISOString() }) {
  const ledger = normalizeFiscalNumberingLedger(input);
  if (!documentIsSupported(documentType)) return { ok: false, error: 'Tipo de documento fiscal inválido.', ledger };
  const key = String(idempotencyKey || draftId || '').trim();
  if (!key || !String(draftId || '').trim()) return { ok: false, error: 'A reserva exige o rascunho e uma chave idempotente.', ledger };
  const existingByKey = ledger.reservations.find((entry) => entry.idempotencyKey === key);
  if (existingByKey) {
    if (existingByKey.draftId !== String(draftId)) return { ok: false, error: 'A chave idempotente já pertence a outro documento.', ledger };
    return { ok: true, reused: true, reservation: existingByKey, ledger };
  }
  const existingByDraft = ledger.reservations.find((entry) => entry.draftId === String(draftId));
  if (existingByDraft) return { ok: true, reused: true, reservation: existingByDraft, ledger };

  const candidate = peekNextFiscalNumber(ledger, { documentType, series });
  if (!candidate.ok) return { ok: false, error: candidate.error, ledger };
  const sequence = ledger.sequences.find((entry) => entry.documentType === documentType && entry.series === candidate.series);
  const number = candidate.number;

  const reservation = {
    id: eventId('reservation', now, ledger.reservations.length),
    idempotencyKey: key,
    draftId: String(draftId),
    originId: String(originId),
    documentType,
    series: sequence.series,
    number,
    status: 'reserved',
    reservedAt: now,
    updatedAt: now,
  };
  ledger.reservations.unshift(reservation);
  sequence.lastReservedNumber = number;
  sequence.nextNumber = number + 1;
  sequence.updatedAt = now;
  ledger.audit.unshift({ id: eventId('audit', now, ledger.audit.length), at: now, actor, action: 'number_reserved', description: `${documentType.toUpperCase()} ${sequence.series}/${number} reservada para ${draftId}.` });
  return { ok: true, reused: false, reservation, ledger: normalizeFiscalNumberingLedger(ledger) };
}

export function requestFiscalNumberVoid(input, { documentType, series, startNumber, endNumber, reason, actor = 'Sistema', now = new Date().toISOString() }) {
  const ledger = normalizeFiscalNumberingLedger(input);
  if (!documentIsSupported(documentType)) return { ok: false, error: 'Tipo de documento fiscal inválido.', ledger };
  const normalizedSeries = normalizeSeries(documentType, series || activeSequence(ledger, documentType)?.series);
  const start = positiveInteger(startNumber, 0);
  const end = positiveInteger(endNumber, 0);
  const normalizedReason = String(reason || '').trim();
  if (!start || !end || start > end) return { ok: false, error: 'Informe um intervalo de numeração válido.', ledger };
  if (end - start + 1 > 10000) return { ok: false, error: 'O intervalo pode conter no máximo 10.000 números por solicitação.', ledger };
  if (normalizedReason.length < 10) return { ok: false, error: 'Informe uma justificativa com pelo menos 10 caracteres.', ledger };
  const overlapsAuthorized = ledger.reservations.some((entry) => entry.documentType === documentType && entry.series === normalizedSeries && entry.status === 'authorized' && entry.number >= start && entry.number <= end);
  if (overlapsAuthorized) return { ok: false, error: 'O intervalo contém uma nota autorizada e não pode ser inutilizado.', ledger };
  const overlapsRequest = ledger.voidRequests.some((entry) => entry.documentType === documentType && entry.series === normalizedSeries && entry.status !== 'rejected' && start <= entry.endNumber && end >= entry.startNumber);
  if (overlapsRequest) return { ok: false, error: 'O intervalo já possui uma solicitação de inutilização.', ledger };

  const request = { id: eventId('void', now, ledger.voidRequests.length), documentType, series: normalizedSeries, startNumber: start, endNumber: end, reason: normalizedReason, status: 'pending', protocol: '', requestedAt: now, updatedAt: now };
  ledger.voidRequests.unshift(request);
  ledger.reservations.forEach((entry) => {
    if (entry.documentType === documentType && entry.series === normalizedSeries && entry.status === 'reserved' && entry.number >= start && entry.number <= end) {
      entry.status = 'void_pending';
      entry.updatedAt = now;
    }
  });
  const sequence = ledger.sequences.find((entry) => entry.documentType === documentType && entry.series === normalizedSeries);
  if (sequence && sequence.nextNumber <= end) {
    sequence.nextNumber = end + 1;
    sequence.updatedAt = now;
  }
  ledger.audit.unshift({ id: eventId('audit', now, ledger.audit.length), at: now, actor, action: 'void_requested', description: `Inutilização ${documentType.toUpperCase()} série ${normalizedSeries}, números ${start} a ${end}, registrada para futuro envio.` });
  return { ok: true, request, ledger: normalizeFiscalNumberingLedger(ledger) };
}

export function confirmFiscalNumberVoid(input, { requestId, protocol, actor = 'Sistema', now = new Date().toISOString() }) {
  const ledger = normalizeFiscalNumberingLedger(input);
  const request = ledger.voidRequests.find((entry) => entry.id === String(requestId));
  if (!request) return { ok: false, error: 'Solicitação de inutilização não encontrada.', ledger };
  if (request.status === 'confirmed') return { ok: true, request, ledger };
  const normalizedProtocol = String(protocol || '').trim();
  if (!normalizedProtocol) return { ok: false, error: 'A confirmação exige o protocolo devolvido pelo órgão autorizador.', ledger };
  request.status = 'confirmed';
  request.protocol = normalizedProtocol;
  request.updatedAt = now;
  ledger.reservations.forEach((entry) => {
    if (entry.documentType === request.documentType && entry.series === request.series && entry.status === 'void_pending' && entry.number >= request.startNumber && entry.number <= request.endNumber) {
      entry.status = 'voided';
      entry.updatedAt = now;
    }
  });
  ledger.audit.unshift({ id: eventId('audit', now, ledger.audit.length), at: now, actor, action: 'void_confirmed', description: `Inutilização confirmada com o protocolo ${normalizedProtocol}.` });
  return { ok: true, request, ledger: normalizeFiscalNumberingLedger(ledger) };
}
