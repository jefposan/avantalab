import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = resolve(import.meta.dirname, '../..');
const stubs = new Map([
  ['@/app/lib/supabase', 'export const supabase = {};'],
  ['@/app/components/ModalConfirmacao', 'export default function Modal(){return null;}'],
  ['@/app/projetos/components/Icon', 'export function Icon(){return null;}'],
  ['./ListingEditor', 'export default function Editor(){return null;}'],
  ['./MarketplaceAccountPicker', 'export default function Picker(){return null;}'],
  ['./SalePostSale', 'export default function PostSale(){return null;}'],
]);
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (stubs.has(specifier)) return { url: `data:text/javascript,${encodeURIComponent(stubs.get(specifier))}`, shortCircuit: true };
    if (specifier.endsWith('.module.css')) return { url: 'data:text/javascript,export default new Proxy({}, {get:(_,key)=>key});', shortCircuit: true };
    if (specifier.startsWith('@/')) specifier = pathToFileURL(resolve(root, specifier.slice(2))).href;
    if (specifier.startsWith('file:') && !/\.[a-z]+$/.test(specifier)) {
      for (const extension of ['.tsx', '.ts']) {
        try { readFileSync(fileURLToPath(specifier + extension)); return { url: specifier + extension, shortCircuit: true }; } catch {}
      }
    }
    if (specifier.startsWith('.') && context.parentURL?.startsWith(pathToFileURL(root).href)) {
      for (const extension of ['.tsx', '.ts']) {
        const url = new URL(specifier + extension, context.parentURL);
        try { readFileSync(url); return { url: url.href, shortCircuit: true }; } catch {}
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith(pathToFileURL(root).href) && /\.tsx?$/.test(url)) return {
      format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext } }).outputText,
    };
    return next(url, context);
  },
});
const { default: Toggle } = await import(pathToFileURL(resolve(root, 'app/components/BotaoExpandirCard.tsx')).href);
const { default: Vendas } = await import(pathToFileURL(resolve(root, 'app/marketplaces/Vendas.tsx')).href);
const { default: Anunciados } = await import(pathToFileURL(resolve(root, 'app/marketplaces/Anunciados.tsx')).href);
const { default: AvantaKanban } = await import(pathToFileURL(resolve(root, 'app/components/AvantaKanban.tsx')).href);
hooks.deregister();
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const noop = () => {};
const salesProps = { companyId: 'empresa', accountId: '', onAccountChange: noop, accounts: [], sales: [], canManage: false, loading: false, error: '', awaitingUpdates: 0, onRefresh: noop, onSaleUpdated: noop, onExpandedChange: noop, dark: false, brand: '#003E73' };

