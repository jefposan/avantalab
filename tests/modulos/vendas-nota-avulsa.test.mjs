import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { createStandaloneFiscalService, createPostgresStandaloneFiscalRepository } from '../../app/vendas/lib/server/standalone-fiscal.mjs';
import { handleStandaloneFiscalRequest } from '../../app/vendas/lib/server/standalone-fiscal-http.mjs';
import { createCommercialFiscalEmissionBridge, createPostgresCommercialFiscalDraftRepository } from '../../app/vendas/lib/server/commercial-fiscal-emission-bridge.mjs';
import { createPostgresCommercialFiscalCenterRepository } from '../../app/vendas/lib/server/commercial-fiscal-center.mjs';
import { parseFiscalDocumentsMessage, FISCAL_DOCUMENTS_MESSAGE_TYPE } from '../../app/vendas/lib/fiscal-documents-bridge.mjs';
import { fiscalDraftOriginReady } from '../../app/vendas/lib/server/fiscal-draft-origin.mjs';
import { createCommercialNfePreparationService, buildCommercialNfePreparationInput } from '../../app/vendas/lib/server/commercial-nfe-preparation.mjs';

const companyId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const customerId = '33333333-3333-4333-8333-333333333333';
const productId = '55555555-5555-4555-8555-555555555555';
const draftId = '66666666-6666-4666-8666-666666666666';
const context = { companyId, actorId, moduleId: 'vendas', active: true, moduleActive: true, effectivePermissions: { 'fiscal.prepare': true } };
const input = { draftId, customerId, fiscalDocument: 'nfe', additionalInfo: 'Referência comercial externa 123', items: [{ catalogItemId: productId, quantity: 2, unitPrice: 99 }], payment: { method: 'pix', installments: 1, firstDueDate: '2026-11-05' } };
const customer = { id: customerId, status: 'ativo', document: '12345678901', legalName: 'Cliente de teste', displayName: 'Cliente de teste' };
const issuer = { establishmentId: companyId, document: '12345678000190', legalName: 'Empresa do perfil', state: 'SP', cityCode: '3550308' };
const product = { id: productId, sku: 'T01', name: 'Produto', type: 'produto', unit: 'UN', salePrice: 99, controlsStock: true, active: true, published: true, fiscalReady: true, fiscal: { ncm: '96032900', taxableUnit: 'UN' } };

