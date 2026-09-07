import { createHash } from 'node:crypto';
import { NFE_SP_XML_REFERENCE } from '../nfe-sp-xml.mjs';
import { saoPauloFiscalTimestamp } from './fiscal-local-guard.mjs';
import { buildNfeIssuancePreparation, NFE_ISSUANCE_PREPARATION_REFERENCE } from './nfe-issuance-preparation.mjs';

export const COMMERCIAL_NFE_PREPARATION_REFERENCE = '2026-09-04';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,120}$/;
const DIGEST = /^[a-f0-9]{64}$/i;
const clean = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
const issue = (code, field, message) => ({ code, field, message });

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function sha256(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(stable(value))).digest('hex');
}

function accessError(context) {
  if (!context || !UUID.test(clean(context.companyId)) || !UUID.test(clean(context.actorId))) {
    return issue('AV-COMMERCIAL-SESSION', 'session', 'Confirme novamente a sessão e a empresa ativa.');
  }
  if (context.moduleId && context.moduleId !== 'vendas') {
    return issue('AV-COMMERCIAL-MODULE', 'module', 'O acesso não pertence ao módulo Vendas e Serviços.');
  }
  if (!context.active || !context.moduleActive || context.effectivePermissions?.['fiscal.prepare'] !== true) {
    return issue('AV-COMMERCIAL-PERMISSION', 'permission', 'Seu acesso não permite preparar a emissão fiscal.');
  }
  return null;
}

function mapEmission(row) {
  if (!row) return null;
  return {
    id: row.emissao_id,
    companyId: row.empresa_id,
    establishmentId: row.establishment_id,
    draftId: row.draft_id,
    originId: row.origin_id || '',
    documentType: row.emissao_documento_tipo,
    model: row.model,
    environment: row.environment,
    state: row.state,
    version: Number(row.version),
  };
}

function mapDraft(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.empresa_id,
    operationId: row.operacao_id,
    originType: row.origem_tipo,
    documentType: row.documento_tipo,
    status: row.situacao,
    issuerSnapshot: row.emitente_retrato || {},
    customerSnapshot: row.destinatario_retrato || {},
    itemsSnapshot: row.itens_retrato || [],
    totalsSnapshot: row.totais_retrato || {},
    paymentSnapshot: row.pagamento_retrato || {},
    contentDigest: row.conteudo_hash,
    operationStatus: row.operacao_situacao,
    operationFiscalStatus: row.operacao_situacao_fiscal,
  };
}

function expectedDraftDigest(draft) {
  return sha256({
    companyId: draft.companyId,
    orderId: draft.operationId,
    documentType: draft.documentType,
    issuer: draft.issuerSnapshot,
    customer: draft.customerSnapshot,
    items: draft.itemsSnapshot,
    totals: draft.totalsSnapshot,
    payment: draft.paymentSnapshot,
  });
}

function validateContext(data) {
  const draft = data?.draft;
  const emission = data?.emission;
  if (!draft || !emission) return issue('AV-NFE-PREPARE-NOT-FOUND', 'draft', 'A emissão fiscal não foi localizada nesta empresa.');
  if (draft.documentType !== 'nfe' || emission.documentType !== 'nfe' || emission.model !== '55') {
    return issue('AV-NFE-PREPARE-DOCUMENT', 'documentType', 'Esta preparação aceita somente NF-e modelo 55.');
  }
  if (draft.status !== 'pronto' || draft.originType !== 'pedido' || draft.operationStatus !== 'faturado'
    || draft.operationFiscalStatus !== 'rascunho_criado') {
    return issue('AV-NFE-PREPARE-ORIGIN', 'draft', 'O pedido faturado precisa estar com o rascunho fiscal pronto.');
  }
  if (emission.state !== 'draft' || emission.environment !== 'homologacao') {
    return issue('AV-NFE-PREPARE-STATE', 'fiscal', 'A emissão não está no estado inicial de homologação.');
  }
  if (emission.id !== draft.id || emission.draftId !== draft.id || emission.originId !== draft.operationId
    || emission.companyId !== draft.companyId || emission.establishmentId !== draft.issuerSnapshot?.establishmentId) {
    return issue('AV-NFE-PREPARE-LINK', 'draft', 'O vínculo entre pedido, rascunho e emissão fiscal não pôde ser confirmado.');
  }
  if (!DIGEST.test(clean(draft.contentDigest)) || expectedDraftDigest(draft) !== clean(draft.contentDigest).toLowerCase()) {
    return issue('AV-NFE-PREPARE-INTEGRITY', 'draft', 'A integridade dos dados comerciais congelados não pôde ser confirmada.');
  }
  return null;
}

