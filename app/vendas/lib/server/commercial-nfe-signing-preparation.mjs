import { createHash } from 'node:crypto';
import { buildUnsignedNfeSpXml, NFE_SP_XML_REFERENCE, prototypeDraftToNfeSpXmlInput } from '../nfe-sp-xml.mjs';
import { buildCommercialNfePreparationInput, commercialNfeFiscalSnapshotDigest } from './commercial-nfe-preparation.mjs';
import { NFE_ISSUANCE_PREPARATION_REFERENCE } from './nfe-issuance-preparation.mjs';
import { runNfeSignatureLab } from './nfe-signature-lab.mjs';
import { validateNfeXmlAgainstXsd } from './nfe-xsd-validator.mjs';

export const COMMERCIAL_NFE_SIGNING_PREPARATION_REFERENCE = '2026-09-05';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,120}$/;
const DIGEST = /^[a-f0-9]{64}$/i;
const ISSUED_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/;
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
  if (!context.active || !context.moduleActive || context.effectivePermissions?.['fiscal.issue'] !== true) {
    return issue('AV-COMMERCIAL-PERMISSION', 'permission', 'Seu acesso não permite confirmar a emissão da nota.');
  }
  return null;
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

export function validateCommercialNfeSigningSource(data, expectedVersion) {
  const draft = data?.draft;
  const emission = data?.emission;
  const reservation = data?.reservation;
  const preparation = data?.preparationPayload;
  if (!draft || !emission || !reservation || !preparation) return issue('AV-NFE-SIGNING-NOT-FOUND', 'emission', 'A preparação fiscal numerada não foi localizada nesta empresa.');
  if (emission.version !== expectedVersion) return issue('AV-NFE-SIGNING-CONFLICT', 'expectedVersion', 'A emissão foi alterada; atualize a Central Fiscal antes de continuar.');
  if (emission.documentType !== 'nfe' || emission.model !== '55' || emission.environment !== 'homologacao') return issue('AV-NFE-SIGNING-DOCUMENT', 'documentType', 'Esta preparação de assinatura aceita somente NF-e modelo 55 em homologação.');
  if (emission.state !== 'number_reserved') return issue('AV-NFE-SIGNING-STATE', 'state', 'A NF-e precisa estar preparada e com a numeração reservada.');
  if (draft.documentType !== 'nfe' || draft.status !== 'pronto' || draft.originType !== 'pedido' || draft.operationStatus !== 'faturado' || !['rascunho_criado', 'rejeitado'].includes(draft.operationFiscalStatus)) return issue('AV-NFE-SIGNING-ORIGIN', 'draft', 'O pedido faturado precisa manter seu rascunho fiscal pronto.');
  if (emission.id !== draft.id || emission.draftId !== draft.id || emission.originId !== draft.operationId || emission.companyId !== draft.companyId || emission.establishmentId !== draft.issuerSnapshot?.establishmentId) return issue('AV-NFE-SIGNING-LINK', 'draft', 'O vínculo entre pedido, rascunho, emissor e emissão não pôde ser confirmado.');
  if (reservation.id !== emission.reservationId || reservation.emissionId !== emission.id || reservation.companyId !== emission.companyId || reservation.establishmentId !== emission.establishmentId || reservation.documentType !== 'nfe' || reservation.status !== 'reserved' || reservation.series !== emission.series || reservation.number !== emission.number) return issue('AV-NFE-SIGNING-NUMBER', 'numbering', 'A reserva fiscal não corresponde à série e ao número da emissão.');
  if (!DIGEST.test(clean(draft.contentDigest)) || expectedDraftDigest(draft) !== clean(draft.contentDigest).toLowerCase()) return issue('AV-NFE-SIGNING-INTEGRITY', 'draft', 'A integridade dos dados comerciais congelados não pôde ser confirmada.');
  if (preparation.schemaValid !== true || !ISSUED_AT.test(clean(preparation.issuedAt)) || !/^\d{8}$/.test(clean(preparation.technicalNumericCode)) || !DIGEST.test(clean(preparation.fiscalSnapshotDigest)) || !clean(preparation.taxRuleId) || !clean(preparation.taxRuleVersion)) return issue('AV-NFE-SIGNING-PREPARATION', 'preparation', 'A preparação fiscal anterior não contém todas as evidências necessárias para montar o documento definitivo.');
  if (preparation.documentGeneratorReference !== NFE_SP_XML_REFERENCE || preparation.issuancePreparationReference !== NFE_ISSUANCE_PREPARATION_REFERENCE) return issue('AV-NFE-SIGNING-GENERATOR', 'preparation', 'O gerador fiscal mudou depois da preparação. Prepare novamente a NF-e antes de assinar.');
  return null;
}

