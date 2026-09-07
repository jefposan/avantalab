export const FISCAL_DOCUMENTS_MESSAGE_TYPE = 'AVANTALAB_VENDAS_FISCAL_DOCUMENTS_V1';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOCUMENTS = new Set(['nfe', 'nfce', 'nfse']);
const ORIGINS = new Set(['pedido', 'ordem_servico']);
const DRAFT_STATES = new Set(['pendencia_cadastral', 'pronto']);
const EMISSION_STATES = new Set(['draft', 'prepared', 'number_reserved', 'signed', 'submitted', 'processing', 'authorized', 'artifacts_stored', 'danfe_ready', 'rejected', 'failed', 'canceled']);
const text = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

function item(value) {
  const source = object(value);
  return Object.freeze({
    productId: text(source.productId, 80),
    itemType: source.itemType === 'servico' ? 'servico' : 'produto',
    sku: text(source.sku, 80),
    name: text(source.name, 180),
    description: text(source.description, 500),
    unit: text(source.unit, 20),
    quantity: Math.max(0, number(source.quantity)),
    unitPrice: Math.max(0, number(source.unitPrice)),
    unitDiscount: Math.max(0, number(source.unitDiscount)),
    fiscal: Object.freeze(object(source.fiscal)),
    fiscalReady: source.fiscalReady === true,
  });
}

function document(value) {
  const source = object(value);
  const draftId = text(source.draftId, 80);
  const originId = text(source.originId, 80);
  const emissionId = text(source.emissionId, 80);
  const documentType = text(source.documentType, 20);
  const originType = text(source.originType, 40);
  const draftStatus = text(source.draftStatus, 40);
  if (!UUID.test(draftId) || !UUID.test(originId) || (emissionId && !UUID.test(emissionId))
    || !DOCUMENTS.has(documentType) || !ORIGINS.has(originType) || !DRAFT_STATES.has(draftStatus)) return null;
  const rawEmission = object(source.emission);
  const state = text(rawEmission.state, 40);
  const emission = emissionId && rawEmission.id === emissionId && EMISSION_STATES.has(state) ? Object.freeze({
    id: emissionId,
    environment: rawEmission.environment === 'homologacao' ? 'homologacao' : '',
    state,
    version: Math.max(1, Number.parseInt(String(rawEmission.version), 10) || 1),
    series: text(rawEmission.series, 3),
    number: Math.max(0, Number.parseInt(String(rawEmission.number), 10) || 0),
    accessKey: /^\d{44}$/.test(text(rawEmission.accessKey, 44)) ? text(rawEmission.accessKey, 44) : '',
    updatedAt: text(rawEmission.updatedAt, 40),
  }) : null;
  const issuer = object(source.issuer);
  const totals = object(source.totals);
  return Object.freeze({
    draftId,
    emissionId: emission?.id || '',
    originId,
    originNumber: text(source.originNumber, 40),
    originType,
    documentType,
    draftStatus,
    client: text(source.client, 180),
    clientDocument: text(source.clientDocument, 20),
    clientCity: text(source.clientCity, 120),
    total: Math.max(0, number(source.total)),
    paymentMethod: text(source.paymentMethod, 80),
    issuer: Object.freeze({
      establishmentId: text(issuer.establishmentId, 80), document: text(issuer.document, 20),
      legalName: text(issuer.legalName, 180), tradeName: text(issuer.tradeName, 180),
      city: text(issuer.city, 120), state: text(issuer.state, 2),
    }),
    items: Object.freeze((Array.isArray(source.items) ? source.items : []).slice(0, 500).map(item).filter((entry) => entry.name)),
    totals: Object.freeze({
      subtotalGross: Math.max(0, number(totals.subtotalGross)), itemDiscount: Math.max(0, number(totals.itemDiscount)),
      generalDiscount: Math.max(0, number(totals.generalDiscount)), freight: Math.max(0, number(totals.freight)),
      insurance: Math.max(0, number(totals.insurance)), otherExpenses: Math.max(0, number(totals.otherExpenses)),
      total: Math.max(0, number(totals.total)),
    }),
    createdAt: text(source.createdAt, 40),
    emission,
  });
}

export function parseFiscalDocumentsMessage(data) {
  if (!data || data.type !== FISCAL_DOCUMENTS_MESSAGE_TYPE || !UUID.test(text(data.companyId, 80)) || !Array.isArray(data.documents)) return null;
  return Object.freeze({
    companyId: text(data.companyId, 80),
    documents: Object.freeze(data.documents.slice(0, 100).map(document).filter(Boolean)),
  });
}
