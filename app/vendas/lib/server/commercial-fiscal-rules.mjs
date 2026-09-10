import { createHash } from 'node:crypto';
import { normalizeFiscalMatrix, resolveFiscalMatrixRule, validateFiscalMatrix } from '../fiscal-matrix.mjs';

export const COMMERCIAL_FISCAL_RULES_REFERENCE = '2026-09-04';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,120}$/;
const RETRYABLE = new Set(['40001', '40P01']);
const clean = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
const issue = (code, field, message) => ({ code, field, message });
const coded = (code) => Object.assign(new Error(code), { code });

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function validReviewDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    && value <= new Date().toISOString().slice(0, 10);
}

function accessError(context) {
  if (!context || !UUID.test(clean(context.companyId)) || !UUID.test(clean(context.actorId))) {
    return issue('AV-FISCAL-RULES-SESSION', 'session', 'Confirme novamente a sessão e a empresa ativa.');
  }
  if (context.moduleId && context.moduleId !== 'vendas') {
    return issue('AV-FISCAL-RULES-MODULE', 'module', 'O acesso não pertence ao módulo Vendas e Serviços.');
  }
  if (!context.active || !context.moduleActive || context.effectivePermissions?.['fiscal.configure'] !== true) {
    return issue('AV-FISCAL-RULES-PERMISSION', 'permission', 'Seu acesso não permite publicar regras fiscais.');
  }
  return null;
}

function readAccessError(context) {
  const denied = accessError(context);
  if (!denied || denied.code !== 'AV-FISCAL-RULES-PERMISSION') return denied;
  if (context?.active && context?.moduleActive
    && (context.effectivePermissions?.['settings.view'] === true || context.effectivePermissions?.['fiscal.view'] === true)) return null;
  return issue('AV-FISCAL-RULES-PERMISSION', 'permission', 'Seu acesso não permite consultar regras fiscais.');
}

function normalizePublication(input = {}) {
  const validation = validateFiscalMatrix(input.matrix, input.documentScope);
  const normalizedMatrix = validation.matrix;
  const responsible = clean(input.fiscalResponsible || normalizedMatrix.reviewedBy, 160);
  const reviewedAt = clean(input.reviewedAt || normalizedMatrix.reviewedAt, 40);
  const matrix = { ...normalizedMatrix, reviewedBy: responsible, reviewedAt };
  const activeRules = matrix.rules.filter((rule) => rule.active && validation.documentScope.includes(rule.documentType));
  const nfeRules = activeRules.filter((rule) => rule.documentType === 'nfe');
  const errors = [...validation.errors.map((message) => issue('AV-FISCAL-RULES-MATRIX', 'matrix', message))];
  if (validation.documentScope.includes('nfe') && !nfeRules.length) errors.push(issue('AV-FISCAL-RULES-COVERAGE', 'matrix', 'Mantenha ao menos uma regra ativa e revisada para NF-e.'));
  if (activeRules.some((rule) => !rule.reviewed)) errors.push(issue('AV-FISCAL-RULES-REVIEW', 'matrix', 'Revise todas as regras ativas dos tipos de nota habilitados antes de publicá-las.'));
  if (!responsible) errors.push(issue('AV-FISCAL-RULES-RESPONSIBLE', 'fiscalResponsible', 'Informe o responsável fiscal pela revisão.'));
  if (!validReviewDate(reviewedAt)) errors.push(issue('AV-FISCAL-RULES-REVIEW-DATE', 'reviewedAt', 'Informe uma data de revisão válida, sem usar uma data futura.'));
  if (input.taxReviewConfirmed !== true) errors.push(issue('AV-FISCAL-RULES-TAX-REVIEW', 'taxReviewConfirmed', 'Confirme a revisão tributária antes de publicar.'));
  if (input.taxReformReviewConfirmed !== true) errors.push(issue('AV-FISCAL-RULES-TAX-REFORM', 'taxReformReviewConfirmed', 'Confirme a revisão dos campos tributários vigentes antes de publicar.'));
  const publication = {
    matrix: { ...matrix, reviewedBy: responsible, reviewedAt },
    documentScope: validation.documentScope,
    matrixVersion: clean(matrix.version, 40),
    fiscalResponsible: responsible,
    reviewedAt,
    taxReviewConfirmed: input.taxReviewConfirmed === true,
    taxReformReviewConfirmed: input.taxReformReviewConfirmed === true,
  };
  return { publication, contentDigest: digest(publication), errors };
}

