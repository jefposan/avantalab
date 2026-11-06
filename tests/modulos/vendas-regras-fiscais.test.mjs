import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createDefaultFiscalMatrix, normalizeFiscalMatrix, resolveFiscalMatrixRule, validateFiscalMatrix, validateFiscalMatrixPublication } from '../../app/vendas/lib/fiscal-matrix.mjs';
import { prototypeDraftToNfeSpXmlInput } from '../../app/vendas/lib/nfe-sp-xml.mjs';
import { createCommercialFiscalRuleResolver, createCommercialFiscalRulesPublicationService } from '../../app/vendas/lib/server/commercial-fiscal-rules.mjs';

const routeUrl = new URL('../../app/api/modulos/vendas/fiscal/rules/route.ts', import.meta.url);
const labUrl = new URL('../../app/vendas/VendasIntegrado.tsx', import.meta.url);
const companyId = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e';
const actorId = '20202020-2020-4020-8020-202020202020';
const context = { companyId, actorId, moduleId: 'vendas', active: true, moduleActive: true, effectivePermissions: { 'fiscal.configure': true } };

function reviewedRule(overrides = {}) {
  return {
    id: 'nfe-teste', name: 'NF-e · teste controlado', documentType: 'nfe', priority: 10,
    operation: 'Venda', destination: 'Dentro da UF', recipientProfile: 'Contribuinte ICMS',
    consumerFinal: 'Não', presence: 'Não presencial', issuePurpose: 'Normal',
    operationNature: 'Venda de mercadoria', cfopOverride: '5102', serviceIncidenceMode: 'Não aplicável',
    requiresStateRegistration: true, requiresMunicipalIncidence: false, active: true, reviewed: true,
    ...overrides,
  };
}

function reviewedMatrix(rules = [reviewedRule()], documentScope = ['nfe']) {
  return { version: '2026.09', reviewedAt: '2026-09-10', reviewedBy: 'Responsável fiscal', documentScope, rules };
}

function completeItem() {
  return { productId: '30303030-3030-4030-8030-303030303030', name: 'Produto', unit: 'UN', fiscal: { ncm: '33049990', taxableUnit: 'UN' } };
}

test('rota de regras fiscais delega ao handler autenticado e validado', async () => {
  const [source, handler] = await Promise.all([
    readFile(routeUrl, 'utf8'),
    readFile('app/vendas/lib/server/commercial-fiscal-rules-http.mjs', 'utf8'),
  ]);
  assert.match(source, /handleCommercialFiscalRulesRequest/);
  assert.match(handler, /expectedVersion/);
  assert.match(handler, /taxReformReviewConfirmed/);
  assert.doesNotMatch(source, /service_role|FISCAL_DATABASE_URL|SUPABASE_SERVICE_ROLE/);
});