test('PostgreSQL: nota avulsa usa somente registro fiscal e chega à preparação sem faturar ou baixar estoque', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role;
      create table auth.users(id uuid primary key); create table empresas(id uuid primary key);
      create table custos_tabelas_preco(id uuid primary key,empresa_id uuid);
      create table vendas_mobile_catalogos(id uuid primary key,empresa_id uuid);
      create table vendas_mobile_catalogo_produtos(id uuid primary key,catalogo_id uuid);`);
    await db.exec(readFileSync('supabase/migrations/20260905152000_vendas_comercial.sql', 'utf8'));
    await db.exec(readFileSync('supabase/migrations/20261105160000_vendas_fiscal_avulsa.sql', 'utf8'));
    await db.exec(`create schema fiscal_private; create table fiscal_private.draft_deletions(company_id uuid,draft_id uuid);
      create table fiscal_private.emissions(id uuid primary key,company_id uuid,establishment_id uuid,draft_id text,origin_id text,document_type text,model text,environment text,state text,version int,series text,number int,access_key text,updated_at timestamptz,status_code text,status_reason text);
      create table fiscal_private.emission_corrections(company_id uuid,emission_id uuid,revision int,issuer_snapshot jsonb,recipient_snapshot jsonb,items_snapshot jsonb,totals_snapshot jsonb,payment_snapshot jsonb);
      create table vendas_fiscal_rascunho_cancelamentos(empresa_id uuid,rascunho_id uuid,criado_em timestamptz);`);
    await db.query('insert into empresas values($1)', [companyId]);
    await db.query('insert into auth.users values($1)', [actorId]);
    const pool = { query: (...args) => db.query(...args) };
    const service = createStandaloneFiscalService({ repository: createPostgresStandaloneFiscalRepository({ pool }), customerResolver: async args => args.companyId === companyId ? customer : null,
      catalogResolver: async () => ({ items: [product] }), issuerResolver: async () => issuer });
    assert.equal((await service.create({ context: { ...context, effectivePermissions: {} }, input })).ok, false);
    const saved = await service.create({ context, input: { ...input, reserveStock: true, issuer: { document: 'fraude' } } });
    assert.equal(saved.ok, true, JSON.stringify(saved.errors));
    const row = (await db.query('select * from vendas_fiscal_rascunhos')).rows[0];
    assert.equal(row.operacao_id, null);
    assert.equal(row.origem_tipo, 'avulsa');
    assert.equal(row.emitente_retrato.legalName, issuer.legalName);
    assert.equal(Number(row.totais_retrato.total), 198);
    assert.equal((await service.create({ context, input })).document.reused, true);
    const conflict = await service.create({ context, input: { ...input, items: [{ ...input.items[0], quantity: 3 }] } });
    assert.equal(conflict.ok, false);
    assert.equal(conflict.errors[0].code, 'AV-FISCAL-STANDALONE-CONFLICT');
    assert.equal((await service.create({ context: { ...context, companyId: '77777777-7777-4777-8777-777777777777' }, input })).ok, false);
    const center = createPostgresCommercialFiscalCenterRepository({ pool });
    const listed = await center.listDocuments({ companyId });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].originType, 'avulsa');
    assert.equal(listed[0].originId, draftId);
    assert.equal(parseFiscalDocumentsMessage({ type: FISCAL_DOCUMENTS_MESSAGE_TYPE, companyId, documents: listed }).documents.length, 1);
    const draftRepository = createPostgresCommercialFiscalDraftRepository({ pool });
    const draft = await draftRepository.get({ companyId, draftId });
    assert.equal(fiscalDraftOriginReady(draft), true);
    assert.equal(fiscalDraftOriginReady({ ...draft, operationId: customerId }), false);
    let createdEmission;
    const bridge = createCommercialFiscalEmissionBridge({ draftRepository, emissionLifecycle: { create: async value => { createdEmission = value; return { ok: true, emission: { ...value, state: 'draft', version: 1 } }; } } });
    const opened = await bridge.createNfeDraft({ context, draftId, idempotencyKey: 'avulsa:abrir:emissao' });
    assert.equal(opened.ok, true, JSON.stringify(opened.errors));
    assert.equal(createdEmission.environment, 'homologacao');
    assert.equal(createdEmission.originId, draftId);
    assert.equal(opened.result.numberReserved, false);
    let fiscalMapped;
    let transition;
    const preparer = createCommercialNfePreparationService({ repository: { findPreparedOperation: async () => null, load: async () => ({ draft, emission: { id: draftId, draftId, originId: draftId, establishmentId: companyId, companyId, documentType: 'nfe', model: '55', environment: 'homologacao', state: 'draft', version: 1 } }) },
      fiscalRuleResolver: async () => ({ valid: true, items: {} }),
      preparationBuilder: async value => { fiscalMapped = value; return { valid: true, schemaValid: true, preparationId: 'teste', series: '1', candidateNumber: 1, accessKeyPreview: 'teste' }; },
      emissionLifecycle: { transition: async value => { transition = value; return { ok: true, emission: { id: draftId, state: 'prepared', version: 2 } }; } } });
    const prepared = await preparer.prepare({ context, draftId, idempotencyKey: 'avulsa:preparar:xml' });
    assert.equal(prepared.ok, true, JSON.stringify(prepared.errors));
    assert.equal(fiscalMapped.draft.total, 198);
    assert.equal(fiscalMapped.draft.items[0].quantity, 2);
    assert.equal(fiscalMapped.draft.additionalInfo, input.additionalInfo);
    assert.equal(transition.toState, 'prepared');
    assert.equal(buildCommercialNfePreparationInput({ draft }, { items: {} }, 'teste:mapear', '2026-11-05T10:00:00-03:00').draft.environment, 'Homologação');
    await db.query(`insert into fiscal_private.emissions(id,company_id,establishment_id,draft_id,origin_id,document_type,model,environment,state,version,series,number) values($1::uuid,$2::uuid,$2::uuid,($1::uuid)::text,($1::uuid)::text,'nfe','55','homologacao','number_reserved',3,'1',1)`,[draftId,companyId]);
    await db.query(`insert into fiscal_private.emission_corrections(company_id,emission_id,revision,totals_snapshot,payment_snapshot) values($1,$2,1,$3::jsonb,$4::jsonb)`,[companyId,draftId,JSON.stringify({...row.totais_retrato,total:200}),JSON.stringify({method:'PIX estático',amount:200})]);
    const revisedList=await center.listDocuments({companyId});assert.equal(revisedList[0].total,200);assert.equal(revisedList[0].paymentMethod,'PIX estático');assert.equal(Number((await db.query('select totais_retrato from vendas_fiscal_rascunhos where id=$1',[draftId])).rows[0].totais_retrato.total),198);
    for (const table of ['vendas_operacoes','vendas_operacao_itens','vendas_contas_receber','vendas_contas_receber_eventos','vendas_estoque_reservas','vendas_estoque_movimentos','vendas_eventos']) {
      assert.equal(Number((await db.query(`select count(*) n from ${table}`)).rows[0].n), 0, `nota avulsa não escreve em ${table}`);
    }
  } finally { await db.close(); }
});

test('API de nota avulsa recusa sessão, perfil divergente e corpo acima do limite', async () => {
  let saves = 0;
  const access = { authenticated: true, boundary: { companyId, userId: actorId, moduleId: 'vendas', userActive: true, membershipActive: true, companyActive: true, moduleActive: true }, effectivePermissions: { 'fiscal.prepare': true } };
  const runtime = { configured: true, accessResolver: { resolve: async () => access }, standaloneFiscalService: { create: async () => { saves++; return { ok: true, document: { draftId } }; } } };
  const request = (profile = companyId, body = JSON.stringify({ document: input })) => new Request(`http://localhost/api/modulos/vendas/fiscal/documents?companyId=${profile}`, { method: 'POST', body });
  assert.equal((await handleStandaloneFiscalRequest({ request: request(), runtime })).status, 200);
  assert.equal((await handleStandaloneFiscalRequest({ request: request('77777777-7777-4777-8777-777777777777'), runtime })).status, 403);
  assert.equal((await handleStandaloneFiscalRequest({ request: request(companyId, 'x'.repeat(128001)), runtime })).status, 413);
  assert.equal((await handleStandaloneFiscalRequest({ request: request(), runtime: { ...runtime, accessResolver: { resolve: async () => ({ authenticated: false }) } } })).status, 401);
  assert.equal(saves, 1);
});
