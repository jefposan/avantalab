import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { createReceivableSchedule, isValidCnpj, isValidCpf, isValidIsoDate, validateOrder, validateServiceOrder } from '../../app/vendas/lib/domain.mjs';
import { createCommercialCustomerService } from '../../app/vendas/lib/server/commercial-customer-service.mjs';
import { createCommercialReceivableService } from '../../app/vendas/lib/server/commercial-receivable-service.mjs';
import { createCommercialStockService } from '../../app/vendas/lib/server/commercial-stock-service.mjs';
import { createCommercialSupplierService } from '../../app/vendas/lib/server/commercial-supplier-service.mjs';
import { createCommercialServiceWorkflow } from '../../app/vendas/lib/server/commercial-service-workflow.mjs';
import { createCommercialSalesOrderLifecycleService } from '../../app/vendas/lib/server/commercial-sales-order-lifecycle.mjs';
import { createCommercialServiceWorkflowRequest, parseCommercialServiceWorkflowResponse } from '../../app/vendas/lib/commercial-service-workflow-bridge.mjs';
import { createServiceAttachmentOpenRequest, parseServiceAttachmentResponse } from '../../app/vendas/lib/commercial-service-attachment-bridge.mjs';

const companyId = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e';
const actorId = '20202020-2020-4020-8020-202020202020';
const fullPermissions = new Proxy({}, { get: () => true });
const context = { companyId, actorId, moduleId: 'vendas', active: true, moduleActive: true, effectivePermissions: fullPermissions };

test('datas comerciais rejeitam dias inexistentes e preservam ano bissexto', () => {
  assert.equal(isValidIsoDate('2026-02-29'), false);
  assert.equal(isValidIsoDate('2028-02-29'), true);
  assert.equal(isValidIsoDate('2026-04-31'), false);
  assert.equal(isValidIsoDate('2201-01-01'), false);
});

test('CPF e CNPJ exigem dígitos verificadores e rejeitam sequências repetidas', () => {
  assert.equal(isValidCpf('529.982.247-25'), true);
  assert.equal(isValidCpf('529.982.247-24'), false);
  assert.equal(isValidCpf('111.111.111-11'), false);
  assert.equal(isValidCnpj('48.210.380/0001-15'), true);
  assert.equal(isValidCnpj('48.210.380/0001-14'), false);
  assert.equal(isValidCnpj('00.000.000/0000-00'), false);
});

test('pedido valida sequência, parcelas e vencimento antes de aceitar estoque', () => {
  const result = validateOrder({
    client: 'Cliente', paymentMethod: 'pix', reserveStock: true, fiscalDocument: 'nfe',
    orderDate: '2026-09-10', deliveryDate: '2026-09-09', installments: 121, firstDueDate: '2026-09-08',
    items: [{ name: 'Produto', kind: 'produto', quantity: 2, unitPrice: 10, available: 1, fiscalStatus: 'Completo' }],
  });
  assert.equal(result.ready, false);
  assert.match(result.errors.join(' '), /entrega não pode ocorrer antes/i);
  assert.match(result.errors.join(' '), /1 a 120 parcelas/i);
  assert.match(result.errors.join(' '), /vencimento não pode ser anterior/i);
  assert.match(result.errors.join(' '), /estoque disponível insuficiente/i);
});

test('ordem de serviço valida calendário, relógio e vencimento', () => {
  const result = validateServiceOrder({
    client: 'Cliente', scheduledDate: '2026-02-29', scheduledTime: '25:00', technician: 'Ana', paymentMethod: 'pix', installments: 1, firstDueDate: '2026-02-28', fiscalDocument: 'nfse',
    items: [{ name: 'Serviço', kind: 'servico', quantity: 1, unitPrice: 100, municipalServiceCode: '17.01', fiscalStatus: 'Completo' }],
  });
  assert.equal(result.ready, false);
  assert.match(result.errors.join(' '), /data válida/i);
  assert.match(result.errors.join(' '), /horário válido/i);
});

test('parcelamento preserva fechamento do mês e soma exatamente o total', () => {
  const schedule = createReceivableSchedule({ total: 100, installments: 3, firstDueDate: '2028-01-31' });
  assert.equal(schedule.valid, true);
  assert.deepEqual(schedule.items.map((row) => row.dueDate), ['2028-01-31', '2028-02-29', '2028-03-31']);
  assert.equal(Number(schedule.items.reduce((sum, row) => sum + row.value, 0).toFixed(2)), 100);
  assert.equal(createReceivableSchedule({ total: 10, installments: 2, firstDueDate: '2026-02-29' }).valid, false);
});