function recipientProfile(snapshot = {}) {
  if (['contribuinte', 'contribuinte_icms'].includes(snapshot.stateRegistrationIndicator)) return 'Contribuinte ICMS';
  if (['isento', 'contribuinte_isento'].includes(snapshot.stateRegistrationIndicator)) return 'Isento';
  return 'Não contribuinte';
}

function appliedItemRule(rules, item) {
  const collection = rules?.items && typeof rules.items === 'object' ? rules.items : {};
  return collection[item.productId] || collection[item.sku] || {};
}

export function buildCommercialNfePreparationInput(data, rules, idempotencyKey, issuedAt) {
  const draft = data.draft;
  const issuer = draft.issuerSnapshot || {};
  const customer = draft.customerSnapshot || {};
  const address = customer.address || {};
  const totals = draft.totalsSnapshot || {};
  const items = draft.itemsSnapshot.map((item) => {
    const fiscal = item.fiscal && typeof item.fiscal === 'object' ? item.fiscal : {};
    const applied = appliedItemRule(rules, item);
    return {
      sku: item.sku || item.productId,
      name: item.name,
      gtin: applied.gtin || fiscal.gtin || '',
      ncm: applied.ncm || fiscal.ncm,
      cest: applied.cest || fiscal.cest,
      cfopInternal: applied.cfop || fiscal.cfop,
      unit: item.unit,
      taxableUnit: applied.taxableUnit || fiscal.taxableUnit || item.unit,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      unitDiscount: Number(item.unitDiscount),
      fiscalOriginCode: applied.originCode || fiscal.originCode || fiscal.origin,
      icmsCode: applied.icmsCode || fiscal.csosn || fiscal.cst,
      pisCst: applied.pisCst || fiscal.pisCst,
      cofinsCst: applied.cofinsCst || fiscal.cofinsCst,
    };
  });
  return {
    draft: {
      id: draft.id,
      originId: draft.operationId,
      documentType: 'nfe',
      environment: 'Homologação',
      status: 'Pronto para homologação',
      total: Number(totals.total),
      paymentMethod: draft.paymentSnapshot?.method || 'Outros',
      commercialTotals: {
        products: Number(totals.subtotalGross),
        lineDiscount: Number(totals.itemDiscount),
        orderDiscount: Number(totals.generalDiscount),
        discount: Number(totals.itemDiscount) + Number(totals.generalDiscount),
        freight: Number(totals.freight),
        insurance: Number(totals.insurance),
        other: Number(totals.otherExpenses),
        invoice: Number(totals.total),
      },
      operationNature: clean(rules.operationNature, 60),
      operationContext: { presence: clean(rules.presence, 40) },
      issuer: {
        establishmentId: issuer.establishmentId,
        document: issuer.document,
        legalName: issuer.legalName,
        tradeName: issuer.tradeName,
        stateRegistration: issuer.stateRegistration,
        taxRegime: issuer.taxRegime,
        uf: issuer.state,
        city: issuer.city,
        cityCode: issuer.cityCode,
        cep: issuer.postalCode,
        street: issuer.street,
        number: issuer.number,
        complement: issuer.complement,
        district: issuer.district,
        phone: issuer.phone,
      },
      items,
    },
    client: {
      document: customer.document,
      legalName: customer.legalName || customer.displayName,
      fiscal: recipientProfile(customer),
      stateRegistration: customer.stateRegistration,
      email: customer.email,
      phone: customer.phone,
      street: address.street,
      number: address.number,
      complement: address.complement,
      district: address.district,
      cityName: address.city,
      cityCode: address.cityCode,
      state: address.state,
      cep: address.postalCode,
    },
    config: {
      matrixReviewConfirmed: rules.matrixReviewConfirmed === true,
      taxReviewConfirmed: rules.taxReviewConfirmed === true,
      taxReformReviewConfirmed: rules.taxReformReviewConfirmed === true,
    },
    numberingLedger: data.numberingLedger,
    attemptKey: idempotencyKey,
    issuedAt,
  };
}

export function commercialNfeFiscalSnapshotDigest(data, rules, issuedAt) {
  const mapped = buildCommercialNfePreparationInput(data, rules, 'fiscal-snapshot', issuedAt);
  return sha256({ draft: mapped.draft, client: mapped.client, config: mapped.config });
}