test('AvantaKanban entrega acionadores acessíveis no cabeçalho e respeita ordem controlada', () => {
  const items = [
    { id: 'sales', title: 'Vendas', render: (handle) => React.createElement(Vendas, { ...salesProps, expanded: false, reorderHandle: handle }) },
    { id: 'announced', title: 'Anunciados', render: (handle) => React.createElement('section', null, handle) },
  ];
  const html = render(AvantaKanban, { items, order: ['sales', 'announced'], onOrderChange: noop });
  assert.ok(html.indexOf('data-avanta-kanban-item="sales"') < html.indexOf('data-avanta-kanban-item="announced"'));
  assert.match(html, /aria-label="Mover bloco Vendas"/);
  assert.match(html, /aria-roledescription="item reordenável"/);
  assert.match(html, /aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home End Escape"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /id="sales-content" hidden/);
  const reversed = render(AvantaKanban, { items, order: ['announced', 'sales'], onOrderChange: noop, disabled: true });
  assert.ok(reversed.indexOf('data-avanta-kanban-item="announced"') < reversed.indexOf('data-avanta-kanban-item="sales"'));
  assert.match(reversed, /disabled=""[^>]*aria-label="Mover bloco/);
});

test('controle compartilhado associa conteúdo, nome do bloco e estado expandido', () => {
  for (const expanded of [true, false]) {
    const html = render(Toggle, { variante: 'painel', modo: 'lista', contexto: 'Vendas', controlsId: 'sales-content', expandido: expanded, onClick: noop });
    assert.ok(html.includes(`aria-expanded="${expanded}"`));
    assert.match(html, /aria-controls="sales-content"/);
    assert.ok(html.includes(`aria-label="${expanded ? 'Recolher' : 'Expandir'} Vendas"`));
    assert.match(html, /min-h-12/);
    assert.match(html, /focus-visible:outline/);
  }
});

test('variantes anteriores mantêm rótulos e acionamento sem propagação', () => {
  assert.match(render(Toggle, { expandido: false, onClick: noop }), /aria-label="Expandir card"/);
  assert.match(render(Toggle, { variante: 'rodape', modo: 'lista', expandido: true, onClick: noop }), /Recolher lista de lançamentos/);
  let calls = 0;
  let stopped = false;
  const element = Toggle({ variante: 'painel', contexto: 'Anunciados', expandido: true, onClick: () => calls++ });
  element.props.children.props.onClick({ stopPropagation() { stopped = true; } });
  assert.equal(calls, 1);
  assert.equal(stopped, true);
});

test('controle do painel recebe a cor da empresa e contraste para tema escuro', () => {
  const props = { variante: 'painel', modo: 'lista', contexto: 'Anunciados', expandido: false, onClick: noop, corPrimaria: '#cf0201' };
  assert.match(render(Toggle, props), /color:#cf0201;background-color:#ffffff/);
  assert.match(render(Toggle, { ...props, darkMode: true }), /color:#bfdbfe;background-color:#182235;border-color:#475569/);
});

test('Vendas recolhe só o conteúdo e mantém título, total, atualizar e filtro montado', () => {
  const collapsed = render(Vendas, { ...salesProps, expanded: false });
  assert.match(collapsed, /Vendas · 0/);
  assert.match(collapsed, /Atualizar/);
  assert.match(collapsed, /aria-label="Expandir Vendas"/);
  assert.match(collapsed, /id="sales-content" hidden=""/);
  assert.match(collapsed, /Conta das vendas/);
  const expanded = render(Vendas, { ...salesProps, expanded: true });
  assert.match(expanded, /aria-label="Recolher Vendas"/);
  assert.ok(!expanded.includes('id="sales-content" hidden'));
});

test('Anunciados inicia expandido com controle próprio no topo', () => {
  const html = render(Anunciados, { companyId: 'empresa', accountId: '', dark: false, brand: '#003E73', onAccountsLoaded: noop, onAccountSelectionLockedChange: noop, onPublishInAnotherAccount: noop });
  assert.match(html, /aria-label="Recolher Anunciados"/);
  assert.match(html, /aria-controls="announced-content"/);
  assert.ok(!html.includes('id="announced-content" hidden'));
  assert.ok(html.indexOf('Recolher Anunciados') < html.indexOf('Pesquisar'));
});

test('cabeçalho de Anunciados reutiliza os estilos de Vendas sem sobrepor Expandir', () => {
  const props = { companyId: 'empresa', accountId: '', dark: false, brand: '#003E73', onAccountsLoaded: noop, onAccountSelectionLockedChange: noop, onPublishInAnotherAccount: noop };
  const announced = render(Anunciados, props);
  const sales = render(Vendas, { ...salesProps, expanded: true });
  assert.match(announced, /class="refreshSales"[^>]*>Atualizar<\/button>/);
  assert.match(sales, /class="refreshSales"[^>]*>Atualizar<\/button>/);
  for (const html of [announced, sales]) {
    assert.match(html, /min-h-12[^\"]*text-xs font-semibold/);
    assert.match(html, /color:#003E73;background-color:#ffffff;border-color:#cbd5e1/);
  }
  const css = readFileSync(resolve(root, 'app/marketplaces/marketplaces.module.css'), 'utf8');
  assert.equal((css.match(/:not\(:where\(\.panelHeadingActions button\)\)/g) || []).length, 2);
});

test('controles do cabeçalho usam Tooltip oficial, sem balão nativo duplicado no arraste', () => {
  for (const [file, text] of [['Anunciados.tsx', 'Atualizar anúncios da conta selecionada'], ['Vendas.tsx', 'Atualizar vendas e envios']]) {
    const source = readFileSync(resolve(root, `app/marketplaces/${file}`), 'utf8');
    assert.match(source, /import Tooltip from '@\/app\/components\/Tooltip'/);
    assert.ok(source.includes(`<Tooltip texto="${text}"><button`));
  }
  const kanban = readFileSync(resolve(root, 'app/components/AvantaKanban.tsx'), 'utf8');
  assert.match(kanban, /import Tooltip from '\.\/Tooltip'/);
  assert.ok(kanban.includes('texto="segure arraste para mudar a ordem"'));
  assert.ok(!kanban.includes('title={`Arrastar para organizar'));
});

test('sino expande Vendas antes de levar ao bloco, sem alterar escopo da conta de anúncios', () => {
  const source = readFileSync(resolve(root, 'app/marketplaces/MarketplacesClient.tsx'), 'utf8');
  assert.match(source, /setSalesExpanded\(true\); setSalesAccount\(''\); document\.getElementById\('sales-title'\)/);
  assert.match(source, /expanded=\{salesExpanded\} onExpandedChange=\{setSalesExpanded\}/);
});
