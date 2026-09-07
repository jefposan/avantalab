import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CODIGOS_PERMISSOES_VENDAS,
  GRUPOS_PERMISSOES_VENDAS,
  PERMISSOES_VENDAS_POR_PERFIL,
  PERMISSOES_VENDAS_PROTEGIDAS,
  permissaoVendasConhecida,
  resolverPermissoesVendas,
} from '../../app/modules/vendas/permissions.ts';
import {
  mapearItemCustosParaVendas,
  montarCatalogoVendasDTO,
} from '../../app/modules/vendas/catalog.ts';
import { parseManagementCatalogMessage } from '../../app/vendas/lib/management-catalog-bridge.mjs';
import { parseAccessSnapshotMessage } from '../../app/vendas/lib/access-settings-bridge.mjs';
test('contrato distingue Vendas da Gestão do Vendas Mobile', async () => {
  const manifesto = await readFile('app/modules/vendas/manifest.ts', 'utf8');
  assert.match(manifesto, /VENDAS_MODULE_ID = 'vendas'/);
  assert.match(manifesto, /rota: '\/vendas'/);
  assert.match(manifesto, /dependencias: \['custos'\]/);
  assert.match(manifesto, /estado: 'piloto_tridium_instalavel'/);
});

test('cabeçalho integrado mantém somente Início, marca e Ajustes', async () => {
  const [integracao, sistema] = await Promise.all([
    readFile('app/vendas/VendasIntegrado.tsx', 'utf8'),
    readFile('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8'),
  ]);
  assert.doesNotMatch(integracao, /vendas-perfil|vendas-lab-tabela|Origem do catálogo|Atualizar catálogo/);
  assert.match(integracao, /companyId=\$\{encodeURIComponent\(empresaId\)\}/);
  assert.match(integracao, /className="block h-screen min-h-\[620px\] w-full border-0 bg-white"/);
  assert.match(sistema, /<header className="topbar">[\s\S]*className="module-exit"[\s\S]*className="module-brand"[\s\S]*className="topbar-actions"[\s\S]*module-settings-button/);
  assert.match(sistema, /const gestaoHref = managementCatalogBridge\?\.companyId/);
  assert.doesNotMatch(sistema, /AccessSessionSwitcher|Usuário em teste|prototype-pill|Protótipo local/);
});