function publicResult(emission, preparation, reused = false, publicPayload = {}) {
  return {
    emissionId: emission.id,
    draftId: emission.draftId,
    orderId: emission.originId,
    documentType: 'nfe',
    model: '55',
    environment: 'homologacao',
    state: 'prepared',
    version: Number(emission.version),
    reused,
    preparationId: preparation?.preparationId || publicPayload.preparationId || '',
    schemaPackage: publicPayload.schemaPackage || 'PL_010e_v1.02',
    schemaValid: preparation?.schemaValid === true || publicPayload.schemaValid === true,
    candidateSeries: preparation?.series || publicPayload.candidateSeries || '',
    candidateNumber: Number(preparation?.candidateNumber || publicPayload.candidateNumber || 0),
    numberReserved: false,
    certificateInspected: false,
    signed: false,
    transmitted: false,
  };
}

export function createPostgresCommercialNfePreparationRepository({ pool } = {}) {
  if (!pool?.query) throw new TypeError('Informe o pool PostgreSQL server-side.');
  return Object.freeze({
    async findPreparedOperation({ companyId, draftId, operationKey }) {
      const result = await pool.query(`
        select o.emission_id,o.resulting_version,e.draft_id,e.origin_id,e.state,e.version,
          v.to_state,v.event_type,v.public_payload
        from fiscal_private.operations o
        join fiscal_private.emissions e on e.company_id=o.company_id and e.id=o.emission_id
        left join fiscal_private.events v
          on v.company_id=o.company_id and v.emission_id=o.emission_id and v.sequence=o.resulting_version
        where o.company_id=$1 and o.operation_key=$2
      `, [companyId, operationKey]);
      const row = result.rows?.[0];
      if (!row) return null;
      return {
        matches: row.emission_id === draftId && row.to_state === 'prepared' && row.event_type === 'emission.prepared',
        emission: { id: row.emission_id, draftId: row.draft_id, originId: row.origin_id || '', version: Number(row.version) },
        publicPayload: row.public_payload || {},
      };
    },
    async load({ companyId, draftId }) {
      const draftResult = await pool.query(`
        select r.*,o.situacao as operacao_situacao,o.situacao_fiscal as operacao_situacao_fiscal,
          e.id as emissao_id,e.establishment_id,e.draft_id,e.origin_id,
          e.document_type as emissao_documento_tipo,e.model,e.environment,e.state,e.version
        from public.vendas_fiscal_rascunhos r
        join public.vendas_operacoes o on o.empresa_id=r.empresa_id and o.id=r.operacao_id
        join fiscal_private.emissions e on e.company_id=r.empresa_id and e.draft_id=r.id::text
        where r.empresa_id=$1 and r.id=$2
      `, [companyId, draftId]);
      const row = draftResult.rows?.[0];
      if (!row) return null;
      const draft = mapDraft(row);
      const emission = mapEmission(row);
      const [sequences, reservations, voids] = await Promise.all([
        pool.query(`select * from fiscal_private.number_sequences
          where company_id=$1 and establishment_id=$2 and document_type='nfe' order by active desc,series`,
        [companyId, emission.establishmentId]),
        pool.query(`select r.* from fiscal_private.number_reservations r
          where r.company_id=$1 and r.establishment_id=$2 and r.document_type='nfe'`,
        [companyId, emission.establishmentId]),
        pool.query(`select * from fiscal_private.number_voids
          where company_id=$1 and establishment_id=$2 and document_type='nfe'`,
        [companyId, emission.establishmentId]),
      ]);
      return {
        draft,
        emission,
        numberingLedger: {
          version: 1,
          sequences: sequences.rows.map((entry) => ({
            documentType: entry.document_type, series: entry.series,
            nextNumber: Number(entry.next_number), lastReservedNumber: Number(entry.last_reserved_number),
            active: entry.active, updatedAt: entry.updated_at,
          })),
          reservations: reservations.rows.map((entry) => ({
            id: entry.id, idempotencyKey: entry.idempotency_key, draftId: emission.draftId,
            originId: draft.operationId, documentType: entry.document_type, series: entry.series,
            number: Number(entry.number), status: entry.status, reservedAt: entry.reserved_at,
            updatedAt: entry.updated_at,
          })),
          voidRequests: voids.rows.map((entry) => ({
            id: entry.id, documentType: entry.document_type, series: entry.series,
            startNumber: Number(entry.start_number), endNumber: Number(entry.end_number),
            reason: entry.reason, status: entry.status, protocol: entry.protocol_number || '',
            requestedAt: entry.created_at, updatedAt: entry.updated_at,
          })),
          audit: [],
        },
      };
    },
  });
}

