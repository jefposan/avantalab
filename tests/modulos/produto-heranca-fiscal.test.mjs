import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { resolverFiscalProduto, usaFiscalEmpresa } from '../../app/lib/fiscal-produto.mjs';
import { createPostgresCommercialCatalogResolver } from '../../app/vendas/lib/server/commercial-runtime-resolvers.mjs';
import { createCommercialFiscalRuleResolver } from '../../app/vendas/lib/server/commercial-fiscal-rules.mjs';
import { prepareOperation } from '../../app/vendas/lib/server/commercial-operation-service.mjs';
import { parseManagementCatalogMessage } from '../../app/vendas/lib/management-catalog-bridge.mjs';
import { evaluateCatalogTaxProfile } from '../../app/vendas/lib/tax-profile.mjs';

const companyId = '10000000-0000-4000-8000-000000000001';
const productId = '10000000-0000-4000-8000-000000000002';
const customerId = '10000000-0000-4000-8000-000000000003';
const issuer = { establishmentId: companyId, state: 'SP', taxRegime: 'simples_nacional', fiscalConfiguration: { originCode: '0', csosn: '102', pisCst: '49', cofinsCst: '49' } };
const product = { usar_fiscal_empresa: true, ncm: '33059000', unidade: 'UN' };
const rules = ['Dentro da UF','Fora da UF'].map((destination,index) => ({ id: `rule-${index}`, name: 'Venda', documentType: 'nfe', priority: 10, operation: 'Venda', destination, recipientProfile: 'Qualquer', consumerFinal: 'Qualquer', presence: 'Não presencial', issuePurpose: 'Normal', operationNature: 'Venda de mercadoria', cfopOverride: index ? '6102' : '5102', serviceIncidenceMode: 'Não aplicável', requiresStateRegistration: false, requiresMunicipalIncidence: false, active: true, reviewed: true }));
const repository = { getPublished: async ({companyId: id}) => { assert.equal(id,companyId); return {status: 'publicada', version: 1, matrixVersion: '2026.09', taxReviewConfirmed: true, taxReformReviewConfirmed: true, matrix: { reviewedBy:'Responsável', reviewedAt:'2026-11-05', documentScope: ['nfe'], rules }}; } };
const request = { companyId, documentType: 'nfe', issuer, customer: { address: {state:'SP'}, consumerFinal:true }, items:[{productId,name:'Produto',unit:'UN',fiscal:product}] };

test('novos e legados vazios herdam; códigos manuais/importados são preservados', () => {
  assert.equal(usaFiscalEmpresa(product),true);
  assert.equal(usaFiscalEmpresa({origem_mercadoria:'0 - Nacional'}),true);
  assert.equal(usaFiscalEmpresa({cst_pis:'04'}),false);
  assert.equal(usaFiscalEmpresa({origem_mercadoria:'1 - Importada'}),false);
  assert.equal(usaFiscalEmpresa({usar_fiscal_empresa:true,cst_pis:'04'}),true);
  assert.equal(resolverFiscalProduto({...product,cst_pis:'04'},issuer).pisCst,'49');
  const manual = resolverFiscalProduto({...product,usar_fiscal_empresa:false,cst_pis:'04'},issuer);
  assert.equal(manual.pisCst,'04'); assert.equal(manual.cofinsCst,'49');
  assert.equal(manual.taxableUnit,'UN'); assert.equal(manual.ncm,'33059000');
  assert.equal(resolverFiscalProduto({...product,usar_fiscal_empresa:false},{}).icmsCode,'');
});

test('herança acompanha empresa sem copiar valores; exceção muda somente campo preenchido', () => {
  const changed = {...issuer,fiscalConfiguration:{...issuer.fiscalConfiguration,cofinsCst:'04'}};
  assert.equal(resolverFiscalProduto(product,issuer).cofinsCst,'49');
  assert.equal(resolverFiscalProduto(product,changed).cofinsCst,'04');
  assert.equal(resolverFiscalProduto({...product,usar_fiscal_empresa:false,cst_cofins:'99'},changed).cofinsCst,'99');
  assert.equal(product.cst_cofins,undefined);
});

test('CFOP vem da regra da UF e aceita exceções específicas, sem ignorar erro manual', async () => {
  const resolve = createCommercialFiscalRuleResolver({repository});
  assert.equal((await resolve(request)).items[productId].cfop,'5102');
  const outside = {...request,customer:{...request.customer,address:{state:'RJ'}}};
  assert.equal((await resolve(outside)).items[productId].cfop,'6102');
  const fiscal = {...product,usar_fiscal_empresa:false,cfop_padrao:'5101',cfop_interestadual:'6101',cst_pis:'04'};
  const manual = {...request,items:[{...request.items[0],fiscal}]};
  const result = await resolve(manual);
  assert.equal(result.valid,true); assert.equal(result.items[productId].cfop,'5101'); assert.equal(result.items[productId].pisCst,'04');
  assert.equal((await resolve({...manual,customer:outside.customer})).items[productId].cfop,'6101');
  const wrong = await resolve({...manual,items:[{...manual.items[0],fiscal:{...fiscal,cfop_padrao:'6101'}}]});
  assert.equal(wrong.valid,false); assert.match(wrong.errors[0].message,/CFOP/);
  assert.equal((await resolve({...request,issuer:{...issuer,fiscalConfiguration:{}}})).valid,false);
});