test('cliente direto aceita CPF válido e permanece vinculado ao perfil', async () => {
  let saved;
  const service = createCommercialCustomerService({ repository: {
    list: async () => [],
    create: async (input) => { saved = input; return { id: '30303030-3030-4030-8030-303030303030', ...input, version: 1 }; },
  } });
  const result = await service.create({ context, input: {
    documentType: 'cpf', document: '529.982.247-25', legalName: 'Maria da Silva', displayName: 'Maria da Silva',
    stateRegistrationIndicator: 'nao_contribuinte', email: 'maria@example.com', phone: '11999999999',
    postalCode: '01310100', street: 'Avenida Paulista', number: '100', district: 'Bela Vista', city: 'São Paulo', cityCode: '3550308', state: 'SP',
  } });
  assert.equal(result.ok, true);
  assert.equal(saved.companyId, companyId);
  assert.equal(saved.actorId, actorId);
  assert.equal(saved.documentType, 'cpf');
});

test('recebimento bloqueia data futura, valor inválido e falta de permissão', async () => {
  let calls = 0;
  const service = createCommercialReceivableService({ repository: { list: async () => [], move: async () => { calls += 1; return {}; } } });
  const base = { context, receivableId: '30303030-3030-4030-8030-303030303030', expectedVersion: 1, idempotencyKey: 'receipt:unique:1', type: 'recebimento', amount: 10, method: 'pix', account: 'Conta', description: '' };
  const future = await service.move({ ...base, date: '2200-01-01' });
  assert.equal(future.ok, false);
  const zero = await service.move({ ...base, date: '2026-09-01', amount: 0 });
  assert.equal(zero.ok, false);
  const denied = await service.move({ ...base, date: '2026-09-01', context: { ...context, effectivePermissions: {} } });
  assert.equal(denied.ok, false);
  assert.equal(calls, 0);
});

test('estoque valida referências, validade e mantém empresa/autor no comando', async () => {
  let moved;
  const service = createCommercialStockService({ repository: { list: async () => [], move: async (input) => { moved = input; return { movement: {}, balance: {} }; } } });
  const base = { context, productId: '30303030-3030-4030-8030-303030303030', localId: '40404040-4040-4040-8040-404040404040', idempotencyKey: 'stock:unique:1', mode: 'entrada', amount: 2, date: '2026-09-01', nature: 'Compra de fornecedor', partner: { name: 'Fornecedor' }, document: 'NF 123', lot: 'A', expiry: '2027-01-01' };
  assert.equal((await service.move({ ...base, document: '' })).ok, false);
  assert.equal((await service.move({ ...base, expiry: '2026-08-31' })).ok, false);
  assert.equal((await service.move(base)).ok, true);
  assert.equal(moved.companyId, companyId);
  assert.equal(moved.actorId, actorId);
});

test('fornecedor exige CNPJ correto quando informado e usa o perfil empresarial', async () => {
  let saved;
  const service = createCommercialSupplierService({ repository: { list: async () => [], create: async (input) => { saved = input; return { supplier: input, reused: false }; } } });
  assert.equal((await service.create({ context, input: { name: 'Fornecedor', document: '48.210.380/0001-14' } })).ok, false);
  assert.equal((await service.create({ context, input: { name: 'Fornecedor', document: '48.210.380/0001-15', email: 'compras@example.com', phone: '1133334444' } })).ok, true);
  assert.equal(saved.companyId, companyId);
  assert.equal(saved.actorId, actorId);
});

test('ciclo de serviços exige permissões e preserva empresa, autor e idempotência', async () => {
  let completed;
  const workflow = createCommercialServiceWorkflow({
    issuerResolver: async () => ({ establishmentId: '30303030-3030-4030-8030-303030303030' }),
    repository: {
      start: async () => ({}), cancel: async () => ({}),
      complete: async (input) => { completed = input; return { operationVersion: 4, receivableCount: 2 }; },
    },
  });
  const base = { action: 'complete', orderId: '30303030-3030-4030-8030-303030303030', expectedVersion: 3,
    idempotencyKey: 'service:complete:3', localId: '40404040-4040-4040-8040-404040404040',
    input: { actualDurationMinutes: 90, notes: 'Serviço conferido.', laborCost: 50, acceptanceStatus: 'aceito', acceptedBy: 'Cliente', materials: [], checklist: [] } };
  assert.equal((await workflow.advance({ ...base, context: { ...context, effectivePermissions: {} } })).ok, false);
  const result = await workflow.advance({ ...base, context });
  assert.equal(result.ok, true);
  assert.equal(completed.companyId, companyId);
  assert.equal(completed.actorId, actorId);
  assert.equal(completed.idempotencyKey, 'service:complete:3');
  assert.equal(completed.completion.localId, '40404040-4040-4040-8040-404040404040');
});

