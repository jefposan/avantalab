import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const registro = readFileSync('app/lib/modulos-registro.ts', 'utf8');
const cliente = readFileSync('app/custos/CustosClient.tsx', 'utf8');
const estilos = readFileSync('app/custos/custos.module.css', 'utf8');
const ajustes = readFileSync('app/api/modulos/custos/ajustes/route.ts', 'utf8');
const repositorio = readFileSync('app/custos/repository.ts', 'utf8');
const catalogo = readFileSync('app/components/CatalogoProdutosVendas.tsx', 'utf8');
const gestao = readFileSync('app/gestao/page.tsx', 'utf8');
const modalModulos = readFileSync('app/components/ModulosModal.tsx', 'utf8');
const listar = readFileSync('app/api/cobranca/modulos/listar/route.ts', 'utf8');
const assinar = readFileSync('app/api/cobranca/modulos/assinar/route.ts', 'utf8');
const ativar = readFileSync('app/api/cobranca/modulos/ativar/route.ts', 'utf8');
const remover = readFileSync('app/api/cobranca/modulos/remover/route.ts', 'utf8');
const acesso = readFileSync('app/api/modulos/acesso/route.ts', 'utf8');
const webhook = readFileSync('app/api/cobranca/webhook/route.ts', 'utf8');
const migracao = readFileSync('supabase/migrations/20260825103000_custos_precificacao_base_compartilhada.sql', 'utf8');
const migracaoDescricao = readFileSync('supabase/migrations/20260826150000_atualizar_descricao_modulo_custos.sql', 'utf8');
const migracaoEndurecimento = readFileSync('supabase/migrations/20260826152000_endurecer_documentos_custos.sql', 'utf8');
const migracaoPublicacao = readFileSync('supabase/migrations/20260826153000_publicar_modulo_custos.sql', 'utf8');
const manifesto = readFileSync('app/custos/manifest.ts', 'utf8');

test('Custos usa página total e exige o acesso oficial do módulo', () => {
  assert.match(registro, /id: 'custos'/);
  assert.match(registro, /modo: 'pagina_total'/);
  assert.match(registro, /rota: '\/custos'/);
  assert.match(cliente, /moduloId=custos/);
  assert.match(cliente, /Somente visualização/);
  assert.doesNotMatch(cliente, /Demonstração local|Teste local/);
});

