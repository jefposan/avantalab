import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { salesSummary } from '../../app/modules/marketplaces/sales-status.ts';

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
const { default: ProductsStock } = await import(pathToFileURL(resolve(root, 'app/marketplaces/ProductsStock.tsx')).href);
const { default: AvantaKanban } = await import(pathToFileURL(resolve(root, 'app/components/AvantaKanban.tsx')).href);
const { default: DateOrderButton } = await import(pathToFileURL(resolve(root, 'app/marketplaces/DateOrderButton.tsx')).href);
const { default: FiltroCompetencia } = await import(pathToFileURL(resolve(root, 'app/recebimentos/components/FiltroCompetencia.tsx')).href);
const { default: ModuloHeader } = await import(pathToFileURL(resolve(root, 'app/components/ModuloHeader.tsx')).href);
const { default: MarketplaceSelect } = await import(pathToFileURL(resolve(root, 'app/marketplaces/MarketplaceSelect.tsx')).href);
const { Icon: OfficialIcon } = await import(pathToFileURL(resolve(root, 'app/projetos/components/Icon.tsx')).href);
hooks.deregister();
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const noop = () => {};
const salesProps = { companyId: 'empresa', accountId: '', onAccountChange: noop, group: '', onGroupChange: noop, counts: salesSummary([], '').byGroup, total: 0, accounts: [], sales: [], canManage: false, loading: false, error: '', awaitingUpdates: 0, onRefresh: noop, onSaleUpdated: noop, onExpandedChange: noop, dark: false, brand: '#003E73' };