function mapRow(row) {
  if (!row) return null;
  return {
    companyId: row.empresa_id,
    status: row.situacao,
    matrixVersion: row.matriz_versao,
    matrix: row.matriz || {},
    taxReviewConfirmed: row.revisao_tributaria_confirmada === true,
    taxReformReviewConfirmed: row.reforma_tributaria_confirmada === true,
    fiscalResponsible: row.responsavel_fiscal,
    reviewedAt: row.revisado_em ? new Date(row.revisado_em).toISOString() : '',
    publishedAt: row.publicado_em ? new Date(row.publicado_em).toISOString() : '',
    contentDigest: row.conteudo_hash,
    version: Number(row.versao || 0),
  };
}

function mapHistoryRow(row) {
  if (!row) return null;
  return {
    companyId: row.empresa_id,
    status: 'publicada',
    matrixVersion: row.matriz_versao,
    matrix: row.matriz || {},
    taxReviewConfirmed: row.revisao_tributaria_confirmada === true,
    taxReformReviewConfirmed: row.reforma_tributaria_confirmada === true,
    fiscalResponsible: row.responsavel_fiscal,
    reviewedAt: row.revisado_em ? new Date(row.revisado_em).toISOString() : '',
    publishedAt: row.publicado_em ? new Date(row.publicado_em).toISOString() : '',
    contentDigest: row.conteudo_hash,
    version: Number(row.versao || 0),
  };
}

async function transaction(pool, work) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query('set transaction isolation level serializable');
      const result = await work(client);
      await client.query('commit');
      return result;
    } catch (error) {
      try { await client.query('rollback'); } catch {}
      if (!RETRYABLE.has(error?.code) || attempt === 2) throw error;
    } finally {
      client.release();
    }
  }
}

