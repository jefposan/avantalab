import { evaluateAccessDecision } from '../access-control.mjs';

export const COMMERCIAL_FISCAL_CENTER_REFERENCE = '2026-09-04';

const MAX_RESULTS = 100;
const text = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const timestamp = (value) => value instanceof Date ? value.toISOString() : text(value, 40);

function mapFiscalItem(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const fiscal = source.fiscal && typeof source.fiscal === 'object' && !Array.isArray(source.fiscal) ? source.fiscal : {};
  return Object.freeze({
    productId: text(source.productId, 80), itemType: source.itemType === 'servico' ? 'servico' : 'produto',
    sku: text(source.sku, 80), name: text(source.name, 180), description: text(source.description, 500),
    unit: text(source.unit, 20), quantity: Math.max(0, number(source.quantity)),
    unitPrice: Math.max(0, number(source.unitPrice)), unitDiscount: Math.max(0, number(source.unitDiscount)),
    fiscalReady: source.fiscalReady === true,
    fiscal: Object.freeze({
      ncm: text(fiscal.ncm, 8), cest: text(fiscal.cest, 7), taxableUnit: text(fiscal.taxableUnit || fiscal.unidadeTributavel, 20),
      municipalServiceCode: text(fiscal.municipalServiceCode || fiscal.codigoTributacaoMunicipal, 40),
      nationalServiceCode: text(fiscal.nationalServiceCode || fiscal.codigoTributacaoNacional, 40),
      nbs: text(fiscal.nbs, 20), issRate: Math.max(0, number(fiscal.issRate || fiscal.aliquotaIss)),
      serviceIncidenceMode: text(fiscal.serviceIncidenceMode || fiscal.municipioPrestacao, 80),
      fiscalOriginCode: text(fiscal.fiscalOriginCode || fiscal.origemMercadoria, 10),
      cfopInternal: text(fiscal.cfopInternal || fiscal.cfop || fiscal.cfopPadrao, 10),
      cfopInterstate: text(fiscal.cfopInterstate, 10), icmsCode: text(fiscal.icmsCode || fiscal.csosn || fiscal.cst, 10),
      pisCst: text(fiscal.pisCst || fiscal.cstPis, 10), cofinsCst: text(fiscal.cofinsCst || fiscal.cstCofins, 10),
      ipiCst: text(fiscal.ipiCst || fiscal.cstIpi, 10), ibsCbsCst: text(fiscal.ibsCbsCst || fiscal.cstIbsCbs, 10),
      ibsCbsClassification: text(fiscal.ibsCbsClassification || fiscal.classificacaoIbsCbs, 40),
    }),
  });
}

function withClient(pool, work) {
  if (typeof pool.connect !== 'function') return work(pool);
  return pool.connect().then(async (client) => {
    try { return await work(client); } finally { client.release(); }
  });
}