test('ícone compartilhado refresh usa quatro traços completos e cantos arredondados', () => {
  const html = render(OfficialIcon, { name: 'refresh', size: 20 });
  assert.match(html, /viewBox="0 0 24 24"/);
  assert.match(html, /stroke-linecap="round" stroke-linejoin="round"/);
  assert.equal((html.match(/<path /g) || []).length, 4);
  assert.match(html, /d="M21 3v5h-5"/);
  assert.match(html, /d="M8 16H3v5"/);
});
test('competência adiciona tooltips somente por opção, mantendo botões, datas e textos anteriores', () => {
  const props = { referencia: { ano: 2026, mes: 9 }, todos: false, onMudarMes: noop, onMostrarTodos: noop };
  const original = render(FiltroCompetencia, props), helped = render(FiltroCompetencia, { ...props, tooltipPosition: 'bottom' });
  assert.equal((original.match(/class="inline-flex /g) || []).length, 0);
  assert.equal((helped.match(/class="inline-flex /g) || []).length, 3);
  for (const html of [original, helped]) {
    assert.equal((html.match(/<button /g) || []).length, 3);
    assert.match(html, /Mês anterior/); assert.match(html, /Próximo mês/); assert.match(html, /OUT/); assert.match(html, /2026/); assert.match(html, /Todos/);
  }
});
test('retorno e seletor preservam estrutura padrão quando não recebem tooltip', () => {
  const headerProps = { empresa: { nome: 'Empresa', corPrimaria: '#003E73', temaEscuro: false }, onBack: noop };
  assert.doesNotMatch(render(ModuloHeader, headerProps), /class="inline-flex /);
  assert.match(render(ModuloHeader, { ...headerProps, returnTooltip: 'Voltar', returnTooltipPosition: 'bottom' }), /class="inline-flex /);
  const selectProps = { label: '', ariaLabel: 'Situação', value: '', options: [{ value: '', label: 'Todas' }], placeholder: 'Todas', onChange: noop };
  assert.doesNotMatch(render(MarketplaceSelect, selectProps), /class="inline-flex w-full"/);
  const helped = render(MarketplaceSelect, { ...selectProps, tooltipText: 'Filtrar vendas', tooltipPosition: 'bottom' });
  assert.match(helped, /class="inline-flex w-full"/);
  assert.match(helped, /aria-label="Situação"/); assert.match(helped, /aria-haspopup="listbox"/); assert.match(helped, /aria-expanded="false"/);
});
test('cabeçalho de Marketplaces configura tooltip inferior em cada controle, sem titles duplicados', () => {
  const read = file => readFileSync(resolve(root, file), 'utf8');
  const client = read('app/marketplaces/MarketplacesClient.tsx');
  const header = client.slice(client.indexOf('<ModuloHeader'), client.indexOf('</ModuloHeader>'));
  assert.match(header, /returnTooltipPosition="bottom"/);
  assert.equal((header.match(/posicao="bottom"/g) || []).length, 2);
  assert.match(header, /<Icon name="refresh" size=\{20\}/);
  assert.match(header, /<Tooltip posicao="bottom" texto="Atualizar anuncios">/);
  assert.doesNotMatch(header, /title=|M20 7v5h-5/);
  const filters = read('app/marketplaces/SalesFilters.tsx');
  assert.equal((filters.match(/tooltipPosition="bottom"/g) || []).length, 2);
  assert.match(filters, /<Tooltip[^>]*posicao="bottom"><button/);
  assert.doesNotMatch(filters, /title=\{custom/);
});

test('botão de data alterna nos dois sentidos com rótulo acessível e tooltip oficial', () => {
  for (const context of ['Vendas', 'Anunciados']) for (const order of ['asc', 'desc']) {
    let next;
    const props = { context, order, onChange: (value) => { next = value; } };
    const element = DateOrderButton(props);
    const button = element.props.children;
    button.props.onClick();
    assert.equal(next, order === 'asc' ? 'desc' : 'asc');
    assert.match(element.props.texto, new RegExp(`${context}:`));
    assert.equal(button.props['aria-label'], element.props.texto);
    const html = render(DateOrderButton, props);
    assert.match(html, new RegExp(order === 'desc' ? 'Mais recentes' : 'Mais antigas'));
    assert.match(render(DateOrderButton, { ...props, disabled: true }), /disabled=""/);
  }
});

test('Vendas renderiza datas mais recentes primeiro sem modificar os dados recebidos', () => {
  const make = (id, soldAt) => ({ id, orderId: id, connectionId: 'conta', soldAt, status: 'paid', labelStatus: 'unavailable', items: [] });
  const sales = [make('1001', '2026-10-01T10:00:00Z'), make('1003', '2026-10-11T10:00:00Z'), make('1002', '2026-10-05T10:00:00Z')];
  const html = render(Vendas, { ...salesProps, sales, expanded: true });
  assert.ok(html.indexOf('Pedido #1003') < html.indexOf('Pedido #1002'));
  assert.ok(html.indexOf('Pedido #1002') < html.indexOf('Pedido #1001'));
  assert.deepEqual(sales.map((sale) => sale.id), ['1001', '1003', '1002']);
});

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

test('Vendas agrupa conta e situação no mesmo trecho, com seleção controlada e layout responsivo', () => {
  const html = render(Vendas, { ...salesProps, expanded: true, group: 'delivered', counts: { ...salesProps.counts, delivered: 6 }, total: 10 });
  assert.match(html, /class="salesListFilters"/);
  assert.match(html, /Conta das vendas/); assert.match(html, /Situação/);
  assert.match(html, /Entregues/); assert.match(html, />6<\/small>/);
  assert.match(html, /Vale a última situação escolhida/);
  assert.ok(html.indexOf('Conta das vendas') < html.indexOf('Vale a última situação escolhida'));
  const css = readFileSync(resolve(root, 'app/marketplaces/marketplaces.module.css'), 'utf8');
  assert.match(css, /\.salesListFilters \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 760px\) \{ \.salesListFilters \{ grid-template-columns: minmax\(0, 1fr\)/);
});

test('Anunciados inicia recolhido com controle próprio no topo e filtros montados', () => {
  const html = render(Anunciados, { companyId: 'empresa', accountId: '', dark: false, brand: '#003E73', onAccountsLoaded: noop, onAccountSelectionLockedChange: noop, onPublishInAnotherAccount: noop });
  assert.match(html, /aria-label="Expandir Anunciados" aria-expanded="false"/);
  assert.match(html, /aria-controls="announced-content"/);
  assert.match(html, /id="announced-content" hidden=""/);
  assert.ok(html.indexOf('Expandir Anunciados') < html.indexOf('Pesquisar'));
  assert.match(html, /aria-label="Conta dos anúncios"/);
  assert.ok(html.indexOf('Conta dos anúncios') < html.indexOf('id="announced-content"'));
  assert.match(html, /Todas as contas/);
  const source = readFileSync(resolve(root, 'app/marketplaces/Anunciados.tsx'), 'utf8');
  assert.match(source, /const \[accountSelection, setAccountId\] = useState\(''\)/);
  assert.match(source, /const \[status, setStatus\] = useState\(''\)/);
  assert.match(source, /<ListingEditor[^>]*accountId=\{sourceAccountId\}/);
  assert.match(source, /onPublishInAnotherAccount\(sourceAccountId, item.id, copyTargetId\)/);
});

test('Produtos e estoque inicia recolhido sem remover as ações da área expansível', () => {
  const html = render(ProductsStock, { companyId: 'empresa', dark: false, brand: '#003E73', canManage: true, accounts: [], refreshKey: 0, preparationLocked: false, onPrepare: noop });
  assert.match(html, /aria-label="Expandir produtos e estoque" aria-expanded="false"/);
  assert.match(html, /aria-controls="products-content"/);
  assert.match(html, /id="products-content" hidden=""/);
  assert.ok(html.indexOf('Expandir produtos e estoque') < html.indexOf('Novo produto'));
  assert.match(html, /Carregar estoque dos anúncios/);
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

test('barra compacta dos produtos mantém busca e três ações juntas, respeitando permissões e mobile', () => {
  const props = { companyId: 'empresa', dark: false, brand: '#003E73', accounts: [], refreshKey: 0, preparationLocked: false, onPrepare: noop };
  const html = render(ProductsStock, { ...props, canManage: true });
  const toolbar = html.slice(html.indexOf('class="localToolbar"'), html.indexOf('class="localProducts"'));
  assert.match(toolbar, /id="local-product-search"/);
  assert.match(toolbar, /Novo produto/);
  assert.match(toolbar, /Importar anúncios existentes/);
  assert.match(toolbar, /id="load-listing-stock-button"/);
  assert.ok(!toolbar.includes('class="actionBar"'));
  assert.equal((html.match(/id="load-listing-stock-button"/g) || []).length, 1);
  const readonly = render(ProductsStock, { ...props, canManage: false });
  assert.match(readonly, /id="local-product-search"/);
  for (const text of ['Novo produto', 'Importar anúncios existentes', 'load-listing-stock-button']) assert.ok(!readonly.includes(text));
  const css = readFileSync(resolve(root, 'app/marketplaces/marketplaces.module.css'), 'utf8');
  assert.match(css, /\.localToolbar > div:first-child \{ flex: 1 1 200px; min-width: 180px; max-width: 360px; \}/);
  assert.match(css, /\.listingsPanel \.localToolbar > span > button \{ padding-inline: 10px !important; font-size: 14px !important; white-space: nowrap; \}/);
  assert.match(css, /\.localToolbar > div:first-child \{ flex-basis: 100%; min-width: 0; max-width: none; \}/);
  assert.match(css, /\.listingsPanel \.localToolbar > span > button \{ width: 100%; min-height: 48px !important; white-space: normal; \}/);
});

test('controles do cabeçalho usam Tooltip oficial, sem balão nativo duplicado no arraste', () => {
  for (const [file, text] of [['Anunciados.tsx', 'Atualizar anúncios das contas selecionadas'], ['Vendas.tsx', 'Atualizar vendas e envios']]) {
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