export function createPostgresCommercialFiscalRulesRepository({ pool } = {}) {
  if (!pool?.connect || !pool?.query) throw new TypeError('Informe o pool PostgreSQL server-side.');
  return Object.freeze({
    async getPublished({ companyId }) {
      const result = await pool.query(`
        select * from public.vendas_fiscal_configuracoes
        where empresa_id=$1 and situacao='publicada' limit 1
      `, [companyId]);
      return mapRow(result.rows[0]);
    },
    async publish({ companyId, actorId, expectedVersion, idempotencyKey, publication, contentDigest }) {
      return transaction(pool, async (client) => {
        const repeated = await client.query(`
          select recurso_id,evento,metadados from public.vendas_eventos
          where empresa_id=$1 and chave_idempotencia=$2
        `, [companyId, idempotencyKey]);
        if (repeated.rows[0]) {
          if (repeated.rows[0].recurso_id !== companyId || repeated.rows[0].evento !== 'configuracao_fiscal_publicada'
            || repeated.rows[0].metadados?.conteudoHash !== contentDigest) throw coded('AV-FISCAL-RULES-IDEMPOTENCY');
          const historical = await client.query(`
            select * from public.vendas_fiscal_configuracoes_revisoes
            where empresa_id=$1 and chave_idempotencia=$2 limit 1
          `, [companyId, idempotencyKey]);
          if (historical.rows[0]) return { reused: true, configuration: mapHistoryRow(historical.rows[0]) };
          const existing = await client.query('select * from public.vendas_fiscal_configuracoes where empresa_id=$1', [companyId]);
          if (existing.rows[0]?.conteudo_hash === contentDigest) return { reused: true, configuration: mapRow(existing.rows[0]) };
          throw coded('AV-FISCAL-RULES-IDEMPOTENCY');
        }
        const current = await client.query('select * from public.vendas_fiscal_configuracoes where empresa_id=$1 for update', [companyId]);
        const currentVersion = Number(current.rows[0]?.versao || 0);
        if (currentVersion !== expectedVersion) throw coded('AV-FISCAL-RULES-CONFLICT');
        const values = [companyId, publication.matrixVersion, JSON.stringify(publication.matrix), publication.taxReviewConfirmed,
          publication.taxReformReviewConfirmed, publication.fiscalResponsible, publication.reviewedAt,
          actorId, contentDigest, idempotencyKey];
        const saved = current.rows[0]
          ? await client.query(`
              update public.vendas_fiscal_configuracoes set situacao='publicada',matriz_versao=$2,
                matriz=$3::jsonb,revisao_tributaria_confirmada=$4,reforma_tributaria_confirmada=$5,
                responsavel_fiscal=$6,revisado_em=$7,publicado_por=$8,publicado_em=now(),
                conteudo_hash=$9,chave_idempotencia=$10,atualizado_por=$8
              where empresa_id=$1 returning *
            `, values)
          : await client.query(`
              insert into public.vendas_fiscal_configuracoes(
                empresa_id,situacao,matriz_versao,matriz,revisao_tributaria_confirmada,
                reforma_tributaria_confirmada,responsavel_fiscal,revisado_em,publicado_por,
                publicado_em,conteudo_hash,chave_idempotencia,atualizado_por
              ) values ($1,'publicada',$2,$3::jsonb,$4,$5,$6,$7,$8,now(),$9,$10,$8) returning *
            `, values);
        const configuration = mapRow(saved.rows[0]);
        await client.query(`
          insert into public.vendas_fiscal_configuracoes_revisoes(
            empresa_id,versao,matriz_versao,matriz,revisao_tributaria_confirmada,
            reforma_tributaria_confirmada,responsavel_fiscal,revisado_em,
            publicado_por,publicado_em,conteudo_hash,chave_idempotencia
          ) values ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12)
        `, [companyId, configuration.version, publication.matrixVersion,
          JSON.stringify(publication.matrix), publication.taxReviewConfirmed,
          publication.taxReformReviewConfirmed, publication.fiscalResponsible,
          publication.reviewedAt, actorId, configuration.publishedAt,
          contentDigest, idempotencyKey]);
        await client.query(`
          insert into public.vendas_eventos(
            empresa_id,recurso_tipo,recurso_id,evento,resumo,metadados,chave_idempotencia,criado_por
          ) values ($1,'configuracao_fiscal',$1,'configuracao_fiscal_publicada',
            'Matriz fiscal revisada publicada para preparação de NF-e.',$2::jsonb,$3,$4)
        `, [companyId, JSON.stringify({ versao: configuration.version, matrizVersao: publication.matrixVersion, conteudoHash: contentDigest, regrasNfe: publication.matrix.rules.filter((rule) => rule.documentType === 'nfe' && rule.active).length }), idempotencyKey, actorId]);
        return { reused: false, configuration };
      });
    },
  });
}

function publicConfiguration(configuration, reused) {
  return Object.freeze({
    status: configuration.status,
    matrixVersion: configuration.matrixVersion,
    matrix: configuration.matrix || {},
    version: configuration.version,
    fiscalResponsible: configuration.fiscalResponsible,
    reviewedAt: configuration.reviewedAt,
    publishedAt: configuration.publishedAt,
    taxReviewConfirmed: configuration.taxReviewConfirmed === true,
    taxReformReviewConfirmed: configuration.taxReformReviewConfirmed === true,
    reused: reused === true,
  });
}

export function createCommercialFiscalRulesQueryService({ repository } = {}) {
  if (!repository?.getPublished) throw new TypeError('Informe o repositório server-side de regras fiscais.');
  return Object.freeze({
    async getPublished({ context } = {}) {
      const denied = readAccessError(context);
      if (denied) return { ok: false, errors: [denied] };
      try {
        const configuration = await repository.getPublished({ companyId: context.companyId });
        return {
          ok: true,
          configuration: configuration ? publicConfiguration(configuration, false) : null,
          canPublish: context.effectivePermissions?.['fiscal.configure'] === true,
          errors: [],
        };
      } catch {
        return { ok: false, errors: [issue('AV-FISCAL-RULES-STORAGE', 'storage', 'Não foi possível consultar as regras fiscais. Tente novamente.')] };
      }
    },
  });
}