export function createCommercialNfePreparationService({
  repository,
  emissionLifecycle,
  fiscalRuleResolver,
  preparationBuilder = buildNfeIssuancePreparation,
  clock = () => saoPauloFiscalTimestamp(),
} = {}) {
  if (!repository?.load || !repository?.findPreparedOperation) throw new TypeError('Informe o repositório server-side da preparação de NF-e.');
  if (!emissionLifecycle?.transition) throw new TypeError('Informe o ciclo transacional privado de emissão.');
  if (typeof fiscalRuleResolver !== 'function') throw new TypeError('Informe o resolvedor tributário server-side.');
  if (typeof preparationBuilder !== 'function') throw new TypeError('Informe o preparador fiscal da NF-e.');
  return Object.freeze({
    async prepare({ context, draftId, idempotencyKey } = {}) {
      const denied = accessError(context);
      if (denied) return { ok: false, errors: [denied] };
      const normalizedDraftId = clean(draftId);
      const normalizedKey = clean(idempotencyKey);
      if (!UUID.test(normalizedDraftId) || !KEY.test(normalizedKey)) {
        return { ok: false, errors: [issue('AV-NFE-PREPARE-INPUT', 'draft', 'Atualize a Central Fiscal e tente novamente.')] };
      }
      try {
        const prior = await repository.findPreparedOperation({
          companyId: context.companyId, draftId: normalizedDraftId, operationKey: normalizedKey,
        });
        if (prior) {
          if (!prior.matches) return { ok: false, errors: [issue('AV-NFE-PREPARE-IDEMPOTENCY', 'idempotencyKey', 'Esta solicitação já foi utilizada em outra operação fiscal.')] };
          return { ok: true, result: publicResult(prior.emission, null, true, prior.publicPayload), errors: [] };
        }
        const data = await repository.load({ companyId: context.companyId, draftId: normalizedDraftId });
        const invalid = validateContext(data);
        if (invalid) return { ok: false, errors: [invalid] };
        const rules = await fiscalRuleResolver({
          companyId: context.companyId,
          actorId: context.actorId,
          documentType: 'nfe',
          issuer: structuredClone(data.draft.issuerSnapshot),
          customer: structuredClone(data.draft.customerSnapshot),
          items: structuredClone(data.draft.itemsSnapshot),
        });
        if (!rules || rules.valid !== true) {
          return {
            ok: false,
            errors: Array.isArray(rules?.errors) && rules.errors.length
              ? rules.errors
              : [issue('AV-NFE-PREPARE-RULES', 'fiscal', 'Conclua e aprove a regra tributária aplicável antes de preparar a NF-e.')],
          };
        }
        const issuedAt = clock();
        const preparation = await preparationBuilder(buildCommercialNfePreparationInput(data, rules, normalizedKey, issuedAt));
        if (!preparation?.valid || !preparation?.schemaValid) {
          return {
            ok: false,
            errors: Array.isArray(preparation?.errors) && preparation.errors.length
              ? preparation.errors
              : [issue('AV-NFE-PREPARE-VALIDATION', 'fiscal', 'Os dados da NF-e não passaram pela validação fiscal.')],
          };
        }
        const publicPayload = {
          source: 'commercial_billing',
          preparationId: preparation.preparationId,
          schemaPackage: 'PL_010e_v1.02',
          schemaVersion: '4.00',
          documentGeneratorReference: NFE_SP_XML_REFERENCE,
          issuancePreparationReference: NFE_ISSUANCE_PREPARATION_REFERENCE,
          schemaValid: true,
          candidateSeries: preparation.series,
          candidateNumber: preparation.candidateNumber,
          issuedAt,
          technicalNumericCode: preparation.technicalNumericCode,
          fiscalSnapshotDigest: commercialNfeFiscalSnapshotDigest(data, rules, issuedAt),
          candidateAccessKeyDigest: sha256(preparation.accessKeyPreview),
          taxRuleId: clean(rules.ruleId, 100),
          taxRuleVersion: clean(rules.ruleVersion, 40),
          numberReserved: false,
          signatureAttempted: false,
          transmissionAttempted: false,
        };
        const transitioned = await emissionLifecycle.transition({
          companyId: context.companyId,
          emissionId: data.emission.id,
          expectedVersion: data.emission.version,
          operationKey: normalizedKey,
          toState: 'prepared',
          patch: {},
          eventType: 'emission.prepared',
          actorId: context.actorId,
          publicPayload,
        });
        if (!transitioned?.ok) {
          return {
            ok: false,
            errors: Array.isArray(transitioned?.errors) && transitioned.errors.length
              ? transitioned.errors
              : [issue('AV-NFE-PREPARE-LIFECYCLE', 'fiscal', 'Não foi possível concluir a preparação fiscal.')],
          };
        }
        return { ok: true, result: publicResult(transitioned.emission, preparation, transitioned.reused, publicPayload), errors: [] };
      } catch {
        return { ok: false, errors: [issue('AV-NFE-PREPARE-STORAGE', 'storage', 'Não foi possível preparar a NF-e. Tente novamente.')] };
      }
    },
  });
}
