import { createHash } from 'node:crypto';
import { NFE_SP_XML_REFERENCE } from '../nfe-sp-xml.mjs';
import { buildCommercialNfePreparationInput, commercialNfeFiscalSnapshotDigest } from './commercial-nfe-preparation.mjs';
import { saoPauloFiscalTimestamp } from './fiscal-local-guard.mjs';
import { buildNfeIssuancePreparation, NFE_ISSUANCE_PREPARATION_REFERENCE } from './nfe-issuance-preparation.mjs';

export const COMMERCIAL_NFE_REJECTION_CORRECTION_REFERENCE = '2026-09-06';
export const NFE_REJECTION_CORRECTION_CONFIRMATION = 'REVISAR_NFE_REJEITADA';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,90}$/;
const STATUS = /^\d{3}$/;
const clean = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
const issue = (code, field, message) => ({ code, field, message });

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? structuredClone(value) : null;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function sha256(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(stable(value))).digest('hex');
}

function accessError(context) {
  if (!context || !UUID.test(clean(context.companyId)) || !UUID.test(clean(context.actorId))) return issue('AV-COMMERCIAL-SESSION', 'session', 'Confirme novamente a sessão e a empresa ativa.');
  if (context.moduleId && context.moduleId !== 'vendas') return issue('AV-COMMERCIAL-MODULE', 'module', 'O acesso não pertence ao módulo Vendas e Serviços.');
  if (!context.active || !context.moduleActive || context.effectivePermissions?.['fiscal.prepare'] !== true) return issue('AV-COMMERCIAL-PERMISSION', 'permission', 'Seu acesso não permite revisar os dados fiscais da nota.');
  return null;
}

function correctedDraftFromChanges(data, statusCode, changes) {
  if (statusCode !== '778') return { error: issue('AV-NFE-CORRECTION-SCOPE', 'statusCode', 'Esta rejeição deve ser revisada no cadastro indicado pela Central Fiscal.') };
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)
    || Object.keys(changes).some((key) => key !== 'items')
    || !Array.isArray(changes.items) || !changes.items.length || changes.items.length > 200) {
    return { error: issue('AV-NFE-CORRECTION-DATA', 'items', 'Informe os produtos e o NCM corrigido antes de continuar.') };
  }
  const itemsSnapshot = structuredClone(data?.draft?.itemsSnapshot || []);
  const matched = new Set();
  for (const entry of changes.items) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)
      || Object.keys(entry).some((key) => !['productId', 'sku', 'ncm'].includes(key))) {
      return { error: issue('AV-NFE-CORRECTION-DATA', 'items', 'A correção contém campos que não pertencem à revisão de NCM.') };
    }
    const productId = clean(entry.productId, 80);
    const sku = clean(entry.sku, 80);
    const ncm = clean(entry.ncm, 20).replace(/\D/g, '');
    if ((!productId && !sku) || !/^\d{8}$/.test(ncm) || /^0{8}$/.test(ncm)) {
      return { error: issue('AV-NFE-CORRECTION-NCM', 'ncm', 'Informe um NCM válido com 8 dígitos para cada produto.') };
    }
    const index = itemsSnapshot.findIndex((item) => (productId && clean(item?.productId, 80) === productId) || (sku && clean(item?.sku, 80) === sku));
    if (index < 0 || matched.has(index)) return { error: issue('AV-NFE-CORRECTION-ITEM', 'items', 'Um dos produtos não pertence à NF-e rejeitada ou foi informado mais de uma vez.') };
    matched.add(index);
    itemsSnapshot[index] = { ...itemsSnapshot[index], fiscal: { ...(itemsSnapshot[index]?.fiscal || {}), ncm } };
  }
  return { source: {
    issuerSnapshot: structuredClone(data.draft.issuerSnapshot),
    customerSnapshot: structuredClone(data.draft.customerSnapshot),
    itemsSnapshot,
    totalsSnapshot: structuredClone(data.draft.totalsSnapshot),
    paymentSnapshot: structuredClone(data.draft.paymentSnapshot),
  } };
}