export function createCommercialFiscalRulesPublicationService({ repository } = {}) {
  if (!repository?.publish) throw new TypeError('Informe o repositório server-side de regras fiscais.');
  return Object.freeze({
    async publish({ context, input, expectedVersion, idempotencyKey } = {}) {
      const denied = accessError(context);
      if (denied) return { ok: false, errors: [denied] };
      if (!Number.isInteger(expectedVersion) || expectedVersion < 0 || !KEY.test(clean(idempotencyKey))) {
        return { ok: false, errors: [issue('AV-FISCAL-RULES-INPUT', 'configuration', 'Atualize as regras fiscais e tente novamente.')] };
      }
      const normalized = normalizePublication(input);
      if (normalized.errors.length) return { ok: false, errors: normalized.errors };
      try {
        const result = await repository.publish({
          companyId: context.companyId, actorId: context.actorId, expectedVersion,
          idempotencyKey: clean(idempotencyKey), publication: normalized.publication,
          contentDigest: normalized.contentDigest,
        });
        return { ok: true, configuration: publicConfiguration(result.configuration, result.reused), errors: [] };
      } catch (error) {
        const known = error?.code === 'AV-FISCAL-RULES-CONFLICT'
          ? issue(error.code, 'version', 'As regras fiscais foram alteradas por outra pessoa. Atualize antes de publicar.')
          : error?.code === 'AV-FISCAL-RULES-IDEMPOTENCY'
            ? issue(error.code, 'idempotencyKey', 'Esta solicitação já foi usada para outra publicação fiscal.')
            : issue('AV-FISCAL-RULES-STORAGE', 'storage', 'Não foi possível publicar as regras fiscais. Tente novamente.');
        return { ok: false, errors: [known] };
      }
    },
  });
}

function recipientProfile(customer = {}) {
  const indicator = clean(customer.stateRegistrationIndicator).toLowerCase();
  if (['contribuinte', 'contribuinte_icms'].includes(indicator)) return 'Contribuinte ICMS';
  if (['isento', 'contribuinte_isento'].includes(indicator)) return 'Contribuinte isento';
  return 'Não contribuinte';
}

function consumerFinal(customer = {}) {
  if (customer.consumerFinal === true || customer.finalConsumer === true) return 'Sim';
  if (customer.consumerFinal === false || customer.finalConsumer === false) return 'Não';
  return ['isento', 'contribuinte_isento'].includes(clean(customer.stateRegistrationIndicator).toLowerCase()) ? 'Sim' : 'Não';
}

function itemRule(item, rule) {
  const fiscal = item?.fiscal && typeof item.fiscal === 'object' ? item.fiscal : {};
  const value = (keys) => keys.map((key) => clean(fiscal[key])).find(Boolean) || '';
  const applied = {
    ncm: value(['ncm']),
    cest: value(['cest']),
    cfop: clean(rule.cfopOverride) || value(['cfop', 'cfopPadrao', 'cfopInternal']),
    taxableUnit: value(['taxableUnit', 'unidadeTributavel']) || clean(item.unit),
    originCode: value(['originCode', 'origemMercadoria', 'origin']),
    icmsCode: value(['icmsCode', 'csosn', 'cst']),
    pisCst: value(['pisCst', 'cstPis']),
    cofinsCst: value(['cofinsCst', 'cstCofins']),
  };
  const missing = [];
  if (!/^\d{8}$/.test(applied.ncm)) missing.push('NCM');
  if (!/^\d{4}$/.test(applied.cfop)) missing.push('CFOP');
  if (!/^\d$/.test(applied.originCode)) missing.push('origem da mercadoria');
  if (!/^\d{2,3}$/.test(applied.icmsCode)) missing.push('CST/CSOSN');
  if (!/^\d{2}$/.test(applied.pisCst)) missing.push('CST do PIS');
  if (!/^\d{2}$/.test(applied.cofinsCst)) missing.push('CST da COFINS');
  if (!applied.taxableUnit) missing.push('unidade tributável');
  return { applied, missing };
}

