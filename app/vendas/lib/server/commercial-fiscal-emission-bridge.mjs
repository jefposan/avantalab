import { createHash } from 'node:crypto';

export const COMMERCIAL_FISCAL_EMISSION_BRIDGE_REFERENCE = '2026-09-03';

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

function digest(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
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
    emission: row.emissao_id ? {
      id: row.emissao_id,
      companyId: row.emissao_empresa_id,
      establishmentId: row.emissao_estabelecimento_id,
      draftId: row.emissao_rascunho_id,
      originId: row.emissao_origem_id,
      documentType: row.emissao_documento_tipo,
      model: row.emissao_modelo,
      environment: row.emissao_ambiente,
      state: row.emissao_situacao,
      version: Number(row.emissao_versao || 1),
    } : null,
  };
}

function expectedDigest(draft) {
  return digest({
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

function validateDraft(draft) {
  if (!draft) return issue('AV-COMMERCIAL-FISCAL-DRAFT-NOT-FOUND', 'draft', 'O rascunho fiscal não foi localizado nesta empresa.');
  if (draft.documentType !== 'nfe') {
    return issue('AV-COMMERCIAL-FISCAL-DOCUMENT-UNSUPPORTED', 'documentType', 'Este piloto prepara somente NF-e. NFC-e e NFS-e permanecem preservadas para os conectores próprios.');
  }
  if (draft.originType !== 'pedido' || draft.operationStatus !== 'faturado'
    || draft.operationFiscalStatus !== 'rascunho_criado') {
    return issue('AV-COMMERCIAL-FISCAL-ORIGIN', 'order', 'O rascunho não pertence a um pedido faturado e pronto para o ciclo fiscal.');
  }
  if (draft.status !== 'pronto') {
    return issue('AV-COMMERCIAL-FISCAL-DRAFT-PENDING', 'draft', 'Conclua as pendências cadastrais e fiscais antes de preparar a emissão.');
  }
  if (!UUID.test(clean(draft.issuerSnapshot?.establishmentId))) {
    return issue('AV-COMMERCIAL-FISCAL-ISSUER', 'issuer', 'O cadastro fiscal da empresa ativa precisa ser concluído antes da emissão.');
  }
  if (!DIGEST.test(clean(draft.contentDigest)) || expectedDigest(draft) !== clean(draft.contentDigest).toLowerCase()) {
    return issue('AV-COMMERCIAL-FISCAL-DRAFT-INTEGRITY', 'draft', 'A integridade do rascunho fiscal não pôde ser confirmada.');
  }
  return null;
}

function publicEmission(result, draft) {
  const emission = result?.emission || {};
  const state = emission.state || 'draft';
  const numbered = ['number_reserved', 'signed', 'submitted', 'processing', 'authorized', 'artifacts_stored', 'danfe_ready', 'rejected', 'canceled'].includes(state);
  const signed = ['signed', 'submitted', 'processing', 'authorized', 'artifacts_stored', 'danfe_ready', 'rejected', 'canceled'].includes(state);
  const submitted = ['submitted', 'processing', 'authorized', 'artifacts_stored', 'danfe_ready', 'rejected', 'canceled'].includes(state);
  return {
    emissionId: clean(emission.id),
    draftId: draft.id,
    orderId: draft.operationId,
    documentType: emission.documentType || 'nfe',
    model: emission.model || '55',
    environment: emission.environment || 'homologacao',
    state,
    version: Number(emission.version || 1),
    reused: result?.reused === true,
    numberReserved: numbered,
    signed,
    submitted,
  };
}

function existingEmissionError(draft) {
  const emission = draft?.emission;
  if (!emission) return null;
  const valid = emission.id === draft.id
    && emission.companyId === draft.companyId
    && emission.establishmentId === draft.issuerSnapshot?.establishmentId
    && emission.draftId === draft.id
    && emission.originId === draft.operationId
    && emission.documentType === 'nfe'
    && emission.model === '55'
    && emission.environment === 'homologacao';
  return valid ? null : issue('AV-COMMERCIAL-FISCAL-LINK-INTEGRITY', 'fiscal', 'O vínculo persistido entre o pedido e a emissão fiscal precisa de revisão técnica.');
}

export function createPostgresCommercialFiscalDraftRepository({ pool } = {}) {
  if (!pool?.query) throw new TypeError('Informe o pool PostgreSQL server-side.');
  return Object.freeze({
    async get({ companyId, draftId }) {
      const result = await pool.query(`
        select r.*,o.situacao as operacao_situacao,o.situacao_fiscal as operacao_situacao_fiscal,
          e.id as emissao_id,e.company_id as emissao_empresa_id,e.establishment_id as emissao_estabelecimento_id,
          e.draft_id as emissao_rascunho_id,e.origin_id as emissao_origem_id,
          e.document_type as emissao_documento_tipo,e.model as emissao_modelo,
          e.environment as emissao_ambiente,e.state as emissao_situacao,e.version as emissao_versao
        from public.vendas_fiscal_rascunhos r
        join public.vendas_operacoes o
          on o.empresa_id=r.empresa_id and o.id=r.operacao_id
        left join fiscal_private.emissions e
          on e.company_id=r.empresa_id and e.id=r.id
        where r.empresa_id=$1 and r.id=$2
      `, [companyId, draftId]);
      return mapDraft(result.rows?.[0]);
    },
  });
}

export function createCommercialFiscalEmissionBridge({ draftRepository, emissionLifecycle } = {}) {
  if (!draftRepository?.get) throw new TypeError('Informe o repositório server-side de rascunhos fiscais.');
  if (!emissionLifecycle?.create) throw new TypeError('Informe o ciclo transacional privado de emissão.');
  return Object.freeze({
    async createNfeDraft({ context, draftId, idempotencyKey } = {}) {
      const denied = accessError(context);
      if (denied) return { ok: false, errors: [denied] };
      if (!UUID.test(clean(draftId)) || !KEY.test(clean(idempotencyKey))) {
        return { ok: false, errors: [issue('AV-COMMERCIAL-FISCAL-INPUT', 'draft', 'Atualize a Central Fiscal e tente novamente.') ] };
      }
      try {
        const draft = await draftRepository.get({ companyId: context.companyId, draftId: clean(draftId) });
        const invalid = validateDraft(draft);
        if (invalid) return { ok: false, errors: [invalid] };
        const invalidLink = existingEmissionError(draft);
        if (invalidLink) return { ok: false, errors: [invalidLink] };
        if (draft.emission) {
          return { ok: true, result: publicEmission({ emission: draft.emission, reused: true }, draft), errors: [] };
        }
        const lifecycle = await emissionLifecycle.create({
          id: draft.id,
          companyId: draft.companyId,
          establishmentId: draft.issuerSnapshot.establishmentId,
          draftId: draft.id,
          originId: draft.operationId,
          documentType: 'nfe',
          model: '55',
          environment: 'homologacao',
          operationKey: clean(idempotencyKey),
          actorId: context.actorId,
          publicPayload: {
            source: 'commercial_billing',
            originType: draft.originType,
            draftDigest: draft.contentDigest,
          },
        });
        if (!lifecycle?.ok) {
          return {
            ok: false,
            errors: Array.isArray(lifecycle?.errors) && lifecycle.errors.length
              ? lifecycle.errors
              : [issue('AV-COMMERCIAL-FISCAL-LIFECYCLE', 'fiscal', 'Não foi possível abrir o ciclo fiscal em homologação.')],
          };
        }
        return { ok: true, result: publicEmission(lifecycle, draft), errors: [] };
      } catch {
        return { ok: false, errors: [issue('AV-COMMERCIAL-FISCAL-STORAGE', 'storage', 'Não foi possível preparar a emissão fiscal. Tente novamente.')] };
      }
    },
  });
}