export async function reconstructCommercialNfeSigningDocument({ data, expectedVersion, context, idempotencyKey, fiscalRuleResolver, schemaValidator = validateNfeXmlAgainstXsd } = {}) {
  const invalid = validateCommercialNfeSigningSource(data, expectedVersion);
  if (invalid) return { ok: false, errors: [invalid] };
  const rules = await fiscalRuleResolver({
    companyId: context.companyId,
    actorId: context.actorId,
    documentType: 'nfe',
    issuer: structuredClone(data.draft.issuerSnapshot),
    customer: structuredClone(data.draft.customerSnapshot),
    items: structuredClone(data.draft.itemsSnapshot),
    expectedRuleId: data.preparationPayload.taxRuleId,
    expectedRuleVersion: data.preparationPayload.taxRuleVersion,
  });
  if (!rules?.valid || clean(rules.ruleId) !== clean(data.preparationPayload.taxRuleId) || clean(rules.ruleVersion) !== clean(data.preparationPayload.taxRuleVersion)) return { ok: false, errors: [issue('AV-NFE-SIGNING-RULES', 'fiscal', 'A regra tributária aprovada na preparação não está mais disponível na mesma versão.')] };
  const issuedAt = clean(data.preparationPayload.issuedAt);
  if (commercialNfeFiscalSnapshotDigest(data, rules, issuedAt) !== clean(data.preparationPayload.fiscalSnapshotDigest).toLowerCase()) return { ok: false, errors: [issue('AV-NFE-SIGNING-RULE-CHANGE', 'fiscal', 'Os parâmetros tributários mudaram depois da preparação. Prepare novamente a NF-e antes de assinar.')] };
  const mapped = buildCommercialNfePreparationInput(data, rules, idempotencyKey, issuedAt);
  const input = prototypeDraftToNfeSpXmlInput({
    draft: { ...mapped.draft, series: data.emission.series, issuer: { ...mapped.draft.issuer, series: data.emission.series } },
    client: mapped.client,
    config: { ...mapped.config, documentStage: 'signature', testDocumentNumber: String(data.emission.number), testNumericCode: clean(data.preparationPayload.technicalNumericCode) },
    issuedAt,
  });
  const generated = buildUnsignedNfeSpXml(input);
  if (!generated.valid || !generated.xml || !/^\d{44}$/.test(generated.accessKey)) return { ok: false, errors: generated.errors?.length ? generated.errors : [issue('AV-NFE-SIGNING-DOCUMENT', 'fiscal', 'O documento definitivo não pôde ser montado com a numeração reservada.')] };
  const schema = await schemaValidator(generated.xml);
  if (!schema?.executed || !schema?.valid) return { ok: false, errors: [issue('AV-NFE-SIGNING-XSD', 'fiscal', 'O documento definitivo não passou pela validação fiscal antes da assinatura.')] };
  return { ok: true, data, rules, generated, schema, errors: [] };
}