test('ponte de serviços rejeita respostas sem versão transacional', () => {
  const request = createCommercialServiceWorkflowRequest({ requestId: 'service:req:1', idempotencyKey: 'service:key:1', action: 'start', orderId: '30303030-3030-4030-8030-303030303030', expectedVersion: 1 });
  assert.equal(request?.type, 'AVANTALAB_VENDAS_SERVICE_WORKFLOW_REQUEST_V1');
  assert.equal(parseCommercialServiceWorkflowResponse({ type: 'AVANTALAB_VENDAS_SERVICE_WORKFLOW_RESPONSE_V1', requestId: 'service:req:1', ok: true, result: {} }), null);
  assert.equal(parseCommercialServiceWorkflowResponse({ type: 'AVANTALAB_VENDAS_SERVICE_WORKFLOW_RESPONSE_V1', requestId: 'service:req:1', ok: true, result: { operationVersion: 2 } })?.ok, true);
});

test('conclusão de serviço mantém ordem, estoque, parcelas e NFS-e na mesma transação', async () => {
  const source = await readFile(new URL('../../app/vendas/lib/server/commercial-service-workflow.mjs', import.meta.url), 'utf8');
  assert.match(source, /set transaction isolation level serializable/);
  assert.match(source, /vendas_os_materiais/);
  assert.match(source, /vendas_estoque_movimentos/);
  assert.match(source, /vendas_contas_receber/);
  assert.match(source, /vendas_fiscal_rascunhos/);
  assert.match(source, /rollback/);
});

test('devolução faturada exige permissões de estoque, financeiro e fiscal', async () => {
  let calls = 0;
  const service = createCommercialSalesOrderLifecycleService({ repository: {
    confirm: async () => ({}), startSeparation: async () => ({}), cancel: async () => ({}),
    returnInvoiced: async () => { calls += 1; return { operationVersion: 5 }; },
  } });
  const command = { orderId: '30303030-3030-4030-8030-303030303030', expectedVersion: 4, idempotencyKey: 'order:return:4' };
  assert.equal((await service.returnInvoiced({ ...command, context: { ...context, effectivePermissions: { 'sales.cancel': true, 'stock.adjust': true } } })).ok, false);
  assert.equal((await service.returnInvoiced({ ...command, context })).ok, true);
  assert.equal(calls, 1);
});

test('estornos fiscais usam marcador imutável separado do rascunho original', async () => {
  const sql = await readFile(new URL('../../supabase/migrations/20260906213000_vendas_estornos_integrados.sql', import.meta.url), 'utf8');
  assert.match(sql, /vendas_fiscal_rascunho_cancelamentos/);
  assert.match(sql, /vendas_rejeitar_alteracao_imutavel/);
  assert.match(sql, /force row level security/i);
  assert.doesNotMatch(sql, /update\s+public\.vendas_fiscal_rascunhos/i);
});

test('anexos de serviço são privados, limitados no banco e abertos por URL temporária', async () => {
  const sql = await readFile(new URL('../../supabase/migrations/20260906213000_vendas_estornos_integrados.sql', import.meta.url), 'utf8');
  const route = await readFile(new URL('../../app/api/modulos/vendas/commercial/services/attachments/route.ts', import.meta.url), 'utf8');
  assert.match(sql, /'vendas-os-anexos'[\s\S]*false[\s\S]*10485760/i);
  assert.match(sql, /vendas_validar_limite_anexos_os/);
  assert.match(sql, /count\(\*\)[\s\S]*>= 5/);
  assert.match(route, /validSignature/);
  assert.match(route, /createSignedUrl\([^,]+, 300\)/);
  assert.match(route, /checksum_sha256/);
  const open = createServiceAttachmentOpenRequest({ requestId: 'attachment:open:1', attachmentId: '30303030-3030-4030-8030-303030303030' });
  assert.equal(open?.type, 'AVANTALAB_VENDAS_SERVICE_ATTACHMENT_OPEN_REQUEST_V1');
  assert.equal(parseServiceAttachmentResponse({ type: 'AVANTALAB_VENDAS_SERVICE_ATTACHMENT_OPEN_RESPONSE_V1', requestId: 'attachment:open:1', ok: true, url: 'https://example.com/signed' })?.ok, true);
});