test('Vendas deriva sua identidade da cor primária do perfil empresarial', async () => {
  const [integracao, sistema, estilos, perfilCadastro] = await Promise.all([
    readFile('app/vendas/VendasIntegrado.tsx', 'utf8'),
    readFile('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8'),
    readFile('app/vendas/sistema/vendas.css', 'utf8'),
    readFile('app/api/perfil-cadastro/route.ts', 'utf8'),
  ]);
  assert.match(integracao, /corPrimaria/);
  assert.match(perfilCadastro, /cor_primaria/);
  assert.match(sistema, /--av-profile-primary/);
  assert.match(estilos, /--av-blue-900:\s*var\(--av-profile-primary/);
  assert.match(estilos, /color-mix\(in srgb, var\(--av-profile-primary/);

  const base = { versao: 1, origem: 'custos_precificacao', somenteLeitura: true, estoqueIntegrado: false, empresaId: 'empresa-1', itens: [] };
  assert.equal(parseManagementCatalogMessage({ type: 'AVANTALAB_VENDAS_CATALOGO_V1', catalogo: base, corPrimaria: '#A45E21' })?.primaryColor, '#a45e21');
  assert.equal(parseManagementCatalogMessage({ type: 'AVANTALAB_VENDAS_CATALOGO_V1', catalogo: base, corPrimaria: 'red; color: white' })?.primaryColor, '#003e73');
});

test('perfil empresarial chega ao módulo mesmo quando o catálogo ainda está indisponível', async () => {
  const companyId = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e';
  const bridge = parseManagementCatalogMessage({
    type: 'AVANTALAB_VENDAS_CATALOGO_V1',
    catalogoDisponivel: false,
    mensagem: 'Catálogo em preparação.',
    catalogo: { versao: 1, origem: 'custos_precificacao', somenteLeitura: true, estoqueIntegrado: false, empresaId: companyId, itens: [] },
    perfil: { empresa_id: companyId, nome_fantasia: 'Tridium', razao_social: 'Tridium Ltda.', documento: '16978862000123', cidade: 'São Paulo', estado: 'SP', regime_tributario: 'simples_nacional' },
  });
  assert.equal(bridge?.company?.name, 'Tridium');
  assert.equal(bridge?.company?.taxRegime, 'Simples Nacional');
  assert.equal(bridge?.companyId, companyId);
  assert.equal(bridge?.catalogAvailable, false);
  assert.equal(bridge?.message, 'Catálogo em preparação.');
  assert.deepEqual(bridge?.items, []);

  const [integrationSource, moduleSource] = await Promise.all([
    readFile('app/vendas/VendasIntegrado.tsx', 'utf8'),
    readFile('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8'),
  ]);
  assert.match(integrationSource, /catalogoDisponivel: Boolean\(catalogo\)/);
  assert.match(integrationSource, /catalogo: catalogoDoPerfil/);
  assert.match(moduleSource, /setClientRecords\(\[\]\)[\s\S]*setCatalogRecords\(\[\]\)[\s\S]*setFiscalDraftRecords\(\[\]\)/);
  assert.match(moduleSource, /Os dados comerciais permanecem ocultos até a Gestão confirmar o perfil selecionado/);
  assert.match(moduleSource, /managementContextReady && activeUser\?\.active/);
});

test('matriz possui códigos únicos e cobre todas as áreas do protótipo', () => {
  assert.equal(new Set(CODIGOS_PERMISSOES_VENDAS).size, CODIGOS_PERMISSOES_VENDAS.length);
  assert.equal(CODIGOS_PERMISSOES_VENDAS.length, 45);
  assert.deepEqual(
    GRUPOS_PERMISSOES_VENDAS.map((grupo) => grupo.id),
    ['painel', 'vendas', 'servicos', 'clientes', 'catalogo', 'estoque', 'fiscal', 'recebimentos', 'relatorios', 'sistema'],
  );
  assert.equal(permissaoVendasConhecida('fiscal.documents.xml.download'), true);
  assert.equal(permissaoVendasConhecida('sales.invoice'), true);
  assert.equal(permissaoVendasConhecida('fiscal.unknown'), false);
});

test('tipos padrão e exceções seguem perfil, depois usuário', () => {
  const simples = resolverPermissoesVendas('operador_simples');
  assert.equal(simples['sales.create'], true);
  assert.equal(simples['sales.cancel'], false);
  assert.equal(simples['fiscal.issue'], false);

  const porPerfil = resolverPermissoesVendas('operador_simples', { 'sales.cancel': 'allow' });
  assert.equal(porPerfil['sales.cancel'], true);

  const porUsuario = resolverPermissoesVendas(
    'operador_simples',
    { 'sales.cancel': 'allow' },
    { 'sales.cancel': 'deny', 'fiscal.issue': 'allow' },
  );
  assert.equal(porUsuario['sales.cancel'], false);
  assert.equal(porUsuario['fiscal.issue'], true);
});

test('gestor e administrador preservam todas as permissões críticas', () => {
  for (const perfil of ['gestor_master', 'administrador']) {
    for (const codigo of PERMISSOES_VENDAS_PROTEGIDAS) {
      assert.equal(PERMISSOES_VENDAS_POR_PERFIL[perfil].includes(codigo), true);
    }
  }
  assert.equal(PERMISSOES_VENDAS_POR_PERFIL.operador_completo.includes('fiscal.documents.xml.download'), false);
  assert.equal(PERMISSOES_VENDAS_POR_PERFIL.operador_completo.includes('fiscal.documents.danfe.download'), true);
});

test('ponte integrada fixa as permissões no usuário autenticado da Gestão', () => {
  const activeUserId = '10e4763a-8652-4645-9abd-af292b81d639';
  const otherUserId = 'fc72b208-edad-4e79-99cb-5a62fe10a485';
  const snapshot = parseAccessSnapshotMessage({
    type: 'AVANTALAB_VENDAS_ACCESS_SNAPSHOT_V1',
    snapshot: {
      available: true,
      writable: true,
      activeUserId,
      roles: [
        { id: 'gestor', permissions: PERMISSOES_VENDAS_POR_PERFIL.gestor_master },
        { id: 'administrador', permissions: PERMISSOES_VENDAS_POR_PERFIL.administrador },
        { id: 'operador_completo', permissions: PERMISSOES_VENDAS_POR_PERFIL.operador_completo },
        { id: 'operador_simples', permissions: PERMISSOES_VENDAS_POR_PERFIL.operador_simples },
      ],
      users: [
        { id: otherUserId, name: 'Outro usuário', roleId: 'operador_completo', active: true },
        { id: activeUserId, name: 'Usuário autenticado', roleId: 'gestor', active: true },
      ],
      audit: [],
    },
  });
  assert.equal(snapshot?.activeUserId, activeUserId);
  assert.equal(snapshot?.users[0].id, otherUserId);

  const forged = parseAccessSnapshotMessage({
    type: 'AVANTALAB_VENDAS_ACCESS_SNAPSHOT_V1',
    snapshot: {
      available: true,
      writable: true,
      activeUserId: '7292f312-f399-4ec3-b4e4-b4c92c177398',
      roles: snapshot?.roles,
      users: snapshot?.users,
      audit: [],
    },
  });
  assert.equal(forged?.activeUserId, '');
});

test('equipe comercial e técnica deriva dos usuários ativos do perfil', async () => {
  const source = await readFile('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8');
  assert.match(source, /activeTeam = snapshot\.users\.filter\(\(user\) => user\.active\)/);
  assert.match(source, /user\.id === snapshot\.activeUserId && user\.active/);
  assert.match(source, /sellers: activeTeam\.length \? activeTeam : settings\.commercial\.sellers/);
  assert.match(source, /technicians: activeTeam\.length \? activeTeam : settings\.services\.technicians/);
  assert.match(source, /defaultSeller: authenticatedName/);
  assert.match(source, /defaultTechnician: authenticatedName/);
});

test('API é server-side, exige gestão e registra o módulo com página oficial', async () => {
  const [api, dal, registro, sql] = await Promise.all([
    readFile('app/api/modulos/permissoes/route.ts', 'utf8'),
    readFile('app/lib/permissoes-modulos-servidor.ts', 'utf8'),
    readFile('app/lib/modulos-registro.ts', 'utf8'),
    readFile('supabase/migrations/20260905151000_vendas_permissoes.sql', 'utf8'),
  ]);
  assert.match(api, /autenticarPerfilCobranca\(request, empresaId, true\)/);
  assert.match(api, /Cache-Control': 'no-store/);
  assert.match(dal, /import 'server-only'/);
  assert.match(registro, /id:\s*'vendas',/);
  assert.match(registro, /rota: '\/vendas'/);
  assert.match(sql, /force row level security/);
  assert.match(sql, /module_permission_audit_immutable/);
  assert.match(sql, /revoke all .* authenticated/);
});

test('catálogo de Custos entrega ao Vendas somente itens publicados e DTO mínimo', () => {
  const produto = mapearItemCustosParaVendas({
    id: 'produto-1', sku: 'PRD-001', tipo_item: 'produto', nome: 'Produto integrado',
    descricao: 'Descrição', categoria: 'Acabados', preco_custo: 18.5, preco_venda: 39.9,
    unidade: 'un', ncm: '12345678', origem_mercadoria: '0 - Nacional', unidade_tributavel: 'un',
    cfop_padrao: '5102', csosn: '102', cst_pis: '49', cst_cofins: '49', atualizado_em: '2026-09-03T12:00:00Z',
  }, 44.9);
  assert.equal(produto.preco, 44.9);
  assert.equal(produto.situacaoFiscal, 'Completo');
  assert.equal(Object.hasOwn(produto, 'preco_custo'), false);
  assert.equal(Object.hasOwn(produto, 'precoCusto'), false);

  const dto = montarCatalogoVendasDTO({
    empresaId: 'empresa-1', catalogoId: 'catalogo-1',
    tabela: { id: 'tabela-1', nome: 'Atacado', padrao: false },
    tabelas: [{ id: 'tabela-1', nome: 'Atacado', padrao: false }],
    produtos: [{ id: 'produto-1', sku: 'PRD-001', nome: 'Produto integrado', preco_venda: 39.9 }],
    precos: { 'produto-1': 44.9 }, agora: '2026-09-03T12:00:00Z',
  });
  assert.equal(dto.somenteLeitura, true);
  assert.equal(dto.estoqueIntegrado, false);
  assert.equal(dto.itens[0].preco, 44.9);
});

test('catálogo oficial exige sessão, empresa piloto e módulo instalado', async () => {
  const [rota, servico, pagina, cliente] = await Promise.all([
    readFile('app/api/modulos/vendas/catalogo/route.ts', 'utf8'),
    readFile('app/modules/vendas/services/catalogo-servidor.ts', 'utf8'),
    readFile('app/vendas/page.tsx', 'utf8'),
    readFile('app/vendas/VendasIntegrado.tsx', 'utf8'),
  ]);
  assert.match(rota, /autenticarPerfilCobranca\(request, empresaId\)/);
  assert.match(rota, /moduloDisponivelParaEmpresa\('vendas', empresaId\)/);
  assert.match(rota, /eq\('modulo_id', 'vendas'\)/);
  assert.match(rota, /Cache-Control': 'no-store, private/);
  assert.match(servico, /import 'server-only'/);
  assert.match(servico, /eq\('ativo', true\)/);
  assert.match(servico, /eq\('disponivel_catalogo', true\)/);
  assert.doesNotMatch(servico, /preco_custo/);
  assert.match(pagina, /VendasIntegrado/);
  assert.match(cliente, /postMessage/);
  assert.match(cliente, /AVANTALAB_VENDAS_CATALOGO_V1/);
});

test('catálogo indisponível em Custos usa apenas o laboratório local protegido', async () => {
  const route = await readFile('app/api/modulos/vendas/catalogo/route.ts', 'utf8');
  assert.match(route, /\[403, 404\]\.includes\(error\.status\)/);
  assert.match(route, /encaminharFiscalLab/);
  assert.match(route, /\/api\/commercial\/catalog\?/);
  assert.match(route, /if \(laboratorio\.ok\) return laboratorio/);
});

test('ponte de permissões mantém token na Gestão e escrita remota desligada por padrão', async () => {
  const clienteLab = await readFile('app/vendas-lab/VendasCatalogoLab.tsx', 'utf8');
  assert.match(clienteLab, /AVANTALAB_VENDAS_ACCESS_READY_V1/);
  assert.match(clienteLab, /AVANTALAB_VENDAS_ACCESS_SNAPSHOT_V1/);
  assert.match(clienteLab, /AVANTALAB_VENDAS_ACCESS_SAVE_REQUEST_V1/);
  assert.match(clienteLab, /NEXT_PUBLIC_VENDAS_LAB_PERMISSION_WRITES === 'true'/);
  assert.match(clienteLab, /Authorization: `Bearer \$\{token\}`/);
  assert.match(clienteLab, /normalizarSnapshotPermissoes/);
  assert.doesNotMatch(clienteLab, /postMessage\(\{[^}]*token/s);
});

test('confirmação da NF-e reserva número pela ponte protegida e idempotente', async () => {
  const [clienteLab, route, handler] = await Promise.all([
    readFile('app/vendas/VendasIntegrado.tsx', 'utf8'),
    readFile('app/api/modulos/vendas/fiscal/documents/[artifactId]/number/route.ts', 'utf8'),
    readFile('app/vendas/lib/server/commercial-nfe-number-reservation-http.mjs', 'utf8'),
  ]);
  assert.match(clienteLab, /AVANTALAB_VENDAS_FISCAL_NUMBER_REQUEST_V1/);
  assert.match(clienteLab, /expectedVersion/);
  assert.match(route, /handleCommercialNfeNumberReservationRequest/);
  assert.match(handler, /KEY_PATTERN\.test\(idempotencyKey\)/);
  assert.match(handler, /expectedVersion/);
  assert.doesNotMatch(clienteLab, /postMessage\(\{[^}]*\b(?:token|access_token|certificatePassword|privateKey)\b[^}]*\}/s);
});

test('continuação da NF-e usa um único comando protegido para conferir, assinar e transmitir', async () => {
  const [clienteLab, route, handler] = await Promise.all([
    readFile('app/vendas/VendasIntegrado.tsx', 'utf8'),
    readFile('app/api/modulos/vendas/fiscal/documents/[artifactId]/continue/route.ts', 'utf8'),
    readFile('app/vendas/lib/server/commercial-nfe-automatic-issuance-http.mjs', 'utf8'),
  ]);
  assert.match(clienteLab, /AVANTALAB_VENDAS_FISCAL_ISSUE_REQUEST_V1/);
  assert.match(clienteLab, /FISCAL_ISSUE_RESPONSE_TYPE/);
  assert.match(clienteLab, /event\.ports\[0\]/);
  assert.match(route, /handleCommercialNfeAutomaticIssuanceRequest/);
  assert.match(handler, /KEY_PATTERN\.test\(idempotencyKey\)/);
  assert.match(handler, /expectedVersion/);
  assert.doesNotMatch(clienteLab, /postMessage\(\{[^}]*\b(?:xml|accessKey|token|certificate|privateKey)\b[^}]*\}/s);
  assert.doesNotMatch(clienteLab, /FISCAL_SIGNING_READINESS_REQUEST_TYPE|FISCAL_SIGN_REQUEST_TYPE/);
});

test('revisão da rejeição encaminha somente NCM e não dispara transmissão', async () => {
  const [clienteLab, route, handler] = await Promise.all([
    readFile('app/vendas/VendasIntegrado.tsx', 'utf8'),
    readFile('app/api/modulos/vendas/fiscal/documents/[artifactId]/correction/route.ts', 'utf8'),
    readFile('app/vendas/lib/server/commercial-nfe-rejection-correction-http.mjs', 'utf8'),
  ]);
  assert.match(clienteLab, /AVANTALAB_VENDAS_FISCAL_CORRECTION_REQUEST_V1/);
  assert.match(route, /handleCommercialNfeRejectionCorrectionRequest/);
  assert.match(handler, /NFE_REJECTION_CORRECTION_CONFIRMATION/);
  assert.match(handler, /changes: body\.changes/);
  assert.match(handler, /KEY_PATTERN\.test\(idempotencyKey\)/);
  assert.doesNotMatch(route, /continue|certificate|signedXml|accessKey/);
});

test('cancelamento da NF-e autorizada exige justificativa e confirmação explícita', async () => {
  const [clienteLab, route, handler] = await Promise.all([
    readFile('app/vendas/VendasIntegrado.tsx', 'utf8'),
    readFile('app/api/modulos/vendas/fiscal/documents/[artifactId]/cancel/route.ts', 'utf8'),
    readFile('app/vendas/lib/server/commercial-nfe-cancellation-http.mjs', 'utf8'),
  ]);
  assert.match(clienteLab, /AVANTALAB_VENDAS_FISCAL_CANCELLATION_REQUEST_V1/);
  assert.match(clienteLab, /justification\.length < 15/);
  assert.match(route, /handleCommercialNfeCancellationRequest/);
  assert.match(handler, /NFE_CANCELLATION_CONFIRMATION/);
  assert.match(handler, /justification\.length < 15/);
  assert.match(handler, /KEY\.test\(idempotencyKey\)/);
  assert.doesNotMatch(route, /certificate|signedXml|accessKey/);
});

test('menu Novo inclui cadastros úteis e oculta números técnicos das notas', async () => {
  const [vendas, custosPage, custosClient, custosWorkspace] = await Promise.all([
    readFile('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8'),
    readFile('app/custos/page.tsx', 'utf8'),
    readFile('app/custos/CustosClient.tsx', 'utf8'),
    readFile('app/custos/CustosWorkspace.tsx', 'utf8'),
  ]);
  assert.match(vendas, /type: 'cliente', title: 'Cliente'/);
  assert.match(vendas, /type: 'fornecedor', title: 'Fornecedor'/);
  assert.match(vendas, /type: 'produto', title: 'Produto'/);
  assert.match(vendas, /setClientCreateOpen\(true\)/);
  assert.match(vendas, /setSupplierCreateOpen\(true\)/);
  assert.match(vendas, /SUPPLIER_STORAGE_KEY/);
  assert.match(vendas, /stock-suppliers/);
  assert.match(vendas, /\/custos\?empresaId=.*&novo=produto/);
  assert.match(vendas, /&retorno=vendas/);
  assert.match(vendas, /onOpenCosts=\{\(\) => openCosts\(\)\}/);
  assert.doesNotMatch(vendas, /A abertura direta de Custos e Precificação será habilitada/);
  assert.match(vendas, /new-selection-backdrop/);
  assert.match(vendas, /new-selection-sidebar-backdrop/);
  assert.match(vendas, /aria-label="Fechar opções de novo cadastro"/);
  assert.doesNotMatch(vendas, /Mercadorias · modelo 55|Consumidor final · modelo 65/);
  assert.match(custosPage, /initialNewType/);
  assert.match(custosPage, /returnTo=\{retorno === 'vendas'/);
  assert.match(custosClient, /initialNewType/);
  assert.match(custosClient, /returnTo === 'vendas'.*\/vendas\?empresaId=/);
  assert.match(custosClient, /returnTo === 'vendas' \? 'Voltar' : 'Início'/);
  assert.match(custosWorkspace, /iniciar\(initialNewType\)/);
});