function mapDraft(row) {
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

export function createPostgresCommercialNfeSigningPreparationRepository({ pool } = {}) {
  if (!pool?.query) throw new TypeError('Informe o pool PostgreSQL server-side.');
  return Object.freeze({
    async load({ companyId, emissionId }) {
      const result = await pool.query(`
        select r.*,
          coalesce(c.issuer_snapshot,r.emitente_retrato) as emitente_retrato,
          coalesce(c.recipient_snapshot,r.destinatario_retrato) as destinatario_retrato,
          coalesce(c.items_snapshot,r.itens_retrato) as itens_retrato,
          coalesce(c.totals_snapshot,r.totais_retrato) as totais_retrato,
          coalesce(c.payment_snapshot,r.pagamento_retrato) as pagamento_retrato,
          coalesce(c.correction_digest,r.conteudo_hash) as conteudo_hash,
          o.situacao as operacao_situacao,o.situacao_fiscal as operacao_situacao_fiscal,
          e.id as emissao_id,e.company_id as emissao_empresa_id,e.establishment_id,e.draft_id,e.origin_id,
          e.document_type as emissao_documento_tipo,e.model,e.environment,e.state,e.version,
          e.series,e.number,e.reservation_id,
          nr.id as numero_reserva_id,nr.company_id as numero_empresa_id,nr.establishment_id as numero_establishment_id,
          nr.emission_id as numero_emissao_id,nr.document_type as numero_documento_tipo,
          nr.series as numero_serie,nr.number as numero_valor,nr.status as numero_situacao,
          prepared.public_payload as preparacao_publica
        from fiscal_private.emissions e
        join public.vendas_fiscal_rascunhos r on r.empresa_id=e.company_id and r.id::text=e.draft_id
        join public.vendas_operacoes o on o.empresa_id=r.empresa_id and o.id=r.operacao_id
        join fiscal_private.number_reservations nr on nr.company_id=e.company_id and nr.id=e.reservation_id and nr.emission_id=e.id
        left join lateral (
          select x.* from fiscal_private.emission_corrections x
          where x.company_id=e.company_id and x.emission_id=e.id
          order by x.revision desc limit 1
        ) c on true
        left join lateral (
          select v.public_payload from fiscal_private.events v
          where v.company_id=e.company_id and v.emission_id=e.id and v.event_type='emission.prepared'
          order by v.sequence desc limit 1
        ) prepared on true
        where e.company_id=$1 and e.id=$2
      `, [companyId, emissionId]);
      const row = result.rows?.[0];
      if (!row) return null;
      return {
        draft: mapDraft(row),
        emission: {
          id: row.emissao_id, companyId: row.emissao_empresa_id, establishmentId: row.establishment_id,
          draftId: row.draft_id, originId: row.origin_id || '', documentType: row.emissao_documento_tipo,
          model: row.model, environment: row.environment, state: row.state, version: Number(row.version),
          series: row.series || '', number: Number(row.number || 0), reservationId: row.reservation_id || '',
        },
        reservation: {
          id: row.numero_reserva_id, companyId: row.numero_empresa_id, establishmentId: row.numero_establishment_id,
          emissionId: row.numero_emissao_id, documentType: row.numero_documento_tipo,
          series: row.numero_serie, number: Number(row.numero_valor), status: row.numero_situacao,
        },
        preparationPayload: row.preparacao_publica || null,
      };
    },
  });
}

export function createCommercialNfeSigningPreparationService({
  repository,
  fiscalRuleResolver,
  schemaValidator = validateNfeXmlAgainstXsd,
  signatureLab = runNfeSignatureLab,
} = {}) {
  if (!repository?.load) throw new TypeError('Informe o repositório server-side da preparação de assinatura.');
  if (typeof fiscalRuleResolver !== 'function') throw new TypeError('Informe o resolvedor tributário server-side.');
  if (typeof schemaValidator !== 'function' || typeof signatureLab !== 'function') throw new TypeError('Informe os validadores internos da NF-e.');
  return Object.freeze({
    async prepare({ context, emissionId, expectedVersion, idempotencyKey } = {}) {
      const denied = accessError(context);
      if (denied) return { ok: false, errors: [denied] };
      const normalizedEmissionId = clean(emissionId);
      const normalizedKey = clean(idempotencyKey);
      if (!UUID.test(normalizedEmissionId) || !Number.isInteger(expectedVersion) || expectedVersion < 1 || !KEY.test(normalizedKey)) return { ok: false, errors: [issue('AV-NFE-SIGNING-INPUT', 'emission', 'Atualize a Central Fiscal e tente novamente.')] };
      try {
        const data = await repository.load({ companyId: context.companyId, emissionId: normalizedEmissionId });
        const reconstructed = await reconstructCommercialNfeSigningDocument({ data, expectedVersion, context, idempotencyKey: normalizedKey, fiscalRuleResolver, schemaValidator });
        if (!reconstructed.ok) return reconstructed;
        const { generated, schema } = reconstructed;
        const lab = await signatureLab(generated.xml, data.draft.issuerSnapshot.document);
        if (!lab?.valid || lab.accessKey !== generated.accessKey || lab.signatureVerified !== true || lab.signedXsdValid !== true || lab.transmissionAttempted === true) return { ok: false, errors: [issue('AV-NFE-SIGNING-LAB', 'signature', 'A bancada protegida não conseguiu validar a assinatura do documento definitivo.')] };
        return {
          ok: true,
          result: {
            emissionId: data.emission.id,
            draftId: data.emission.draftId,
            orderId: data.emission.originId,
            state: data.emission.state,
            version: data.emission.version,
            series: data.emission.series,
            number: data.emission.number,
            accessKey: generated.accessKey,
            unsignedDocumentChecksum: sha256(generated.xml),
            unsignedDocumentBytes: Buffer.byteLength(generated.xml, 'utf8'),
            schemaPackage: schema.schemaPackage,
            schemaValid: true,
            documentReadyForA1Signature: true,
            ephemeralSignatureLabValidated: true,
            realCertificateInspected: false,
            realSignatureAttempted: false,
            signed: false,
            persisted: false,
            transmitted: false,
            xmlReturned: false,
            sensitiveMaterialReturned: false,
          },
          errors: [],
        };
      } catch {
        return { ok: false, errors: [issue('AV-NFE-SIGNING-STORAGE', 'storage', 'Não foi possível preparar a assinatura da NF-e. Tente novamente.')] };
      }
    },
  });
}