test('Acesso direto a Custos seleciona o perfil e retorna ao módulo na mesma origem', () => {
  assert.match(cliente, /router\.replace\('\/gestao\?abrirModulo=custos'\)/);
  assert.match(gestao, /new URLSearchParams\(window\.location\.search\)\.get\('abrirModulo'\)/);
  assert.match(gestao, /moduloSolicitado === 'custos'/);
  assert.match(gestao, /router\.replace\(`\/custos\?empresaId=\$\{encodeURIComponent\(empresa\.id\)\}`\)/);
  assert.doesNotMatch(cliente, /https?:\/\/[^'"`]*\/gestao/);
});

test('Custos participa do catálogo comercial e da navegação oficial da Gestão', () => {
  assert.match(registro, /id: 'custos'[\s\S]*ordem: 5/);
  assert.match(registro, /id: 'custos'[\s\S]*superficies: \['web'\]/);
  assert.match(registro, /id: 'custos'[\s\S]*precoMensal: VALOR_MODULO_AVULSO_MENSAL/);
  assert.match(registro, /Cadastro de produtos, composição de custos, histórico e simulações de preço\./);
  assert.match(migracaoDescricao, /where id = 'custos'/);
  assert.match(registro, /id: 'custos'[\s\S]*vendavelNoBusiness: true/);
  assert.match(registro, /id: 'custos'[\s\S]*incluidoNoBusinessPro: true/);
  assert.match(migracao, /'custos', false, array\['empresa'\]/);
  assert.match(migracaoPublicacao, /set disponivel = true/);
  assert.match(migracaoPublicacao, /where id = 'custos'/);
  assert.match(migracao, /'custos', 'Custos e Precificação'[\s\S]*14\.90,[\s\S]*true, true, 'pagina_total', '\/custos', array\['web'\]/);
  assert.match(manifesto, /experimental: false/);
  assert.match(gestao, /modulosPaginaTotalAtivos\(modulosAtivos\)/);
});

test('Catálogo de módulos usa um card principal com módulos quadrados responsivos', () => {
  assert.match(modalModulos, /max-w-6xl/);
  assert.match(modalModulos, /md:grid-cols-3 lg:grid-cols-4/);
  assert.match(modalModulos, /<article[\s\S]*aspect-square/);
  assert.match(modalModulos, /min-h-11 w-full/);
});

test('Instalação, contratação, remoção e liberação financeira usam o fluxo central', () => {
  assert.match(listar, /eq\('disponivel', true\)/);
  assert.doesNotMatch(listar, /NODE_ENV/);
  assert.match(assinar, /normalizarPlanoComercial\(estado\.plano\) !== 'business'/);
  assert.match(assinar, /VALOR_MODULO_AVULSO_MENSAL/);
  assert.match(ativar, /permiteInstalacaoModuloSemCobranca/);
  assert.match(ativar, /plano_business_pro/);
  assert.match(remover, /dadosPreservados: true/);
  assert.match(webhook, /origem: 'assinatura_modulo'/);
});

test('Hierarquia e vigência são reconfirmadas no servidor e no banco', () => {
  assert.match(acesso, /const perfil = acesso\.vinculo\.perfil as keyof typeof manifesto\.permissoes/);
  assert.match(acesso, /podeEditar: compartilhado \? compartilhamentoEdita : nivel !== 'visualizar'/);
  assert.match(acesso, /podeGerenciarModulo: acesso\.podeGerenciar/);
  assert.match(migracao, /public\.modulo_ativo_para_empresa\(p_empresa_id, 'custos'\)/);
  assert.match(migracao, /acesso\.perfil in \('gestor_master', 'administrador', 'operador_completo'\)/);
});

test('Cabeçalho de Custos segue Projetos, retorna ao Dashboard e alterna o tema do perfil', () => {
  assert.match(cliente, /Voltar ao Dashboard do AvantaLab/);
  assert.match(cliente, /className=\{styles\.moduleLogo\}/);
  assert.match(cliente, /Abrir ajustes de Custos e Precificação/);
  assert.match(cliente, /\/api\/modulos\/custos\/ajustes/);
  assert.match(ajustes, /\.eq\('modulo_id', 'custos'\)/);
  assert.match(ajustes, /update\(\{ dark_mode: temaEscuro \}\)/);
  assert.match(estilos, /\.dark \.moduleLogo\{filter:brightness\(0\) invert\(1\)\}/);
  assert.match(estilos, /\.settingsSection\{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var\(--border\);border-radius:14px;padding:15px;background:var\(--surface-soft\)\}/);
  assert.match(estilos, /\.settingsThemeSwitch\{display:inline-flex;width:104px;min-width:104px;min-height:44px/);
  assert.match(estilos, /\.settingsThemeSwitch\[aria-checked="true"\] i::after\{transform:translateX\(12px\)\}/);
  assert.match(estilos, /--quadrant-radius:8px 18px 18px 18px/);
  assert.doesNotMatch(estilos, /box-shadow:inset 3px 0/);
});

test('Catálogo e Custos usam o mesmo cadastro mestre e a mesma inativação', () => {
  assert.match(repositorio, /from\('vendas_mobile_catalogo_produtos'\)/);
  assert.match(catalogo, /from\('vendas_mobile_catalogo_produtos'\)\.update\(\{ ativo: false/);
  assert.doesNotMatch(catalogo, /from\('vendas_mobile_catalogo_produtos'\)\.delete\(\)/);
  assert.match(catalogo, /eq\('disponivel_catalogo', true\)/);
  assert.match(migracao, /disponivel_catalogo boolean not null default true/);
});

test('Dados próprios preservam composições, simulações e histórico', () => {
  assert.match(migracao, /create table if not exists public\.custos_documentos/);
  assert.match(migracao, /"composicoes":\{\},"cenarios":\[\],"historico":\[\]/);
  assert.match(migracao, /public\.custos_pode_acessar_empresa/);
  assert.match(migracao, /public\.modulo_ativo_para_empresa\(p_empresa_id, 'custos'\)/);
  assert.match(migracao, /disponivel_catalogo = true/);
  assert.match(repositorio, /carregarCustos\(empresaId: string, podeEditar: boolean\)/);
  assert.match(repositorio, /eq\('revisao', revisaoEsperada\)/);
  assert.match(migracaoEndurecimento, /new\.atualizado_por := auth\.uid\(\)/);
  assert.match(migracaoEndurecimento, /revoke delete on public\.custos_documentos from authenticated/);
});