test('laboratório encaminha publicação pelo pai sem entregar token ao iframe', async () => {
  const source = await readFile(labUrl, 'utf8');
  assert.match(source, /AVANTALAB_VENDAS_FISCAL_RULES_SAVE_REQUEST_V1/);
  assert.match(source, /\/api\/modulos\/vendas\/fiscal\/rules/);
  assert.doesNotMatch(source, /postMessage\([^\n]*access_token/);
});

test('falha do catálogo não esconde os ajustes fiscais do módulo', async () => {
  const source = await readFile(labUrl, 'utf8');
  assert.match(source, /if \(!perfilId\) return;/);
  assert.match(source, /carregarDocumentosFiscais\(perfilId, token\)/);
  assert.match(source, /carregarPermissoes\(perfilId\)/);
  assert.match(source, /carregarRegrasFiscais\(perfilId\)/);
  assert.match(source, /!empresaId \?[^]*: <TransicaoNavegacaoInterna/);
  assert.match(source, /<CarregamentoDadosModulo ativo=\{!perfilPronto \|\| !iframePronto\}/);
  assert.match(source, /setPerfilCadastro\(perfil\.cadastro\)[^]*fetch\(`\/api\/modulos\/vendas\/catalogo/);
  assert.doesNotMatch(source, /!catalogo \?[^]*: <iframe/);
});

test('matriz separa consumidor final da situação da inscrição estadual e migra o rótulo antigo', () => {
  const matrix = createDefaultFiscalMatrix();
  const finalConsumerRule = matrix.rules.find((rule) => rule.id === 'nfe-venda-consumidor-final');
  assert.equal(finalConsumerRule.recipientProfile, 'Qualquer');
  assert.equal(finalConsumerRule.consumerFinal, 'Sim');

  const legacy = normalizeFiscalMatrix({
    rules: [{ ...finalConsumerRule, recipientProfile: 'Consumidor final', consumerFinal: undefined }],
  });
  assert.equal(legacy.rules[0].recipientProfile, 'Qualquer');
  assert.equal(legacy.rules[0].consumerFinal, 'Sim');
});

test('resolver usa consumidor final e finalidade fiscal como condições independentes', () => {
  const normal = reviewedRule();
  const complementary = reviewedRule({ id: 'nfe-complementar', issuePurpose: 'Complementar', operationNature: 'NF-e complementar' });
  const consumer = reviewedRule({ id: 'nfe-consumidor', recipientProfile: 'Qualquer', consumerFinal: 'Sim', requiresStateRegistration: false, operationNature: 'Venda a consumidor final' });
  const matrix = reviewedMatrix([normal, complementary, consumer]);

  assert.equal(resolveFiscalMatrixRule({ matrix, documentType: 'nfe', operation: 'Venda', destination: 'Dentro da UF', recipientProfile: 'Contribuinte ICMS', consumerFinal: 'Não', presence: 'Não presencial', issuePurpose: 'Complementar' }).rule?.id, 'nfe-complementar');
  assert.equal(resolveFiscalMatrixRule({ matrix, documentType: 'nfe', operation: 'Venda', destination: 'Dentro da UF', recipientProfile: 'Não contribuinte', consumerFinal: 'Sim', presence: 'Não presencial', issuePurpose: 'Normal' }).rule?.id, 'nfe-consumidor');
});

test('validação rejeita enum, CFOP e escopo de publicação inválidos', () => {
  const invalid = reviewedMatrix([reviewedRule({ operation: 'Operação inventada', cfopOverride: '510' })]);
  const validation = validateFiscalMatrix(invalid, []);
  assert.equal(validation.ready, false);
  assert.match(validation.errors.join(' '), /operação/i);
  assert.match(validation.errors.join(' '), /quatro dígitos/i);
  assert.match(validation.errors.join(' '), /ao menos um tipo de nota/i);

  const unknownScope = validateFiscalMatrix(reviewedMatrix(), ['nfe', 'documento_desconhecido']);
  assert.match(unknownScope.errors.join(' '), /tipo de nota fiscal inválido/i);
});

test('regras inativas ou de documentos fora do escopo não exigem CFOP para publicar NF-e', async () => {
  const inactive = reviewedRule({ id: 'nfe-futura', active: false, reviewed: false, cfopOverride: '' });
  const outsideScope = reviewedRule({ id: 'nfce-futura', documentType: 'nfce', reviewed: false, cfopOverride: '' });
  const matrix = reviewedMatrix([reviewedRule(), inactive, outsideScope]);
  const validation = validateFiscalMatrix(matrix, ['nfe']);
  assert.equal(validation.ready, true, validation.errors.join('\n'));
  assert.equal(validation.activeCount, 1);
  let saved;
  const service = createCommercialFiscalRulesPublicationService({ repository: { publish: async (input) => {
    saved = input;
    return { configuration: { ...input.publication, status: 'publicada', version: 1 } };
  } } });
  const result = await service.publish({ context, input: { matrix, documentScope: ['nfe'], taxReviewConfirmed: true, taxReformReviewConfirmed: true }, expectedVersion: 0, idempotencyKey: 'fiscal:rules:inactive' });
  assert.equal(result.ok, true);
  assert.equal(saved.publication.matrix.rules.find((rule) => rule.id === inactive.id).active, false);
  assert.equal(resolveFiscalMatrixRule({ matrix: saved.publication.matrix, documentType: 'nfe', ...inactive }).rule?.id, 'nfe-teste');

  inactive.active = true;
  assert.match(validateFiscalMatrix(matrix, ['nfe']).errors.join(' '), /CFOP/);
  inactive.active = false;
  assert.match(validateFiscalMatrix(matrix, ['nfe', 'nfce']).errors.join(' '), /CFOP/);
});

test('publicação exige revisão de todas as regras habilitadas e data não futura', async () => {
  let saved;
  const service = createCommercialFiscalRulesPublicationService({ repository: { publish: async (input) => {
    saved = input;
    return { reused: false, configuration: { status: 'publicada', matrixVersion: input.publication.matrixVersion, matrix: input.publication.matrix, version: 1, fiscalResponsible: input.publication.fiscalResponsible, reviewedAt: input.publication.reviewedAt, publishedAt: '2026-09-10T12:00:00.000Z', taxReviewConfirmed: true, taxReformReviewConfirmed: true, contentDigest: input.contentDigest } };
  } } });
  const rules = [reviewedRule(), reviewedRule({ id: 'nfse-teste', documentType: 'nfse', operation: 'Prestação de serviço', destination: 'Não aplicável', recipientProfile: 'Não aplicável', consumerFinal: 'Não aplicável', presence: 'Não aplicável', serviceIncidenceMode: 'Herdar do serviço', requiresStateRegistration: false, requiresMunicipalIncidence: true, reviewed: false })];
  const base = { matrix: reviewedMatrix(rules, ['nfe', 'nfse']), documentScope: ['nfe', 'nfse'], fiscalResponsible: 'Responsável fiscal', reviewedAt: '2026-09-10', taxReviewConfirmed: true, taxReformReviewConfirmed: true };

  const pending = await service.publish({ context, input: base, expectedVersion: 0, idempotencyKey: 'fiscal:rules:pending' });
  assert.equal(pending.ok, false);
  assert.equal(pending.errors[0].code, 'AV-FISCAL-RULES-REVIEW');
  assert.match(pending.errors[0].message, /Regra revisada/);

  const future = await service.publish({ context, input: { ...base, matrix: reviewedMatrix(rules.map((rule) => ({ ...rule, reviewed: true })), ['nfe', 'nfse']), reviewedAt: '2999-01-01' }, expectedVersion: 0, idempotencyKey: 'fiscal:rules:future' });
  assert.equal(future.ok, false);
  assert.match(future.errors.map((item) => item.message).join(' '), /data futura/i);

  const accepted = await service.publish({ context, input: { ...base, matrix: reviewedMatrix(rules.map((rule) => ({ ...rule, reviewed: true })), ['nfe', 'nfse']) }, expectedVersion: 0, idempotencyKey: 'fiscal:rules:accepted' });
  assert.equal(accepted.ok, true);
  assert.deepEqual(saved.publication.documentScope, ['nfe', 'nfse']);
});

test('publicação identifica cada campo pendente e sua regra, inclusive fora da seleção atual', async () => {
  const matrix = reviewedMatrix([
    reviewedRule({ id: 'preenchida' }),
    reviewedRule({ id: 'outra-regra', name: 'Venda interestadual', destination: 'Fora da UF', cfopOverride: '', reviewed: false }),
    reviewedRule({ id: 'inativa', active: false, cfopOverride: '', reviewed: false }),
  ]);
  matrix.reviewedBy = '';
  matrix.reviewedAt = '';
  const input = { matrix, documentScope: ['nfe'], taxReviewConfirmed: false, taxReformReviewConfirmed: false };
  const result = validateFiscalMatrixPublication(input);
  assert.deepEqual(result.issues.map(({ field, ruleId }) => [field, ruleId]), [
    ['cfopOverride', 'outra-regra'], ['reviewedBy', ''], ['reviewedAt', ''],
    ['taxReviewConfirmed', ''], ['taxReformReviewConfirmed', ''], ['reviewed', 'outra-regra'],
  ]);
  assert.equal(result.errors.length, result.issues.length);
  let writes = 0;
  const service = createCommercialFiscalRulesPublicationService({ repository: { publish: async () => { writes++; } } });
  const blocked = await service.publish({ context, input, expectedVersion: 0, idempotencyKey: 'fiscal:rules:fields' });
  assert.equal(blocked.ok, false);
  assert.equal(writes, 0);
  assert.deepEqual(blocked.errors.map(({ field, message }) => ({ field, message })), result.issues.map(({ field, message }) => ({ field, message })));
});

test('data de revisão inválida ou futura aponta o campo certo mesmo sem regras marcadas', () => {
  for (const reviewedAt of ['2026-02-30', '2999-01-01', '']) {
    const result = validateFiscalMatrixPublication({ matrix: { ...reviewedMatrix([reviewedRule({ reviewed: false })]), reviewedAt }, taxReviewConfirmed: true, taxReformReviewConfirmed: true });
    assert.equal(result.issues.find((issue) => issue.field === 'reviewedAt')?.code, 'AV-FISCAL-RULES-REVIEW-DATE');
    assert.equal(result.ready, false);
  }
});

test('ação real de publicar navega até a pendência e só envia após completar a revisão', async () => {
  const source = await readFile('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8');
  const component = source.slice(source.indexOf('function FiscalMatrixDialog('), source.indexOf('\ntype AccessTab ='));
  const saveSource = component.slice(component.indexOf('  const save = () => {'), component.indexOf('  return <Dialog'));
  const createSave = new Function('readOnly', 'draft', 'documentScope', 'taxReviewConfirmedDraft', 'taxReformReviewConfirmedDraft', 'validateFiscalMatrixPublication', 'setError', 'goToIssue', 'onSave', `${saveSource}\nreturn save;`);
  const matrix = reviewedMatrix([reviewedRule({ reviewed: false }), reviewedRule({ id: 'inativa', active: false, cfopOverride: '', reviewed: false })]);
  matrix.reviewedBy = '';
  matrix.reviewedAt = '';
  let pending;
  let sent = 0;
  const submit = () => createSave(false, matrix, ['nfe'], true, true, validateFiscalMatrixPublication, () => {}, (issue) => { pending = issue; }, () => { sent++; })();
  submit();
  assert.equal(pending.field, 'reviewedBy');
  assert.equal(sent, 0);
  matrix.reviewedBy = 'Responsável fiscal';
  submit();
  assert.equal(pending.field, 'reviewedAt');
  matrix.reviewedAt = '2026-09-10';
  submit();
  assert.equal(pending.field, 'reviewed');
  assert.equal(pending.ruleId, 'nfe-teste');
  assert.equal(sent, 0);
  matrix.rules[0].reviewed = true;
  submit();
  assert.equal(sent, 1);
  assert.equal(matrix.rules[0].cfopOverride, '5102');
  assert.equal(matrix.rules[1].active, false);
});

test('resolução server-side exige inscrição estadual quando a regra selecionada determina', async () => {
  const matrix = reviewedMatrix();
  const resolver = createCommercialFiscalRuleResolver({ repository: { getPublished: async () => ({ status: 'publicada', matrixVersion: matrix.version, matrix, version: 2, taxReviewConfirmed: true, taxReformReviewConfirmed: true, contentDigest: 'a'.repeat(64) }) } });
  const base = { companyId, documentType: 'nfe', issuer: { state: 'SP', taxRegime: 'simples_nacional', fiscalConfiguration: { originCode: '0', csosn: '102', pisCst: '49', cofinsCst: '49' } }, customer: { stateRegistrationIndicator: 'contribuinte_icms', consumerFinal: false, stateRegistration: '', address: { state: 'SP' } }, items: [completeItem()] };

  const missing = await resolver(base);
  assert.equal(missing.valid, false);
  assert.equal(missing.errors[0].code, 'AV-FISCAL-RULES-STATE-REGISTRATION');
  const incorrectlyExempt = await resolver({ ...base, customer: { ...base.customer, stateRegistration: 'Isento' } });
  assert.equal(incorrectlyExempt.errors[0].code, 'AV-FISCAL-RULES-STATE-REGISTRATION');

  const complete = await resolver({ ...base, customer: { ...base.customer, stateRegistration: '110042490114' } });
  assert.equal(complete.valid, true);
  assert.equal(complete.ruleId, 'nfe-teste');
});

test('modo empresa ignora códigos antigos do produto e exige padrões fiscais preenchidos', async () => {
  const matrix = reviewedMatrix();
  const resolver = createCommercialFiscalRuleResolver({ repository: { getPublished: async () => ({ status: 'publicada', matrixVersion: matrix.version, matrix, version: 2, taxReviewConfirmed: true, taxReformReviewConfirmed: true, contentDigest: 'a'.repeat(64) }) } });
  const result = await resolver({
    companyId, documentType: 'nfe',
    issuer: { state: 'SP', taxRegime: 'simples_nacional', fiscalConfiguration: { originCode: '0', csosn: '', pisCst: '', cofinsCst: '' } },
    customer: { stateRegistrationIndicator: 'contribuinte_icms', consumerFinal: false, stateRegistration: '110042490114', address: { state: 'SP' } },
    items: [{ ...completeItem(), fiscal: { ...completeItem().fiscal, useCompanyFiscal: true, originCode: '1', icmsCode: '102', pisCst: '49', cofinsCst: '49' } }],
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.map((error) => error.message).join(' '), /CST\/CSOSN.*CST do PIS.*CST da COFINS/i);
});

test('XML usa consumidor final explícito sem confundir com inscrição estadual', () => {
  const draft = { items: [], commercialTotals: {}, total: 0, issuer: {}, operationContext: {} };
  assert.equal(prototypeDraftToNfeSpXmlInput({ draft, client: { fiscal: 'Contribuinte ICMS', consumerFinal: true }, config: {} }).consumerFinal, true);
  assert.equal(prototypeDraftToNfeSpXmlInput({ draft, client: { fiscal: 'Contribuinte isento', consumerFinal: false }, config: {} }).consumerFinal, false);
  assert.equal(prototypeDraftToNfeSpXmlInput({ draft, client: { fiscal: 'Consumidor final' }, config: {} }).consumerFinal, true);
  assert.equal(prototypeDraftToNfeSpXmlInput({ draft, client: { fiscal: 'Contribuinte isento', stateRegistration: 'Isento' }, config: {} }).recipient.stateRegistrationIndicator, '2');
});

test('migração fiscal persiste consumidor final e histórico integral imutável por empresa', async () => {
  const [sql, repository] = await Promise.all([
    readFile(new URL('../../supabase/migrations/20260910143000_vendas_integridade_regras_fiscais.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../app/vendas/lib/server/commercial-fiscal-rules.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(sql, /vendas_clientes[\s\S]*consumidor_final boolean/i);
  assert.match(sql, /vendas_fiscal_configuracoes_revisoes/);
  assert.match(sql, /vendas_rejeitar_alteracao_imutavel/);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /ec9604fd-38f2-429b-9c00-c4bc6c642b0e/);
  assert.match(repository, /vendas_fiscal_configuracoes_revisoes[\s\S]*chave_idempotencia/);
  assert.match(repository, /mapHistoryRow/);
});