export function createCommercialFiscalRuleResolver({ repository } = {}) {
  if (!repository?.getPublished) throw new TypeError('Informe a fonte server-side da matriz fiscal publicada.');
  return async ({ companyId, documentType, issuer, customer, items } = {}) => {
    if (!UUID.test(clean(companyId)) || documentType !== 'nfe') {
      return { valid: false, errors: [issue('AV-FISCAL-RULES-RESOLVE-INPUT', 'fiscal', 'A configuração fiscal solicitada é inválida.')] };
    }
    let configuration;
    try { configuration = await repository.getPublished({ companyId }); }
    catch { return { valid: false, errors: [issue('AV-FISCAL-RULES-UNAVAILABLE', 'fiscal', 'Não foi possível consultar as regras fiscais publicadas.')] }; }
    if (!configuration || configuration.status !== 'publicada'
      || !configuration.taxReviewConfirmed || !configuration.taxReformReviewConfirmed) {
      return { valid: false, errors: [issue('AV-FISCAL-RULES-PENDING', 'fiscal', 'Publique as regras fiscais revisadas da empresa antes de validar a NF-e.')] };
    }
    const issuerState = clean(issuer?.state, 2).toUpperCase();
    const customerState = clean(customer?.address?.state || customer?.state, 2).toUpperCase();
    const context = {
      operation: 'Venda',
      destination: issuerState && customerState ? issuerState === customerState ? 'Dentro da UF' : 'Fora da UF' : 'Qualquer',
      recipientProfile: recipientProfile(customer),
      consumerFinal: consumerFinal(customer),
      presence: 'Não presencial',
      issuePurpose: 'Normal',
    };
    const resolution = resolveFiscalMatrixRule({ matrix: configuration.matrix, documentType: 'nfe', ...context });
    if (!resolution.matched || !resolution.reviewed || !resolution.rule) {
      return { valid: false, errors: [issue('AV-FISCAL-RULES-NO-MATCH', 'fiscal', 'Nenhuma regra fiscal revisada corresponde a esta venda. Revise a matriz da empresa.')] };
    }
    const customerStateRegistration = clean(customer.stateRegistration, 40);
    if (resolution.rule.requiresStateRegistration && (!customerStateRegistration || customerStateRegistration.toLocaleLowerCase('pt-BR') === 'isento')) {
      return { valid: false, errors: [issue('AV-FISCAL-RULES-STATE-REGISTRATION', 'customer', 'A regra fiscal exige a inscrição estadual do destinatário. Complete o cadastro do cliente.')] };
    }
    const itemEntries = [];
    const errors = [];
    for (const item of Array.isArray(items) ? items : []) {
      const { applied, missing } = itemRule(item, resolution.rule);
      if (missing.length) errors.push(issue('AV-FISCAL-RULES-ITEM', 'items', `${clean(item.name, 100) || 'Item'}: revise ${missing.join(', ')} no cadastro de Custos e Precificação.`));
      const key = UUID.test(clean(item.productId)) ? clean(item.productId) : clean(item.sku, 80);
      if (key) itemEntries.push([key, applied]);
    }
    if (!itemEntries.length) errors.push(issue('AV-FISCAL-RULES-ITEMS', 'items', 'A NF-e precisa possuir ao menos um produto fiscalmente classificado.'));
    if (errors.length) return { valid: false, errors };
    return {
      valid: true,
      ruleId: clean(resolution.rule.id, 100),
      ruleVersion: `${configuration.version}:${clean(configuration.matrixVersion, 30)}:${clean(configuration.contentDigest, 12)}`,
      operationNature: clean(resolution.rule.operationNature, 60),
      presence: context.presence,
      matrixReviewConfirmed: true,
      taxReviewConfirmed: true,
      taxReformReviewConfirmed: true,
      items: Object.fromEntries(itemEntries),
    };
  };
}