function normalizedCorrection(data, input, statusCode) {
  const changed = input?.changes ? correctedDraftFromChanges(data, statusCode, input.changes) : null;
  if (changed?.error) return changed;
  const source = changed?.source || input?.correctedDraft;
  const issuerSnapshot = object(source?.issuerSnapshot);
  const customerSnapshot = object(source?.customerSnapshot);
  const totalsSnapshot = object(source?.totalsSnapshot);
  const paymentSnapshot = object(source?.paymentSnapshot);
  const itemsSnapshot = Array.isArray(source?.itemsSnapshot) ? structuredClone(source.itemsSnapshot) : null;
  if (!issuerSnapshot || !customerSnapshot || !totalsSnapshot || !paymentSnapshot || !itemsSnapshot?.length) return { error: issue('AV-NFE-CORRECTION-DATA', 'correctedDraft', 'Revise emitente, destinatário, itens, totais e pagamento antes de continuar.') };
  const draft = {
    ...data.draft,
    issuerSnapshot,
    customerSnapshot,
    itemsSnapshot,
    totalsSnapshot,
    paymentSnapshot,
  };
  if (clean(issuerSnapshot.establishmentId) !== clean(data.emission.establishmentId) || clean(issuerSnapshot.document).replace(/\D/g, '') !== clean(data.baseIssuerDocument).replace(/\D/g, '')) return { error: issue('AV-NFE-CORRECTION-ISSUER', 'issuer', 'A correção não pode trocar a empresa emissora nem o estabelecimento desta numeração.') };
  const correctionDigest = sha256({
    companyId: draft.companyId,
    orderId: draft.operationId,
    documentType: draft.documentType,
    issuer: draft.issuerSnapshot,
    customer: draft.customerSnapshot,
    items: draft.itemsSnapshot,
    totals: draft.totalsSnapshot,
    payment: draft.paymentSnapshot,
  });
  draft.contentDigest = correctionDigest;
  return { draft, correctionDigest };
}

function validateSource(data, expectedVersion, statusCode) {
  if (!data?.draft || !data?.emission || !data?.reservation) return issue('AV-NFE-CORRECTION-NOT-FOUND', 'emission', 'A NF-e rejeitada não foi localizada nesta empresa.');
  const { draft, emission, reservation } = data;
  if (emission.version !== expectedVersion) return issue('AV-NFE-CORRECTION-CONFLICT', 'expectedVersion', 'A emissão foi alterada; atualize a Central Fiscal antes de continuar.');
  if (emission.state !== 'rejected' || emission.documentType !== 'nfe' || emission.model !== '55' || emission.environment !== 'homologacao') return issue('AV-NFE-CORRECTION-STATE', 'state', 'Somente uma NF-e rejeitada em homologação pode iniciar esta revisão.');
  if (emission.statusCode !== statusCode) return issue('AV-NFE-CORRECTION-STATUS', 'statusCode', 'A rejeição informada não corresponde ao último retorno registrado.');
  if (draft.documentType !== 'nfe' || draft.status !== 'pronto' || draft.originType !== 'pedido' || draft.operationStatus !== 'faturado') return issue('AV-NFE-CORRECTION-ORIGIN', 'draft', 'O pedido faturado não mantém um rascunho fiscal apto para revisão.');
  if (emission.id !== draft.id || emission.draftId !== draft.id || emission.originId !== draft.operationId || emission.companyId !== draft.companyId || emission.establishmentId !== draft.issuerSnapshot?.establishmentId) return issue('AV-NFE-CORRECTION-LINK', 'draft', 'O vínculo entre pedido, rascunho, emissor e emissão não pôde ser confirmado.');
  if (reservation.id !== emission.reservationId || reservation.emissionId !== emission.id || reservation.companyId !== emission.companyId || reservation.establishmentId !== emission.establishmentId || reservation.documentType !== 'nfe' || reservation.status !== 'reserved' || reservation.series !== emission.series || reservation.number !== emission.number) return issue('AV-NFE-CORRECTION-NUMBER', 'numbering', 'A reserva original não corresponde à série e ao número rejeitados.');
  return null;
}

function publicResult(emission, correction, reused = false) {
  const signed = ['signed', 'submitted', 'processing', 'authorized', 'artifacts_stored', 'danfe_ready'].includes(emission.state);
  const transmitted = ['submitted', 'processing', 'authorized', 'artifacts_stored', 'danfe_ready'].includes(emission.state);
  return {
    emissionId: emission.id,
    draftId: emission.draftId,
    orderId: emission.originId,
    state: emission.state,
    version: Number(emission.version),
    series: emission.series,
    number: Number(emission.number),
    reservationId: emission.reservationId,
    correctionRevision: Number(correction.revision),
    correctionPrepared: true,
    sameNumberPreserved: true,
    previousAttemptPreserved: true,
    requiresNewSignature: !signed,
    automaticTransmission: false,
    certificateInspected: false,
    signed,
    transmitted,
    reused,
  };
}

