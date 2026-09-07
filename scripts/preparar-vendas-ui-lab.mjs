import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const CONTAINER = 'supabase_db_avantalab-vendas-fiscal-lab';
const DATABASE = 'avantalab_commercial_ui_lab';
const REVIEW_EMAIL = 'teste@teste.com.br';
const TARGET_CNPJ = String(process.env.AVANTALAB_VENDAS_LAB_CNPJ || '').replace(/\D/g, '');
const EXTERNAL_ROOT = '/Users/JEFF/AvantaLab Projetos/vendas';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROFILES = new Set(['gestor_master', 'administrador', 'operador_completo', 'operador_simples']);
const CATALOG_ID = '10000000-0000-4000-8000-000000000001';
const PRICE_TABLE_ID = '10000000-0000-4000-8000-000000000002';
const PRODUCT_ID = '10000000-0000-4000-8000-000000000003';
const SERVICE_ID = '10000000-0000-4000-8000-000000000004';

function docker(...args) {
  return execFileSync('docker', ['exec', CONTAINER, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function applySql(sql) {
  execFileSync('docker', ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', DATABASE, '-v', 'ON_ERROR_STOP=1'], {
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'ignore', 'pipe'],
  });
}

function assertLocalLab() {
  const health = execFileSync('docker', ['inspect', '--format', '{{.State.Health.Status}}', CONTAINER], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  assert.equal(health, 'healthy', 'O PostgreSQL local precisa estar saudável.');
  const projectReference = `${EXTERNAL_ROOT}/supabase/.temp/project-ref`;
  try {
    readFileSync(projectReference);
    assert.fail('O laboratório não pode estar vinculado a um projeto remoto.');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

function cleanup() {
  assertLocalLab();
  docker('dropdb', '-U', 'postgres', '--if-exists', DATABASE);
  process.stdout.write(`${JSON.stringify({ ok: true, databaseRemoved: DATABASE, remoteChanged: false })}\n`);
}

async function findReviewUser(admin) {
  for (let page = 1; page <= 10; page += 1) {
    const response = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    assert.ifError(response.error);
    const found = response.data.users.find((user) => user.email?.toLowerCase() === REVIEW_EMAIL);
    if (found) return found;
    if (response.data.users.length < 1000) break;
  }
  throw new Error('A conta exclusiva de revisão não foi encontrada.');
}

async function findCompany(admin, userId) {
  const memberships = await admin
    .from('usuarios_empresa')
    .select('empresa_id,perfil,status')
    .eq('user_id', userId)
    .eq('status', 'ativo');
  assert.ifError(memberships.error);
  const ids = [...new Set((memberships.data || []).map((item) => String(item.empresa_id || '')).filter((id) => UUID_PATTERN.test(id)))];
  assert.ok(ids.length, 'A conta de revisão precisa possuir um perfil empresarial ativo.');
  const companies = await admin.from('empresas').select('id,nome,tipo_perfil').in('id', ids);
  assert.ifError(companies.error);
  const company = (companies.data || []).find((item) => String(item.tipo_perfil || '').toLowerCase() !== 'pessoal') || companies.data?.[0];
  assert.ok(company && UUID_PATTERN.test(String(company.id)), 'O perfil empresarial da conta de revisão não foi encontrado.');
  return company;
}

function sqlText(value) {
  return `'${String(value ?? '').trim().replaceAll("'", "''")}'`;
}

async function resolveLabCompany(admin) {
  if (!TARGET_CNPJ) {
    const user = await findReviewUser(admin);
    const company = await findCompany(admin, user.id);
    return { company, preferredUserId: user.id, profile: null };
  }
  assert.match(TARGET_CNPJ, /^\d{14}$/, 'Informe um CNPJ com 14 dígitos para preparar o laboratório fiscal.');
  const profileResponse = await admin
    .from('cadastros_perfil')
    .select('empresa_id,documento,razao_social,nome_fantasia,inscricao_estadual,inscricao_estadual_isento,inscricao_municipal,inscricao_municipal_isento,regime_tributario,cep,rua,numero,complemento,bairro,cidade,estado')
    .eq('documento', TARGET_CNPJ)
    .maybeSingle();
  assert.ifError(profileResponse.error);
  assert.ok(profileResponse.data?.empresa_id, 'O CNPJ informado não possui cadastro empresarial na Gestão.');
  const companyResponse = await admin
    .from('empresas')
    .select('id,nome,tipo_perfil')
    .eq('id', profileResponse.data.empresa_id)
    .maybeSingle();
  assert.ifError(companyResponse.error);
  assert.ok(companyResponse.data && companyResponse.data.tipo_perfil !== 'pessoal', 'O CNPJ informado não pertence a um perfil empresarial válido.');
  return { company: companyResponse.data, preferredUserId: '', profile: profileResponse.data };
}

async function loadActiveMemberships(admin, companyId, preferredUserId = '') {
  const response = await admin
    .from('usuarios_empresa')
    .select('user_id,perfil,status')
    .eq('empresa_id', companyId)
    .eq('status', 'ativo');
  assert.ifError(response.error);
  const memberships = (response.data || []).filter((row) => UUID_PATTERN.test(String(row.user_id || '')) && PROFILES.has(String(row.perfil || '')));
  if (!memberships.length && UUID_PATTERN.test(preferredUserId)) {
    memberships.push({ user_id: preferredUserId, perfil: 'gestor_master', status: 'ativo' });
  }
  assert.ok(memberships.length, 'A empresa precisa possuir ao menos um Gestor, Administrador ou Operador ativo.');
  return memberships;
}

function normalizedProfile(profile) {
  if (!profile) return {
    documento: '48210380000142',
    razao_social: 'Empresa Demonstração Comércio e Serviços Ltda.',
    nome_fantasia: 'Empresa Demonstração',
    inscricao_estadual: '110042490114',
    inscricao_estadual_isento: false,
    inscricao_municipal: '',
    inscricao_municipal_isento: false,
    regime_tributario: 'Simples Nacional',
    cep: '01001000',
    rua: 'Praça da Sé',
    numero: '100',
    complemento: '',
    bairro: 'Sé',
    cidade: 'São Paulo',
    estado: 'SP',
  };
  const normalized = {
    documento: String(profile.documento || '').replace(/\D/g, ''),
    razao_social: String(profile.razao_social || '').trim(),
    nome_fantasia: String(profile.nome_fantasia || '').trim(),
    inscricao_estadual: String(profile.inscricao_estadual || '').trim(),
    inscricao_estadual_isento: profile.inscricao_estadual_isento === true,
    inscricao_municipal: String(profile.inscricao_municipal || '').trim(),
    inscricao_municipal_isento: profile.inscricao_municipal_isento === true,
    regime_tributario: String(profile.regime_tributario || '').trim(),
    cep: String(profile.cep || '').replace(/\D/g, ''),
    rua: String(profile.rua || '').trim(),
    numero: String(profile.numero || '').trim(),
    complemento: String(profile.complemento || '').trim(),
    bairro: String(profile.bairro || '').trim(),
    cidade: String(profile.cidade || '').trim(),
    estado: String(profile.estado || '').trim().toUpperCase(),
  };
  assert.match(normalized.documento, /^\d{14}$/, 'Complete o CNPJ da empresa antes de preparar o laboratório fiscal.');
  assert.ok(normalized.razao_social && /^\d{8}$/.test(normalized.cep) && normalized.rua && normalized.numero
    && normalized.bairro && normalized.cidade && /^[A-Z]{2}$/.test(normalized.estado),
  'Complete a razão social e o endereço da empresa antes de preparar o laboratório fiscal.');
  return normalized;
}

function prepareDatabase({ company, memberships, profile }) {
  assertLocalLab();
  const companyId = String(company.id || '');
  assert.match(companyId, UUID_PATTERN);
  const companyName = String(company.nome || profile.nome_fantasia || profile.razao_social || 'Perfil empresarial').trim();
  const userRows = memberships.map((row) => `(${sqlText(row.user_id)})`).join(',');
  const membershipRows = memberships.map((row) => `(${sqlText(companyId)},${sqlText(row.user_id)},'ativo',${sqlText(row.perfil)})`).join(',');
  docker('dropdb', '-U', 'postgres', '--if-exists', DATABASE);
  docker('createdb', '-U', 'postgres', DATABASE);
  applySql(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create table public.empresas (id uuid primary key,nome text not null);
    create table public.usuarios_empresa (
      empresa_id uuid not null references public.empresas(id),
      user_id uuid not null references auth.users(id),
      status text not null,
      perfil text not null,
      primary key (empresa_id,user_id)
    );
    create table public.empresa_modulos (
      empresa_id uuid not null references public.empresas(id),
      modulo_id text not null,
      ativo boolean not null,
      expira_em timestamptz,
      primary key (empresa_id,modulo_id)
    );
    create table public.vendas_mobile_catalogos (
      id uuid primary key,
      empresa_id uuid not null references public.empresas(id),
      ativo boolean not null default true,
      criado_em timestamptz not null default now()
    );
    create table public.vendas_mobile_catalogo_produtos (
      id uuid primary key,
      catalogo_id uuid not null references public.vendas_mobile_catalogos(id),
      sku text,
      nome text not null,
      descricao text,
      preco_custo numeric(12,2) not null default 0,
      preco_venda numeric(12,2) not null default 0,
      unidade text not null default 'un',
      ativo boolean not null default true,
      tipo_item text not null default 'produto',
      disponivel_catalogo boolean not null default true,
      categoria text,
      codigo_barras text,
      ncm text,
      cest text,
      origem_mercadoria text,
      unidade_tributavel text,
      cfop_padrao text,
      cst text,
      csosn text,
      cst_pis text,
      cst_cofins text,
      cst_ibs_cbs text,
      classificacao_ibs_cbs text,
      codigo_tributacao_nacional text,
      codigo_tributacao_municipal text,
      item_lc116 text,
      nbs text,
      municipio_prestacao text,
      aliquota_iss numeric(7,4),
      atualizado_em timestamptz not null default now()
    );
    create table public.custos_tabelas_preco (
      id uuid primary key,
      empresa_id uuid not null references public.empresas(id),
      nome text not null,
      padrao boolean not null default false,
      ativo boolean not null default true
    );
    create table public.custos_tabela_preco_itens (
      tabela_preco_id uuid not null references public.custos_tabelas_preco(id),
      produto_id uuid not null references public.vendas_mobile_catalogo_produtos(id),
      preco numeric(14,2) not null,
      primary key (tabela_preco_id,produto_id)
    );
    create table public.cadastros_perfil (
      empresa_id uuid primary key references public.empresas(id),
      documento text not null,
      razao_social text not null,
      nome_fantasia text,
      inscricao_estadual text,
      inscricao_estadual_isento boolean not null default false,
      inscricao_municipal text,
      inscricao_municipal_isento boolean not null default false,
      regime_tributario text not null,
      cep text not null,
      rua text not null,
      numero text not null,
      complemento text,
      bairro text not null,
      cidade text not null,
      estado text not null
    );
    insert into auth.users(id) values ${userRows};
    insert into public.empresas(id,nome) values ('${companyId}',${sqlText(companyName)});
    insert into public.usuarios_empresa(empresa_id,user_id,status,perfil)
      values ${membershipRows};
    insert into public.empresa_modulos(empresa_id,modulo_id,ativo)
      values ('${companyId}','vendas',true),('${companyId}','custos',true);
  `);
  applySql(readFileSync(`${EXTERNAL_ROOT}/database/drafts/0001_fiscal_transactional_NOT_APPLIED.sql`, 'utf8'));
  applySql(readFileSync(`${EXTERNAL_ROOT}/database/drafts/0002_fiscal_recovery_queue_NOT_APPLIED.sql`, 'utf8'));
  applySql(readFileSync(`${EXTERNAL_ROOT}/database/drafts/0003_fiscal_artifact_governance_NOT_APPLIED.sql`, 'utf8'));
  applySql(readFileSync(`${EXTERNAL_ROOT}/database/drafts/0004_module_access_control_NOT_APPLIED.sql`, 'utf8'));
  applySql(readFileSync(`${EXTERNAL_ROOT}/database/drafts/0005_commercial_core_NOT_APPLIED.sql`, 'utf8'));
  applySql(readFileSync(`${EXTERNAL_ROOT}/database/drafts/0006_fiscal_certificates_NOT_APPLIED.sql`, 'utf8'));
  applySql(readFileSync(`${EXTERNAL_ROOT}/database/drafts/0007_fiscal_certificate_activation_NOT_APPLIED.sql`, 'utf8'));
  applySql(readFileSync(`${EXTERNAL_ROOT}/database/drafts/0008_fiscal_artifact_revisions_NOT_APPLIED.sql`, 'utf8'));
  applySql(readFileSync(`${EXTERNAL_ROOT}/database/drafts/0009_fiscal_rejection_corrections_NOT_APPLIED.sql`, 'utf8'));
  applySql(`
    insert into public.vendas_mobile_catalogos(id,empresa_id,ativo)
      values ('${CATALOG_ID}','${companyId}',true);
    insert into public.custos_tabelas_preco(id,empresa_id,nome,padrao,ativo)
      values ('${PRICE_TABLE_ID}','${companyId}','Tabela do laboratório',true,true);
    insert into public.vendas_mobile_catalogo_produtos(
      id,catalogo_id,sku,nome,descricao,preco_custo,preco_venda,unidade,ativo,tipo_item,
      disponivel_catalogo,categoria,codigo_barras,ncm,cest,origem_mercadoria,unidade_tributavel,
      cfop_padrao,csosn,cst_pis,cst_cofins,cst_ibs_cbs,classificacao_ibs_cbs
    ) values (
      '${PRODUCT_ID}','${CATALOG_ID}','PRD-LAB-001','Produto fiscal de laboratório',
      'Item sintético para validar o pedido e a NF-e sem movimentar estoque real.',18.50,49.90,'un',true,
      'produto',true,'Produto acabado','7891234567001','33049990','2001300','0','UN','5102','102','49','49','',''
    );
    insert into public.vendas_mobile_catalogo_produtos(
      id,catalogo_id,sku,nome,descricao,preco_custo,preco_venda,unidade,ativo,tipo_item,
      disponivel_catalogo,categoria,codigo_tributacao_nacional,codigo_tributacao_municipal,
      item_lc116,nbs,municipio_prestacao,aliquota_iss,cst_pis,cst_cofins
    ) values (
      '${SERVICE_ID}','${CATALOG_ID}','SRV-LAB-001','Serviço fiscal de laboratório',
      'Serviço sintético para os próximos ensaios de NFS-e.',60,150,'h',true,'servico',true,'Serviço',
      '17.01','1701','17.01','1.1801.10.00','São Paulo/SP',2,'49','49'
    );
    insert into public.cadastros_perfil(
      empresa_id,documento,razao_social,nome_fantasia,inscricao_estadual,regime_tributario,
      inscricao_estadual_isento,inscricao_municipal,inscricao_municipal_isento,
      cep,rua,numero,complemento,bairro,cidade,estado
    ) values (
      '${companyId}',${sqlText(profile.documento)},${sqlText(profile.razao_social)},
      ${sqlText(profile.nome_fantasia || companyName)},${sqlText(profile.inscricao_estadual)},${sqlText(profile.regime_tributario)},
      ${profile.inscricao_estadual_isento === true},${sqlText(profile.inscricao_municipal)},${profile.inscricao_municipal_isento === true},
      ${sqlText(profile.cep)},${sqlText(profile.rua)},${sqlText(profile.numero)},${sqlText(profile.complemento)},
      ${sqlText(profile.bairro)},${sqlText(profile.cidade)},${sqlText(profile.estado)}
    );
    insert into fiscal_private.number_sequences(
      company_id,establishment_id,document_type,series,next_number,last_reserved_number,active
    ) values ('${companyId}','${companyId}','nfe','1',1,0,true);
  `);
}

async function main() {
  if (process.argv.includes('--cleanup')) {
    cleanup();
    return;
  }
  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const serviceRole = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  assert.match(supabaseUrl, /^https:\/\//, 'Informe o Supabase oficial da Gestão pelo arquivo local de ambiente.');
  assert.ok(serviceRole, 'A chave server-side da Gestão é necessária somente para preparar a sessão de revisão.');
  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const resolved = await resolveLabCompany(admin);
  const company = resolved.company;
  const profile = normalizedProfile(resolved.profile);
  const memberships = await loadActiveMemberships(admin, company.id, resolved.preferredUserId);
  prepareDatabase({ company, memberships, profile });
  const openLogin = process.argv.includes('--open-login');
  if (openLogin) {
    const generated = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: REVIEW_EMAIL,
      options: { redirectTo: 'http://localhost:3000/vendas-lab' },
    });
    assert.ifError(generated.error);
    const actionLink = generated.data.properties?.action_link;
    assert.match(actionLink || '', /^https:\/\//, 'O Supabase não devolveu o acesso temporário de revisão.');
    const opened = spawnSync('open', ['-a', 'Google Chrome', actionLink], { stdio: 'ignore' });
    assert.equal(opened.status, 0, 'Não foi possível abrir o acesso temporário no Chrome.');
  }
  process.stdout.write(`${JSON.stringify({
    ok: true,
    marker: 'AVANTALAB_VENDAS_UI_LAB_READY',
    companyId: company.id,
    companyName: company.nome || 'Perfil empresarial de revisão',
    database: DATABASE,
    loginOpened: openLogin,
    remoteSchemaChanged: false,
  })}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Não foi possível preparar o laboratório de Vendas.');
  process.exitCode = 1;
});