test('servidor consulta padrões da empresa autenticada e rejeita outra empresa', async () => {
  const resolve = createCommercialFiscalRuleResolver({repository,issuerResolver:async ({companyId:id}) => {assert.equal(id,companyId); return issuer;}});
  assert.equal((await resolve({...request,issuer:{...issuer,fiscalConfiguration:{csosn:'500'}}})).items[productId].icmsCode,'102');
  const bad = createCommercialFiscalRuleResolver({repository,issuerResolver:async () => ({...issuer,establishmentId:customerId})});
  assert.equal((await bad(request)).valid,false);
});

test('migração preserva registros, guarda opção e exceções após recarga e mantém RLS', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table vendas_mobile_catalogo_produtos(id uuid primary key, sku text, ncm text, cst_pis text);
      alter table vendas_mobile_catalogo_produtos enable row level security;
      insert into vendas_mobile_catalogo_produtos values ('${productId}','T001','33059000','04');`);
    await db.exec(readFileSync('supabase/migrations/20261105180000_produto_heranca_fiscal_empresa.sql','utf8'));
    let row = (await db.query('select * from vendas_mobile_catalogo_produtos')).rows[0];
    assert.equal(row.usar_fiscal_empresa,null); assert.equal(usaFiscalEmpresa(row),false);
    await db.query('update vendas_mobile_catalogo_produtos set usar_fiscal_empresa=$1,cfop_interestadual=$2 where id=$3',[true,'6101',productId]);
    row = (await db.query('select * from vendas_mobile_catalogo_produtos')).rows[0];
    assert.equal(usaFiscalEmpresa(row),true); assert.equal(row.cst_pis,'04'); assert.equal(row.cfop_interestadual,'6101');
    assert.equal((await db.query("select relrowsecurity from pg_class where relname='vendas_mobile_catalogo_produtos'")).rows[0].relrowsecurity,true);
    await assert.rejects(db.query("update vendas_mobile_catalogo_produtos set cfop_interestadual='5101'"),/constraint/);
  } finally {await db.close();}
});

test('catálogo confiável e retrato comercial preservam escolha e exceções; cliente não injeta tributos', async () => {
  const pool = {query: async (sql,params) => { assert.equal(params[0],companyId); assert.match(sql,/catalog\.empresa_id=\$1/); return {rows:[{id:productId,tipo_item:'produto',sku:'T001',nome:'Produto',unidade:'UN',ncm:'33059000',preco_venda:10,usar_fiscal_empresa:false,cfop_padrao:'5101',cfop_interestadual:'6101',cst_pis:'04',controla_estoque:true}]}; }};
  const catalogResolver = createPostgresCommercialCatalogResolver({pool});
  const context = {companyId,actorId:customerId,active:true,moduleActive:true,moduleId:'vendas',effectivePermissions:{'sales.create':true}};
  const prepared = await prepareOperation({context,catalogResolver,customerResolver:async () => ({id:customerId,name:'Cliente',document:'12345678909',status:'ativo'}),input:{type:'pedido',customerId,channel:'vendas',fiscalDocument:'nfe',payment:{method:'pix',firstDueDate:'2026-11-05'},idempotencyKey:'test:inherit:001',items:[{catalogItemId:productId,quantity:1,fiscal:{pisCst:'99',useCompanyFiscal:true}}]}});
  assert.deepEqual(prepared.errors,[]);
  const fiscal = prepared.operation.items[0].fiscalSnapshot;
  assert.equal(fiscal.useCompanyFiscal,false); assert.equal(fiscal.pisCst,'04'); assert.equal(fiscal.cfopInterstate,'6101');
  assert.equal((await createCommercialFiscalRuleResolver({repository})({...request,items:[{...request.items[0],fiscal}]})).items[productId].cfop,'5101');
});

test('catálogo na Gestão exibe tributos efetivos sem exigir CFOP copiado e sem aceitar perfil alheio', () => {
  const data = {type:'AVANTALAB_VENDAS_CATALOGO_V1',perfil:{empresa_id:companyId,regime_tributario:'simples_nacional',configuracao_fiscal:{origem_mercadoria_padrao:'0',csosn:'102',cst_pis:'49',cst_cofins:'49'}},catalogo:{versao:1,origem:'custos_precificacao',somenteLeitura:true,estoqueIntegrado:false,empresaId:companyId,itens:[{id:productId,sku:'T001',tipo:'produto',nome:'Produto',unidade:'UN',preco:10,fiscal:{ncm:'33059000',usarFiscalEmpresa:true}}]}};
  const item = parseManagementCatalogMessage(data).items[0];
  assert.equal(item.icmsCode,'102'); assert.equal(item.pisCst,'49'); assert.equal(item.taxableUnit,'UN');
  assert.equal(evaluateCatalogTaxProfile(item).coreReady,true);
  data.perfil.empresa_id=customerId;
  assert.equal(parseManagementCatalogMessage(data).items[0].icmsCode,'');
});