async function withClient(pool, work) {
  const client = typeof pool.connect === 'function' ? await pool.connect() : pool;
  try { return await work(client); } finally { if (client !== pool && typeof client.release === 'function') client.release(); }
}

function mapEmission(row) {
  if (!row) return null;
  return {
    id: row.emission_id, companyId: row.company_id, establishmentId: row.establishment_id,
    draftId: row.draft_id, originId: row.origin_id || '', documentType: row.emission_document_type,
    model: row.model, environment: row.environment, state: row.state, version: Number(row.version),
    series: row.series || '', number: Number(row.number || 0), reservationId: row.reservation_id || '',
    accessKey: row.access_key || '', signedChecksum: row.signed_checksum || '', batchId: row.batch_id || '',
    submittedAt: row.submitted_at || '', receiptNumber: row.receipt_number || '', statusCode: row.status_code || '',
    statusReason: row.status_reason || '', protocolNumber: row.protocol_number || '', authorizedAt: row.authorized_at || '',
    processedStorageReference: row.processed_storage_reference || '', processedChecksum: row.processed_checksum || '',
    danfeStorageReference: row.danfe_storage_reference || '', danfeChecksum: row.danfe_checksum || '',
  };
}

export function createPostgresCommercialNfeRejectionCorrectionRepository({ pool } = {}) {
  if (!pool?.query && !pool?.connect) throw new TypeError('Informe o pool PostgreSQL server-side.');
  return Object.freeze({
    async findByOperation({ companyId, operationKey }) {
      return withClient(pool, async (client) => {
        const result = await client.query(`select c.*,e.state,e.version,e.draft_id,e.origin_id,e.series,e.number,e.reservation_id from fiscal_private.emission_corrections c join fiscal_private.emissions e on e.company_id=c.company_id and e.id=c.emission_id where c.company_id=$1 and c.operation_key=$2`, [companyId, operationKey]);
        const row = result.rows?.[0];
        if (!row) return null;
        return { emissionId: row.emission_id, state: row.state, version: Number(row.version), draftId: row.draft_id, orderId: row.origin_id || '', series: row.series, number: Number(row.number), reservationId: row.reservation_id, revision: Number(row.revision), correctionDigest: row.correction_digest, preparationPayload: row.preparation_payload || {} };
      });
    },
    async load({ companyId, emissionId }) {
      return withClient(pool, async (client) => {
        const result = await client.query(`
          select e.id as emission_id,e.company_id,e.establishment_id,e.draft_id,e.origin_id,
            e.document_type as emission_document_type,e.model,e.environment,e.state,e.version,e.series,e.number,
            e.reservation_id,e.access_key,e.signed_checksum,e.batch_id,e.submitted_at,e.receipt_number,e.status_code,
            e.status_reason,e.protocol_number,e.authorized_at,e.processed_storage_reference,e.processed_checksum,
            e.danfe_storage_reference,e.danfe_checksum,r.id as base_id,r.operacao_id,r.origem_tipo,
            r.documento_tipo,r.situacao as draft_status,r.emitente_retrato as base_issuer,
            coalesce(c.issuer_snapshot,r.emitente_retrato) as issuer_snapshot,
            coalesce(c.recipient_snapshot,r.destinatario_retrato) as recipient_snapshot,
            coalesce(c.items_snapshot,r.itens_retrato) as items_snapshot,
            coalesce(c.totals_snapshot,r.totais_retrato) as totals_snapshot,
            coalesce(c.payment_snapshot,r.pagamento_retrato) as payment_snapshot,
            coalesce(c.correction_digest,r.conteudo_hash) as content_digest,
            o.situacao as operation_status,o.situacao_fiscal as operation_fiscal_status,
            nr.id as number_reservation_id,nr.company_id as number_company_id,nr.establishment_id as number_establishment_id,
            nr.emission_id as number_emission_id,nr.document_type as number_document_type,nr.series as number_series,
            nr.number as number_value,nr.status as number_status
          from fiscal_private.emissions e
          join public.vendas_fiscal_rascunhos r on r.empresa_id=e.company_id and r.id::text=e.draft_id
          join public.vendas_operacoes o on o.empresa_id=r.empresa_id and o.id=r.operacao_id
          join fiscal_private.number_reservations nr on nr.company_id=e.company_id and nr.id=e.reservation_id and nr.emission_id=e.id
          left join lateral (select x.* from fiscal_private.emission_corrections x where x.company_id=e.company_id and x.emission_id=e.id order by x.revision desc limit 1) c on true
          where e.company_id=$1 and e.id=$2
        `, [companyId, emissionId]);
        const row = result.rows?.[0];
        if (!row) return null;
        const emission = mapEmission(row);
        const [sequences, reservations, voids] = await Promise.all([
          client.query(`select * from fiscal_private.number_sequences where company_id=$1 and establishment_id=$2 and document_type='nfe' order by active desc,series`, [companyId, emission.establishmentId]),
          client.query(`select * from fiscal_private.number_reservations where company_id=$1 and establishment_id=$2 and document_type='nfe'`, [companyId, emission.establishmentId]),
          client.query(`select * from fiscal_private.number_voids where company_id=$1 and establishment_id=$2 and document_type='nfe'`, [companyId, emission.establishmentId]),
        ]);
        return {
          baseIssuerDocument: row.base_issuer?.document || '',
          draft: { id: row.base_id, companyId: row.company_id, operationId: row.operacao_id, originType: row.origem_tipo, documentType: row.documento_tipo, status: row.draft_status, issuerSnapshot: row.issuer_snapshot || {}, customerSnapshot: row.recipient_snapshot || {}, itemsSnapshot: row.items_snapshot || [], totalsSnapshot: row.totals_snapshot || {}, paymentSnapshot: row.payment_snapshot || {}, contentDigest: row.content_digest, operationStatus: row.operation_status, operationFiscalStatus: row.operation_fiscal_status },
          emission,
          reservation: { id: row.number_reservation_id, companyId: row.number_company_id, establishmentId: row.number_establishment_id, emissionId: row.number_emission_id, documentType: row.number_document_type, series: row.number_series, number: Number(row.number_value), status: row.number_status },
          numberingLedger: { version: 1, sequences: sequences.rows.map((entry) => ({ documentType: entry.document_type, series: entry.series, nextNumber: Number(entry.next_number), lastReservedNumber: Number(entry.last_reserved_number), active: entry.active, updatedAt: entry.updated_at })), reservations: reservations.rows.map((entry) => ({ id: entry.id, idempotencyKey: entry.idempotency_key, draftId: emission.draftId, originId: emission.originId, documentType: entry.document_type, series: entry.series, number: Number(entry.number), status: entry.status, reservedAt: entry.reserved_at, updatedAt: entry.updated_at })), voidRequests: voids.rows.map((entry) => ({ id: entry.id, documentType: entry.document_type, series: entry.series, startNumber: Number(entry.start_number), endNumber: Number(entry.end_number), reason: entry.reason, status: entry.status, protocol: entry.protocol_number || '', requestedAt: entry.created_at, updatedAt: entry.updated_at })), audit: [] },
        };
      });
    },
    async save({ companyId, emissionId, expectedVersion, operationKey, sourceStatusCode, draft, correctionDigest, preparationPayload, actorId, createdAt }) {
      return withClient(pool, async (client) => {
        await client.query('begin');
        try {
          await client.query('set transaction isolation level serializable');
          await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [`nfe-correction:${companyId}:${emissionId}`]);
          const prior = await client.query('select * from fiscal_private.emission_corrections where company_id=$1 and operation_key=$2', [companyId, operationKey]);
          if (prior.rows?.[0]) {
            const row = prior.rows[0];
            if (row.emission_id !== emissionId || row.correction_digest !== correctionDigest) throw Object.assign(new Error('A chave idempotente pertence a outra correção.'), { code: 'AV-NFE-CORRECTION-IDEMPOTENCY' });
            await client.query('commit');
            return { id: row.id, revision: Number(row.revision), correctionDigest: row.correction_digest, preparationPayload: row.preparation_payload || {}, reused: true };
          }
          const locked = await client.query('select state,version,status_code from fiscal_private.emissions where company_id=$1 and id=$2 for update', [companyId, emissionId]);
          const emission = locked.rows?.[0];
          if (!emission || emission.state !== 'rejected' || Number(emission.version) !== expectedVersion || emission.status_code !== sourceStatusCode) throw Object.assign(new Error('A emissão rejeitada mudou durante a correção.'), { code: 'AV-NFE-CORRECTION-CONFLICT' });
          const next = await client.query('select coalesce(max(revision),0)::int + 1 as revision from fiscal_private.emission_corrections where company_id=$1 and emission_id=$2', [companyId, emissionId]);
          const revision = Number(next.rows?.[0]?.revision || 1);
          const inserted = await client.query(`insert into fiscal_private.emission_corrections(company_id,emission_id,revision,operation_key,source_status_code,issuer_snapshot,recipient_snapshot,items_snapshot,totals_snapshot,payment_snapshot,correction_digest,preparation_payload,created_by,created_at) values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12::jsonb,$13,$14) returning id`, [companyId, emissionId, revision, operationKey, sourceStatusCode, JSON.stringify(draft.issuerSnapshot), JSON.stringify(draft.customerSnapshot), JSON.stringify(draft.itemsSnapshot), JSON.stringify(draft.totalsSnapshot), JSON.stringify(draft.paymentSnapshot), correctionDigest, JSON.stringify(preparationPayload), actorId, createdAt]);
          await client.query('commit');
          return { id: inserted.rows?.[0]?.id, revision, correctionDigest, preparationPayload, reused: false };
        } catch (error) {
          await client.query('rollback');
          throw error;
        }
      });
    },
  });
}