function mapDocument(row) {
  const customer = row.destinatario_retrato && typeof row.destinatario_retrato === 'object'
    ? row.destinatario_retrato : {};
  const issuer = row.emitente_retrato && typeof row.emitente_retrato === 'object'
    ? row.emitente_retrato : {};
  const payment = row.pagamento_retrato && typeof row.pagamento_retrato === 'object'
    ? row.pagamento_retrato : {};
  const totals = row.totais_retrato && typeof row.totais_retrato === 'object'
    ? row.totais_retrato : {};
  return Object.freeze({
    draftId: text(row.rascunho_id, 80),
    emissionId: text(row.emissao_id, 80),
    originId: text(row.operacao_id, 80),
    originNumber: row.operacao_numero && row.operacao_ano
      ? `${Number(row.operacao_ano)}-${Number(row.operacao_numero)}` : '',
    originType: text(row.origem_tipo, 40),
    documentType: text(row.documento_tipo, 20),
    draftStatus: row.rascunho_cancelado_em ? 'cancelado' : text(row.rascunho_situacao, 40),
    client: text(customer.displayName || customer.name || customer.legalName, 180),
    clientDocument: text(customer.document, 20),
    clientCity: text(customer.city, 120),
    total: number(totals.total),
    paymentMethod: text(payment.method, 80),
    issuer: Object.freeze({
      establishmentId: text(issuer.establishmentId, 80),
      document: text(issuer.document, 20),
      legalName: text(issuer.legalName, 180),
      tradeName: text(issuer.tradeName, 180),
      city: text(issuer.city, 120),
      state: text(issuer.state, 2),
    }),
    items: Object.freeze((Array.isArray(row.itens_retrato) ? row.itens_retrato : []).slice(0, 500).map(mapFiscalItem)),
    totals: Object.freeze({
      subtotalGross: Math.max(0, number(totals.subtotalGross)), itemDiscount: Math.max(0, number(totals.itemDiscount)),
      generalDiscount: Math.max(0, number(totals.generalDiscount)), freight: Math.max(0, number(totals.freight)),
      insurance: Math.max(0, number(totals.insurance)), otherExpenses: Math.max(0, number(totals.otherExpenses)),
      total: Math.max(0, number(totals.total)),
    }),
    createdAt: timestamp(row.rascunho_criado_em),
    emission: row.emissao_id ? Object.freeze({
      id: text(row.emissao_id, 80),
      environment: text(row.emissao_ambiente, 30),
      state: text(row.emissao_situacao, 40),
      version: Number(row.emissao_versao || 1),
      series: text(row.emissao_serie, 3),
      number: Number(row.emissao_numero || 0),
      accessKey: text(row.emissao_chave, 44),
      updatedAt: timestamp(row.emissao_atualizada_em),
    }) : null,
  });
}

export function createPostgresCommercialFiscalCenterRepository({ pool } = {}) {
  if (!pool || (typeof pool.query !== 'function' && typeof pool.connect !== 'function')) {
    throw new TypeError('Informe o pool PostgreSQL server-side da Central Fiscal.');
  }
  return Object.freeze({
    configured: true,
    async listDocuments({ companyId, limit = MAX_RESULTS } = {}) {
      const safeLimit = Math.min(MAX_RESULTS, Math.max(1, Number.parseInt(String(limit), 10) || MAX_RESULTS));
      return withClient(pool, async (client) => {
        const result = await client.query(`
          select
            r.id as rascunho_id,r.operacao_id,r.origem_tipo,r.documento_tipo,
            r.situacao as rascunho_situacao,c.criado_em as rascunho_cancelado_em,r.emitente_retrato,r.destinatario_retrato,
            r.itens_retrato,r.totais_retrato,r.pagamento_retrato,r.criado_em as rascunho_criado_em,
            o.ano as operacao_ano,o.numero as operacao_numero,
            e.id as emissao_id,e.environment as emissao_ambiente,e.state as emissao_situacao,
            e.version as emissao_versao,e.series as emissao_serie,e.number as emissao_numero,
            e.access_key as emissao_chave,e.updated_at as emissao_atualizada_em
          from public.vendas_fiscal_rascunhos r
          join public.vendas_operacoes o
            on o.empresa_id=r.empresa_id and o.id=r.operacao_id
          left join fiscal_private.emissions e
            on e.company_id=r.empresa_id and e.draft_id=r.id::text
              and e.origin_id=r.operacao_id::text
          left join public.vendas_fiscal_rascunho_cancelamentos c
            on c.empresa_id=r.empresa_id and c.rascunho_id=r.id
          where r.empresa_id=$1
          order by r.criado_em desc,r.id desc
          limit $2
        `, [text(companyId, 80), safeLimit]);
        return Object.freeze((result.rows || []).map(mapDocument));
      });
    },
  });
}

export function createCommercialFiscalCenterService({ repository } = {}) {
  return Object.freeze({
    id: 'avantalab-commercial-fiscal-center-v1',
    async list({ boundary, effectivePermissions, limit = MAX_RESULTS } = {}) {
      const access = evaluateAccessDecision({ boundary, effectivePermissions, permission: 'fiscal.view' });
      if (!access.allowed) return { ok: false, reason: access.reason, documents: [] };
      if (repository?.configured !== true || typeof repository.listDocuments !== 'function') {
        return { ok: false, reason: 'repository_unavailable', documents: [] };
      }
      const documents = await repository.listDocuments({ companyId: access.session.companyId, limit });
      return { ok: true, reason: 'allowed', documents };
    },
  });
}