test('recarga de operações recompõe itens e toda a execução da ordem de serviço', async () => {
  const source = await readFile(new URL('../../app/vendas/lib/server/commercial-operation-repository.mjs', import.meta.url), 'utf8');
  assert.match(source, /vendas_operacao_itens/);
  assert.match(source, /vendas_ordens_servico/);
  assert.match(source, /vendas_os_checklist/);
  assert.match(source, /vendas_os_materiais/);
  assert.match(source, /vendas_os_anexos/);
  assert.match(source, /serviceOrder:\s*mapServiceOrder/);
});

test('perfil integrado não reutiliza contadores nem indicadores demonstrativos', async () => {
  const [source, integrated, page] = await Promise.all([
    readFile(new URL('../../app/vendas/sistema/VendasServicosPrototype.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../app/vendas/VendasIntegrado.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../app/vendas/sistema/page.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(source, /salesRecordCount = created\.filter/);
  assert.match(source, /serviceRecordCount = created\.filter/);
  assert.match(source, /fiscalDocumentCount = fiscalDraftRecords\.length/);
  assert.match(source, /connected \? 0 : 9360/);
  assert.match(source, /connected \? 0 : 2260/);
  assert.match(source, /managementCatalogBridge \? salesRecordCount/);
  assert.match(source, /managementCatalogBridge \? fiscalDocumentCount/);
  assert.match(source, /connected\.company\) setFiscalIssuerRegistry\(createFiscalIssuerRegistry\(connected\.company\)\)/);
  assert.match(source, /integratedQuickActions = dashboardNewOptions\.filter\(\(option\) => option\.type !== 'venda'\)/);
  assert.match(source, /!managementCatalogBridge \|\| !\['venda', 'nfe', 'nfce', 'nfse'\]\.includes\(option\.type\)/);
  assert.match(source, /connected \? 'Operação vinculada ao perfil\.' : 'Ambiente de demonstração\.'/);
  assert.match(source, /connected \? 'Perfil empresarial' : 'Proposta local'/);
  assert.match(source, /managementProfileReady = !integratedManagementRuntime \|\| Boolean\(managementCatalogBridge\?\.company\)/);
  assert.match(source, /managementAccessReady = !integratedManagementRuntime \|\| accessBridgeState\.available/);
  assert.match(source, /let parentOrigin = window\.location\.origin/);
  assert.match(source, /if \(document\.referrer\) parentOrigin = new URL\(document\.referrer\)\.origin/);
  assert.match(integrated, /setPerfilCadastro\(\(current\) => String\(current\?\.empresa_id \|\| ''\) === perfilId \? current : null\)/);
  assert.match(integrated, /const respostaPerfil = await aguardarComLimite\(fetch\(`\/api\/perfil-cadastro/);
  assert.doesNotMatch(integrated, /buscarEmpresasDoUsuario/);
  assert.match(integrated, /UUID_PATTERN\.test\(solicitado\)/);
  assert.match(integrated, /setCorPrimaria\(typeof perfil\.corPrimaria/);
  assert.match(integrated, /aguardarComLimite\(supabase\.auth\.getSession\(\), 10_000/);
  assert.match(integrated, /20_000, 'A confirmação do perfil demorou mais que o esperado/);
  assert.match(integrated, />Tentar novamente<\/button>/);
  assert.match(integrated, /if \(iframeRef\.current\?\.contentWindow\) \{[\s\S]*void Promise\.all/);
  assert.match(integrated, /!perfilPronto \? <div/);
  assert.match(page, /integratedManagementRuntime=\{bridge === 'gestao' \|\| bridge === 'gestao-local'\}/);
});

test('cadastro empresarial consulta CNPJ e CEP reais e preserva o formulário até confirmação', async () => {
  const [source, cepRoute] = await Promise.all([
    readFile(new URL('../../app/vendas/sistema/VendasServicosPrototype.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/cep/route.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(source, /fetch\('\/api\/consultas\/cnpj'/);
  assert.match(source, /fetch\(`\/api\/cep\?cep=\$\{digits\}`/);
  assert.match(source, /if \(!connected\) \{[\s\S]*demoCnpjDirectory/);
  assert.match(source, /Consulta cadastral integrada/);
  assert.match(source, /const result = await onSave\(saved\);[\s\S]*if \(result\.ok\) \{[\s\S]*onClose\(\)/);
  assert.match(source, /pendingCustomerRef\.current\.set\(requestId, \{ timer, resolve \}\)/);
  assert.match(source, /pendingSupplierRef\.current\.set\(requestId, \{ timer, resolve \}\)/);
  assert.match(cepRoute, /codigoIbge: String\(dados\.ibge/);
});

test('cliente usa operações e recebimentos do perfil, sem relatório demonstrativo', async () => {
  const source = await readFile(new URL('../../app/vendas/sistema/VendasServicosPrototype.tsx', import.meta.url), 'utf8');
  const start = source.indexOf('function ClientReportDialog');
  const end = source.indexOf('function ClientRecordActions', start);
  const report = source.slice(start, end);
  assert.match(source, /function clientOperationSnapshot\(client: ClientRecord, records: CreatedRecord\[\], financialRecords: ReceivableRecord\[\]\)/);
  assert.match(report, /clientOperationSnapshot\(client, createdRecords, receivableRecords\)/);
  assert.doesNotMatch(report, /commercialRecords|serviceOrders|receivables\.filter/);
  assert.match(report, /Pedidos faturados e serviços concluídos/);
  assert.match(source, /createdRecords=\{created\} receivableRecords=\{receivableRecords\}/);
});

test('ações integradas aguardam confirmação e não mantêm registro comercial apenas no navegador', async () => {
  const source = await readFile(new URL('../../app/vendas/sistema/VendasServicosPrototype.tsx', import.meta.url), 'utf8');
  assert.match(source, /pendingReceivableRef\.current\.set\(requestId,\{timer,resolve\}\)/);
  assert.match(source, /pendingStockRef\.current\.set\(requestId,\{timer,resolve\}\)/);
  assert.match(source, /if \(!managementCatalogBridge\) writeCompanyStorage\(STORAGE_KEY/);
  assert.match(source, /O registro só permanecerá após a Gestão confirmar o vínculo com o perfil ativo/);
  assert.match(source, /setCreated\(\(current\) => current\.filter\(\(record\) => record\.id !== pending\.recordId \|\| Boolean\(record\.persistence\)\)\)/);
  assert.match(source, /saving \? 'Confirmando…'/);
});

test('migração operacional isola dados por empresa, protege RLS e sincroniza receita por caixa', async () => {
  const sql = await readFile(new URL('../../supabase/migrations/20260906210000_vendas_operacao_integrada.sql', import.meta.url), 'utf8');
  assert.match(sql, /vendas_fornecedores[\s\S]*empresa_id uuid not null references public\.empresas/i);
  assert.match(sql, /alter table public\.vendas_fornecedores force row level security/i);
  assert.match(sql, /recurso_tipo in \('cliente','fornecedor'/i);
  assert.match(sql, /set default \(\(now\(\) at time zone 'America\/Sao_Paulo'\)::date\)/i);
  assert.match(sql, /when 'recebimento' then evento\.valor when 'estorno_recebimento' then -evento\.valor/i);
  assert.match(sql, /vendas_receitas_gestao[\s\S]*primary key \(empresa_id,competencia\)/i);
  assert.match(sql, /produto\.tipo_item,'produto'\)='produto'/i);
  assert.doesNotMatch(sql, /empresa_id\s+uuid[^\n]*references auth\.users/i);
});

test('rotas protegidas existem para clientes, fornecedores, operações, estoque, recebimentos e serviços', async () => {
  const files = await Promise.all(['customers', 'suppliers', 'operations', 'stock', 'receivables'].map((name) => readFile(new URL(`../../app/api/modulos/vendas/commercial/${name}/route.ts`, import.meta.url), 'utf8')));
  for (const source of files) {
    assert.match(source, /getFiscalStatusRuntime/);
    assert.match(source, /companyId/);
  }
  const serviceRoute = await readFile(new URL('../../app/api/modulos/vendas/commercial/services/workflow/route.ts', import.meta.url), 'utf8');
  assert.match(serviceRoute, /getFiscalStatusRuntime/);
  assert.match(serviceRoute, /handleCommercialServiceWorkflowRequest/);
});