export function createCommercialNfeRejectionCorrectionService({ repository, emissionLifecycle, fiscalRuleResolver, preparationBuilder = buildNfeIssuancePreparation, clock = () => saoPauloFiscalTimestamp() } = {}) {
  if (!repository?.load || !repository?.save || !repository?.findByOperation) throw new TypeError('Informe o repositório server-side da correção de rejeição.');
  if (!emissionLifecycle?.transition) throw new TypeError('Informe o ciclo transacional privado de emissão.');
  if (typeof fiscalRuleResolver !== 'function' || typeof preparationBuilder !== 'function') throw new TypeError('Informe os validadores fiscais da correção.');
  return Object.freeze({
    async prepare({ context, emissionId, expectedVersion, idempotencyKey, rejectedStatusCode, confirmation, correctedDraft, changes } = {}) {
      const denied = accessError(context);
      if (denied) return { ok: false, errors: [denied] };
      const normalizedEmissionId = clean(emissionId);
      const normalizedKey = clean(idempotencyKey);
      const statusCode = clean(rejectedStatusCode);
      if (!UUID.test(normalizedEmissionId) || !Number.isInteger(expectedVersion) || expectedVersion < 1 || !KEY.test(normalizedKey) || !STATUS.test(statusCode) || confirmation !== NFE_REJECTION_CORRECTION_CONFIRMATION) return { ok: false, errors: [issue('AV-NFE-CORRECTION-CONFIRMATION', 'confirmation', 'Confirme explicitamente a revisão da NF-e rejeitada antes de continuar.')] };
      try {
        const data = await repository.load({ companyId: context.companyId, emissionId: normalizedEmissionId });
        const normalized = normalizedCorrection(data, { correctedDraft, changes }, statusCode);
        if (normalized.error) return { ok: false, errors: [normalized.error] };
        const prior = await repository.findByOperation({ companyId: context.companyId, operationKey: normalizedKey });
        if (prior && (prior.emissionId !== normalizedEmissionId || prior.correctionDigest !== normalized.correctionDigest)) return { ok: false, errors: [issue('AV-NFE-CORRECTION-IDEMPOTENCY', 'idempotencyKey', 'Esta solicitação já foi utilizada em outra correção fiscal.')] };
        if (prior && !['rejected', 'prepared'].includes(prior.state)) return { ok: true, result: publicResult({ id: prior.emissionId, draftId: prior.draftId, originId: prior.orderId, state: prior.state, version: prior.version, series: prior.series, number: prior.number, reservationId: prior.reservationId }, prior, true), errors: [] };
        const invalid = validateSource(data, expectedVersion, statusCode);
        if (invalid && !prior) return { ok: false, errors: [invalid] };
        const rules = await fiscalRuleResolver({ companyId: context.companyId, actorId: context.actorId, documentType: 'nfe', issuer: structuredClone(normalized.draft.issuerSnapshot), customer: structuredClone(normalized.draft.customerSnapshot), items: structuredClone(normalized.draft.itemsSnapshot) });
        if (!rules?.valid) return { ok: false, errors: Array.isArray(rules?.errors) && rules.errors.length ? rules.errors : [issue('AV-NFE-CORRECTION-RULES', 'fiscal', 'Conclua a revisão tributária antes de preparar novamente a NF-e.')] };
        const issuedAt = prior?.preparationPayload?.issuedAt || clock();
        const preparation = prior?.preparationPayload ? null : await preparationBuilder(buildCommercialNfePreparationInput({ ...data, draft: normalized.draft }, rules, normalizedKey, issuedAt));
        if (!prior && (!preparation?.valid || !preparation?.schemaValid || preparation.numberPreviouslyReserved !== true || preparation.series !== data.emission.series || Number(preparation.candidateNumber) !== data.emission.number)) return { ok: false, errors: Array.isArray(preparation?.errors) && preparation.errors.length ? preparation.errors : [issue('AV-NFE-CORRECTION-VALIDATION', 'fiscal', 'A correção não preservou a numeração original ou não passou pela validação fiscal.')] };
        const preparationPayload = prior?.preparationPayload || { source: 'rejected_nfe_correction', preparationId: preparation.preparationId, schemaPackage: 'PL_010e_v1.02', schemaVersion: '4.00', documentGeneratorReference: NFE_SP_XML_REFERENCE, issuancePreparationReference: NFE_ISSUANCE_PREPARATION_REFERENCE, schemaValid: true, candidateSeries: preparation.series, candidateNumber: preparation.candidateNumber, issuedAt, technicalNumericCode: preparation.technicalNumericCode, fiscalSnapshotDigest: commercialNfeFiscalSnapshotDigest({ ...data, draft: normalized.draft }, rules, issuedAt), candidateAccessKeyDigest: sha256(preparation.accessKeyPreview), taxRuleId: clean(rules.ruleId, 100), taxRuleVersion: clean(rules.ruleVersion, 40), correctionDigest: normalized.correctionDigest, rejectedStatusCode: statusCode, numberPreviouslyReserved: true, signatureAttempted: false, transmissionAttempted: false };
        const correction = prior || await repository.save({ companyId: context.companyId, emissionId: normalizedEmissionId, expectedVersion, operationKey: normalizedKey, sourceStatusCode: statusCode, draft: normalized.draft, correctionDigest: normalized.correctionDigest, preparationPayload, actorId: context.actorId, createdAt: issuedAt });
        let emission = data.emission;
        let reused = Boolean(prior || correction.reused);
        if (emission.state === 'rejected') {
          const prepared = await emissionLifecycle.transition({ companyId: context.companyId, emissionId: normalizedEmissionId, expectedVersion: emission.version, operationKey: `${normalizedKey}:prepare`, toState: 'prepared', patch: { accessKey: '', signedChecksum: '', batchId: '', submittedAt: '', receiptNumber: '', statusCode: '', statusReason: '', protocolNumber: '', authorizedAt: '', processedStorageReference: '', processedChecksum: '', danfeStorageReference: '', danfeChecksum: '' }, eventType: 'emission.prepared', actorId: context.actorId, publicPayload: { ...preparationPayload, correctionRevision: correction.revision, previousAttemptPreserved: true, automaticTransmission: false } });
          if (!prepared?.ok) return { ok: false, errors: prepared?.errors?.length ? prepared.errors : [issue('AV-NFE-CORRECTION-LIFECYCLE', 'fiscal', 'Não foi possível registrar a preparação corrigida.')] };
          emission = prepared.emission;
          reused ||= prepared.reused === true;
        }
        if (emission.state === 'prepared') {
          const reserved = await emissionLifecycle.transition({ companyId: context.companyId, emissionId: normalizedEmissionId, expectedVersion: emission.version, operationKey: `${normalizedKey}:number`, toState: 'number_reserved', patch: { series: data.emission.series, number: data.emission.number, reservationId: data.emission.reservationId }, eventType: 'emission.number_reused_after_rejection', actorId: context.actorId, publicPayload: { correctionRevision: correction.revision, rejectedStatusCode: statusCode, sameNumberPreserved: true, previousAttemptPreserved: true, signatureRequired: true, automaticTransmission: false } });
          if (!reserved?.ok) return { ok: false, errors: reserved?.errors?.length ? reserved.errors : [issue('AV-NFE-CORRECTION-NUMBER', 'numbering', 'Não foi possível confirmar a reutilização da numeração original.')] };
          emission = reserved.emission;
          reused ||= reserved.reused === true;
        }
        return { ok: true, result: publicResult(emission, correction, reused), errors: [] };
      } catch (error) {
        const code = error?.code === 'AV-NFE-CORRECTION-IDEMPOTENCY' ? error.code : 'AV-NFE-CORRECTION-STORAGE';
        return { ok: false, errors: [issue(code, code.endsWith('IDEMPOTENCY') ? 'idempotencyKey' : 'storage', code.endsWith('IDEMPOTENCY') ? 'Esta solicitação já foi utilizada em outra correção fiscal.' : 'Não foi possível preparar a correção da NF-e. Tente novamente.')] };
      }
    },
  });
}
