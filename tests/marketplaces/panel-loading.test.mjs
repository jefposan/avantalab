import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = resolve(import.meta.dirname, '../..');
const hook = registerHooks({ resolve(s, c, next) {
  if (s === 'next/image') return { url: 'data:text/javascript,export default function Image(){return null}', shortCircuit: true };
  if (s.endsWith('.module.css')) return { url: 'data:text/javascript,export default new Proxy({}, {get:(_,k)=>k})', shortCircuit: true };
  if (s === '@/app/lib/supabase') return { url: 'data:text/javascript,export const supabase={auth:{getSession(){throw Error("Não acessar rede em SSR")}}}', shortCircuit: true };
  const f = s.startsWith('@/') ? resolve(root, s.slice(2)) : s.startsWith('.') && c.parentURL?.startsWith('file:') ? resolve(dirname(new URL(c.parentURL).pathname), s) : null;
  if (f) for (const ext of ['.tsx', '.ts']) if (existsSync(f + ext)) return next(pathToFileURL(f + ext).href, c);
  return next(s, c);
}, load(url, c, next) {
  if (url.startsWith('file:') && url.endsWith('.tsx')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext } }).outputText };
  return next(url, c);
} });
const { default: Loader } = await import('../../app/components/CarregamentoDadosModulo.tsx');
const { default: Vendas } = await import('../../app/marketplaces/Vendas.tsx');
const { default: Anunciados } = await import('../../app/marketplaces/Anunciados.tsx');
hook.deregister();
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const theme = { brand: '#003e73', dark: false };
test('preparação de anúncio reutiliza overlay central translúcido e termina com o estado de preparação',()=>{
  const html=render(Loader,{ativo:true,titulo:'Preparando anúncio…',mensagem:'Carregando os dados do produto e as opções da conta.',corPrimaria:'#003e73'});
  assert.match(html,/fixed inset-0.*place-items-center/);
  assert.match(html,/bg-white\/35/);
  assert.match(html,/backdrop-blur/);
  assert.match(html,/Preparando anúncio/);
  assert.match(html,/role="status".*aria-live="polite".*aria-busy="true"/);
  assert.match(html,/avanta-loading-pontos/);
  assert.equal(render(Loader,{ativo:false,titulo:'Preparando anúncio',mensagem:'Aguarde'}),'');
  assert.match(render(Loader,{ativo:true,titulo:'Preparando anúncio',mensagem:'Aguarde',temaEscuro:true}),/bg-slate-950\/35/);
  for(const file of ['NewListing','MagaluListing']){
    const source=readFileSync(resolve(root,`app/marketplaces/${file}.tsx`),'utf8');
    assert.match(source, file==='NewListing'?/<CarregamentoDadosModulo ativo=\{preparing&&!photoUploading\}/:/<CarregamentoDadosModulo ativo=\{preparing\}/);
    assert.match(source,file==='NewListing'?/inert=\{preparing&&!photoUploading \|\| publishing\} aria-busy=\{preparing&&!photoUploading \|\| publishing\}/:/inert=\{preparing(?: \|\| publishing)?\} aria-busy=\{preparing(?: \|\| publishing)?\}/);
    assert.match(source,/finally[^]*?setPreparing\(false\)/);
    assert.doesNotMatch(source,/<CarregamentoDadosModulo ativo=\{publishing\}/);
  }
});
const salesProps = { ...theme, sales: [], accounts: [], counts: {}, marketplaceOptions: [], selectedMarketplaces: [], warnings: [], total: 0, expanded: true, loading: false, error: '', saleToOpen: '' };
const listingProps = { ...theme, companyId: 'fake-company', onAccountsLoaded() {}, onAccountSelectionLockedChange() {}, onPublishInAnotherAccount() {} };

test('indicador local usa o círculo padrão, cor do perfil, status acessível e movimento reduzido, sem overlay', () => {
  const props = { ativo: true, variante: 'local', titulo: 'Vendas', mensagem: 'Carregando vendas…', corPrimaria: '#003e73' };
  const html = render(Loader, props);
  assert.match(html, /role="status".*aria-live="polite".*aria-busy="true"/);
  assert.match(html, /place-items-center/);
  assert.match(html, /avanta-loading-pontos/);
  assert.match(html, /text-base font-semibold/);
  assert.match(html, /color-mix/);
  const skeletons = render(Loader, { ...props, esqueletos: true });
  assert.equal((skeletons.match(/motion-safe:animate-pulse/g) || []).length, 3);
  assert.match(skeletons, /aria-hidden="true"/);
  assert.doesNotMatch(skeletons, /[0-9]+% concluído/);
  assert.match(html, /avanta-loading-pontos/);
  assert.match(html, /color:#003e73/);
  assert.doesNotMatch(html, /fixed|backdrop-blur/);
  assert.match(render(Loader, { ...props, temaEscuro: true }), /text-slate-300/);
  assert.equal(render(Loader, { ...props, ativo: false }), '');
  assert.match(render(Loader, { ...props, variante: undefined }), /fixed inset-0/);
});
test('Vendas distingue carregamento, erro e vazio; mantém conteúdo recolhido quando solicitado', () => {
  const busy = render(Vendas, { ...salesProps, loading: true, error: 'Erro anterior' });
  assert.match(busy, /Carregando vendas…/);
  assert.match(busy, /avanta-loading-pontos/);
  assert.doesNotMatch(busy, /Nenhuma venda encontrada|Erro anterior/);
  const failed = render(Vendas, { ...salesProps, error: 'Falha de rede' });
  assert.match(failed, /role="alert">Falha de rede/);
  assert.doesNotMatch(failed, /animate-spin/);
  assert.match(render(Vendas, salesProps), /Nenhuma venda encontrada/);
  assert.match(render(Vendas, { ...salesProps, loading: true, expanded: false }), /id="sales-content" hidden="" aria-busy="true"/);
});
test('Magalu inicia consulta real de anúncios, sem converter presença vazia/erro em contador zero', () => {
  const busy = render(Anunciados, { ...listingProps, marketplace: 'magalu', magaluCatalogCheck: 'checking' });
  assert.match(busy, /avanta-loading-pontos/);
  assert.match(busy, /id="announced-content" hidden="" aria-busy="true"/);
  for (const state of ['empty', 'failed', 'denied', 'unverified', undefined]) {
    const html = render(Anunciados, { ...listingProps, marketplace: 'magalu', magaluCatalogCheck: state });
    assert.match(html, /avanta-loading-pontos/);
  }
});
test('Anunciados ML usa indicador na carga inicial; atualização manual fica só no botão, sem falso vazio', () => {
  const source = readFileSync(resolve(root, 'app/marketplaces/Anunciados.tsx'), 'utf8');
  assert.match(source, /<CarregamentoDadosModulo ativo={loading} variante="local"/);
  assert.match(source, /!visibleRows.length && !loading && <p/);
  assert.match(source, /\{syncing \? 'Atualizando…' : 'Atualizar'\}/);
  assert.doesNotMatch(source,/aria-busy=\{loading\|\|syncing\}|disabled=\{syncing\|\|acting\}/);
  assert.match(source, /const \[panelExpanded, setPanelExpanded\] = usePanelExpansion\(\{panelExpanded:controlledExpanded,onPanelExpandedChange\}\)/);
  const html = render(Anunciados, listingProps);
  assert.match(html, /id="announced-content" hidden="" aria-busy="true"/);
  assert.match(html, /avanta-loading-pontos/);
});
