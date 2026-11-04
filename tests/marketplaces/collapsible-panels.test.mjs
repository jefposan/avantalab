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
    if (specifier === 'next/image') return next('next/image.js', context);
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
const { DirectSaleRow } = await import(pathToFileURL(resolve(root, 'app/marketplaces/DirectSalesHistory.tsx')).href);
const { default: ProductsStock, LocalProductHeader, ProductDetail } = await import(pathToFileURL(resolve(root, 'app/marketplaces/ProductsStock.tsx')).href);
const { ReferencePriceEditor } = await import(pathToFileURL(resolve(root, 'app/marketplaces/LocalProductPricing.tsx')).href);
const { default: AvantaKanban } = await import(pathToFileURL(resolve(root, 'app/components/AvantaKanban.tsx')).href);
const { default: DateOrderButton } = await import(pathToFileURL(resolve(root, 'app/marketplaces/DateOrderButton.tsx')).href);
const { default: FiltroCompetencia } = await import(pathToFileURL(resolve(root, 'app/recebimentos/components/FiltroCompetencia.tsx')).href);
const { default: ModuloHeader } = await import(pathToFileURL(resolve(root, 'app/components/ModuloHeader.tsx')).href);
const { default: MarketplaceSelect } = await import(pathToFileURL(resolve(root, 'app/marketplaces/MarketplaceSelect.tsx')).href);
const { Icon: OfficialIcon } = await import(pathToFileURL(resolve(root, 'app/projetos/components/Icon.tsx')).href);
hooks.deregister();
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const noop = () => {};
test('produto expandido separa cadastro, estoque, publicação e históricos sem ações soltas',()=>{
 const product={id:'p',sku:'SKU-1',ean:'7891129598607',name:'Produto',description:'Descrição',pictures:[],price_cents:20000,stock_quantity:3,total_stock_quantity:5,revision:1,links:[],attributes:[],publication_form:{},allocations:[{warehouseId:'w',name:'Online',quantity:3}]};
 const props={companyId:'company',canManage:true,accounts:[],preparationLocked:false,dark:false,brand:'#003e73',onPrepare:noop,request:async()=>({})};
 const html=render(ProductDetail,{product,props,busy:false,onCommand:noop,onStockBusy:noop,onStockUpdated:noop});
 for(const label of ['Cadastro do produto','Estoques do produto','Publicação do produto','Históricos do produto'])assert.ok(html.includes(`aria-label="${label}"`));
 assert.match(html,/class="productSummaryFacts"/);assert.match(html,/class="productPublishRow"/);assert.match(html,/class="productHistoryGrid"/);
 assert.match(html,/<details class="productDescription"><summary>Descrição e fotos/);
 assert.match(html,/Todos os estoques.*5 un. físicas/);
 const readonly=render(ProductDetail,{product,props:{...props,canManage:false},busy:false,onCommand:noop,onStockBusy:noop,onStockUpdated:noop});
 assert.doesNotMatch(readonly,/Editar cadastro|Preparar anúncio|Confirmar estoque/);assert.match(readonly,/Anúncios vinculados/);
 const css=readFileSync(resolve(root,'app/marketplaces/marketplaces.module.css'),'utf8');
 assert.equal(css.split('.listingsPanel button:not([data-av-action="compact"]):not(.primary)').length-1,2,'claro e escuro excluem botões oficiais');
 const stockCss=readFileSync(resolve(root,'app/marketplaces/price-product-stock.module.css'),'utf8');
 assert.match(stockCss,/\.heading > div:not\(\.headingActions\)/);assert.match(stockCss,/button:not\(\[data-av-action="compact"\]\)/);
});
test('referência usa pílula reservada, guarda leitura/edição no mesmo espaço e mantém permissões',()=>{
  const product={id:'produto',name:'Produto',price_cents:20000};
  const html=render(ReferencePriceEditor,{product,disabled:false,canEdit:true,onSave:noop});
  assert.match(html,/class="referencePriceShell"><span class="referencePrice"/);
  assert.match(html,/Referência:/);assert.match(html,/200,00/);
  assert.match(html,/aria-label="Editar preço de referência de Produto"/);
  assert.doesNotMatch(html,/<input|<form/);
  assert.doesNotMatch(render(ReferencePriceEditor,{product,disabled:false,canEdit:false,onSave:noop}),/<button/);
  assert.match(render(ReferencePriceEditor,{product,disabled:true,canEdit:true,onSave:noop}),/disabled=""/);
  const research=render(ReferencePriceEditor,{product,disabled:false,canEdit:true,onSave:noop,onResearch:noop});
  assert.match(research,/aria-label="Pesquisar e atualizar referência de Produto"/);
  assert.match(render(ReferencePriceEditor,{product,disabled:true,canEdit:true,onSave:noop,onResearch:noop,researching:true}),/aria-busy="true"/);
  assert.doesNotMatch(render(ReferencePriceEditor,{product,disabled:false,canEdit:false,onSave:noop,onResearch:noop}),/Pesquisar e atualizar/);
  const css=readFileSync(resolve(root,'app/marketplaces/marketplaces.module.css'),'utf8');
  assert.match(css,/\.referencePrice,\.referencePriceEditor \{[^}]*height:32px;[^}]*border-radius:999px/);
  assert.match(css,/\.referencePriceShell \{ width:220px;max-width:100%/);
});
test('card compacto preserva ações, separa estoque e referência/sugestões e exibe só canais confirmados',()=>{
  const link=(provider,status,id)=>({id,connection_id:id,provider,provider_listing_id:id,status});
  const product={id:'produto',name:'Nome completo do produto',sku:'SKU-1',ean:'7891129598607',description:'Descrição longa fica nos detalhes',pictures:[],price_cents:20000,stock_quantity:0,revision:1,links:[link('mercado_livre','active','a'),link('mercado_livre','paused','b'),link('magalu','PUBLISHED','c'),link('shopee','draft','d')]};
  const props={product,expanded:false,canManage:true,busy:false,dark:false,brand:'#003E73',percentages:{minimum:50,medium:70,ideal:90},onToggle:noop,onCommand:noop};
  const html=render(LocalProductHeader,props);
  assert.match(html,/class="localProductFinancial"><div class="localProductNumbers"/);
  assert.ok(html.indexOf('Referência:')<html.indexOf('aria-label="Preços de venda"'));
  assert.match(html,/Online: 0 un\./);assert.match(html,/aria-label="Estoque do produto"/);assert.match(html,/aria-label="Preços sugeridos do produto"/);assert.doesNotMatch(html,/Descrição longa|anúncios vinculados|data-provider="shopee"/);
  assert.equal((html.match(/data-provider="mercado_livre"/g)||[]).length,1,html);
  assert.match(html,/data-provider="magalu"/);assert.doesNotMatch(html,/1 pausado/);
  assert.match(html,/100,00/);assert.match(html,/140,00/);assert.match(html,/180,00/);
  assert.match(html,/aria-label="Editar preço de referência de Nome completo do produto"/);
  assert.match(html,/aria-label="Pesquisar e atualizar referência de Nome completo do produto"/);
  assert.match(html,/aria-label="Expandir produto Nome completo do produto"/);
  assert.match(html,/class="productSalePriceLabel">Mínimo <small>· 50%<\/small>/);
  assert.doesNotMatch(render(LocalProductHeader,{...props,canManage:false}),/aria-label="Editar preço/);
  assert.match(render(LocalProductHeader,{...props,busy:true}),/disabled=""/);
  assert.match(render(LocalProductHeader,{...props,expanded:true}),/aria-label="Recolher produto/);
  assert.match(render(LocalProductHeader,{...props,product:{...product,links:[],stock_quantity:null,price_cents:null},percentages:null}),/Sem publicação/);
  assert.match(render(LocalProductHeader,{...props,product:{...product,links:[link('magalu','IN_REVIEW','d')]}}),/Sem anúncio ativo/);
  const providers=['mercado_livre','magalu','shopee','tiktok_shop','casas_bahia','amazon'];
  const all=render(LocalProductHeader,{...props,product:{...product,links:providers.map(provider=>link(provider,'active',provider))}});
  assert.deepEqual(Array.from(all.matchAll(/data-provider="([^"]+)"/g),match=>match[1]),providers);
  assert.doesNotMatch(all,/\+\d/);
  const css=readFileSync(resolve(root,'app/marketplaces/marketplaces.module.css'),'utf8');
  assert.match(css,/\.localProductChannels \{[^}]*display:grid;grid-template-columns:repeat\(4,max-content\)/);
  assert.match(css,/\.localProductHeading \{[^}]*grid-template-columns:56px minmax\(180px,1fr\) minmax\(430px,1.4fr\) auto/);
});
const salesProps = { companyId: 'empresa', accountId: '', onAccountChange: noop, group: '', onGroupChange: noop, counts: salesSummary([], '').byGroup, total: 0, accounts: [], marketplaceOptions: [], selectedMarketplaces: [], onMarketplacesChange: noop, sales: [], canManage: false, loading: false, error: '', awaitingUpdates: 0, onRefresh: noop, onSaleUpdated: noop, onExpandedChange: noop, dark: false, brand: '#003E73' };

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

test('Contas conectadas usa somente seta, preservando semântica, tema, alvo e acionamento', () => {
  for (const expandido of [true, false]) for (const darkMode of [true, false]) {
    const props = { variante: 'painel', modo: 'lista', somenteIcone: true, contexto: 'contas conectadas', controlsId: 'connected-accounts-content', expandido, darkMode, corPrimaria: '#cf0201', onClick: noop };
    const html = render(Toggle, props);
    const button = html.match(/<button\b[^>]*>([\s\S]*?)<\/button>/)[0];
    assert.match(button, /aria-controls="connected-accounts-content"/);
    assert.ok(button.includes(`aria-expanded="${expandido}"`));
    assert.ok(button.includes(`aria-label="${expandido ? 'Recolher' : 'Expandir'} contas conectadas"`));
    assert.match(button, /h-12 w-12 shrink-0/);
    assert.match(button, /background-color:transparent/);
    assert.match(button, /border-width:0;padding:0;width:48px;min-width:48px;box-shadow:none/);
    assert.doesNotMatch(button, /<span/);
    assert.ok(button.includes(expandido ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'));
    let clicked = false, stopped = false;
    Toggle({ ...props, onClick: () => { clicked = true; } }).props.children.props.onClick({ stopPropagation() { stopped = true; } });
    assert.ok(clicked && stopped);
  }
  assert.match(render(Toggle, { variante: 'painel', expandido: false, onClick: noop }), /<span>Expandir<\/span>/);
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

test('Vendas agrupa conta, situação e canais no mesmo trecho, com layout responsivo', () => {
  const html = render(Vendas, { ...salesProps, expanded: true, group: 'delivered', counts: { ...salesProps.counts, delivered: 6 }, total: 10 });
  assert.match(html, /class="salesListFilters"/);
  assert.match(html, /Conta das vendas/); assert.match(html, /Situação/); assert.match(html, /Canal de venda/);
  assert.match(html, /Entregues/); assert.match(html, />6<\/small>/);
  assert.match(html, /Vale a última situação escolhida/);
  assert.ok(html.indexOf('Conta das vendas') < html.indexOf('Situação'));
  assert.ok(html.indexOf('Situação') < html.indexOf('Canal de venda'));
  assert.ok(html.indexOf('Canal de venda') < html.indexOf('Vale a última situação escolhida'));
  const css = readFileSync(resolve(root, 'app/marketplaces/marketplaces.module.css'), 'utf8');
  assert.match(css, /\.salesListFilters \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
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

test('venda direta mostra canal, EAN, total e cancelamento sem etiqueta nem pós-venda de marketplace',()=>{
  const direct={id:'direct-sale',productId:'product',warehouseId:'stock',warehouseName:'Saldão',productName:'Air Fryer',ean:'7897180598754',picture:null,quantity:2,unitPriceCents:14000,totalCents:28000,soldOn:'2026-10-19',status:'confirmed',returnedQuantity:0,note:'Balcão',cancellationNote:null,revision:1,createdAt:'2026-10-19T12:00:00Z',updatedAt:'2026-10-19T12:00:00Z'};
  const sale={provider:'direct',directSale:direct,id:direct.id,connectionId:'warehouse:stock',orderId:direct.id,soldAt:'2026-10-19T12:00:00-03:00',status:'paid',shipmentId:null,shipmentStatus:null,shipmentSubstatus:null,labelStatus:'unavailable',seenAt:null,createdAt:direct.createdAt,updatedAt:direct.updatedAt,buyer:null,total:280,currency:'BRL',items:[]};
  const html=render(Vendas,{...salesProps,expanded:true,sales:[sale],canManage:false});
  assert.match(html,/Saldão.*Venda direta/);assert.match(html,/EAN:.*7897180598754/);assert.match(html,/Total confirmado nos filtros:.*280,00/);
  assert.doesNotMatch(html,/Imprimir etiqueta|etiqueta ainda não foi liberada|Cancelar venda|Pós-venda/);
  const cancelled=render(Vendas,{...salesProps,expanded:true,sales:[{...sale,status:'cancelled',directSale:{...direct,status:'cancelled'}}],canManage:false});
  assert.match(cancelled,/Venda cancelada/);assert.match(cancelled,/Total confirmado nos filtros: <strong>R\$[^<]*0,00/);
});

test('situação da venda direta não sugere devolução inexistente e separa devolução real do cancelamento',()=>{
  const sale={id:'sale',productId:'product',warehouseId:'stock',warehouseName:'SALDÃO',productName:'Chaleira',ean:'7898742840274',picture:null,quantity:1,unitPriceCents:11325,totalCents:11325,soldOn:'2026-10-20',status:'confirmed',returnedQuantity:0,note:'',cancellationNote:null,revision:1};
  const props={companyId:'company',sale,request:()=>{throw Error('Render não acessa rede');},canSell:true,onUpdated:noop};
  const confirmed=render(DirectSaleRow,props);assert.match(confirmed,/<p>Venda confirmada<\/p>/);assert.doesNotMatch(confirmed,/devolvi|Devolução/);assert.match(confirmed,/Cancelar venda/);
  const cancelled=render(DirectSaleRow,{...props,sale:{...sale,status:'cancelled',cancellationNote:'Cliente desistiu'}});assert.match(cancelled,/<p>Venda cancelada<\/p>/);assert.doesNotMatch(cancelled,/Devolução (?:total|parcial)/);assert.match(cancelled,/Cliente desistiu/);assert.match(cancelled,/Registrar devolução/);
  const partial=render(DirectSaleRow,{...props,sale:{...sale,status:'cancelled',quantity:2,returnedQuantity:1}});assert.match(partial,/Devolução parcial: 1 de 2 unidades\./);assert.match(partial,/Venda cancelada/);
  const full=render(DirectSaleRow,{...props,sale:{...sale,status:'cancelled',returnedQuantity:1}});assert.match(full,/Devolução total: 1 unidade\./);assert.doesNotMatch(full,/Registrar devolução/);
  const plural=render(DirectSaleRow,{...props,sale:{...sale,status:'cancelled',quantity:2,returnedQuantity:2}});assert.match(plural,/Devolução total: 2 unidades\./);
  assert.match(confirmed,/<section class="saleSection" aria-label="Situação da venda"><h4>Situação da venda<\/h4>/);
  assert.doesNotMatch(confirmed,/aria-label="Devoluções registradas"/);
  assert.match(partial,/aria-label="Situação da venda"[^]*?<\/section><section class="saleSection" aria-label="Devoluções registradas"><h4>Devoluções<\/h4>/);
  assert.match(cancelled,/Motivo do cancelamento: Cliente desistiu<\/p><\/section>/);
  const css=readFileSync(resolve(root,'app/marketplaces/direct-sales.module.css'),'utf8');
  assert.match(css,/\.saleSections \{[^}]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css,/\.saleSection \+ \.saleSection \{margin-top:18px;/);
});

test('Produtos inicia recolhido sem mostrar ações administrativas no cabeçalho', () => {
  const html = render(ProductsStock, { companyId: 'empresa', dark: false, brand: '#003E73', canManage: true, accounts: [], refreshKey: 0, preparationLocked: false, onPrepare: noop });
  assert.match(html, /aria-label="Expandir produtos cadastrados" aria-expanded="false"/);
  assert.match(html, /aria-controls="products-content"/);
  assert.match(html, /id="products-content" hidden=""/);
  assert.match(html,/Atualizar/);
  assert.doesNotMatch(html,/Novo produto|Importar anúncios existentes|Recuperar fotos|Carregar estoque dos anúncios/);
});

test('cabeçalho de Anunciados reutiliza os estilos de Vendas sem sobrepor Expandir', () => {
  const props = { companyId: 'empresa', accountId: '', dark: false, brand: '#003E73', onAccountsLoaded: noop, onAccountSelectionLockedChange: noop, onPublishInAnotherAccount: noop };
  const announced = render(Anunciados, props);
  const sales = render(Vendas, { ...salesProps, expanded: true });
  assert.match(announced, /data-av-action="compact"[^>]*><span[^>]*>Atualizar<\/span><\/button>/);
  assert.match(sales, /data-av-action="compact"[^>]*><span[^>]*>Atualizar<\/span><\/button>/);
  for (const html of [announced, sales]) {
    assert.match(html, /min-h-12[^\"]*text-xs font-semibold/);
    assert.match(html, /color:#003E73;background-color:transparent;border-color:#cbd5e1;border-width:0/);
  }
  const css = readFileSync(resolve(root, 'app/marketplaces/marketplaces.module.css'), 'utf8');
  assert.equal((css.match(/:not\(:where\(\.panelHeadingActions button\)\)/g) || []).length, 2);
});

test('busca permanece local e ações ficam no cabeçalho somente expandido, respeitando permissões', () => {
  const props = { companyId: 'empresa', dark: false, brand: '#003E73', accounts: [], refreshKey: 0, preparationLocked: false, onPrepare: noop };
  const html = render(ProductsStock, { ...props, canManage: true });
  assert.ok(html.indexOf('id="local-product-search"') < html.indexOf('id="products-content"'));
  assert.match(html, /Ler EAN/);
  const source=readFileSync(resolve(root,'app/marketplaces/ProductsStock.tsx'),'utf8');
  assert.match(source,/const registeredActions=canManage&&!warehouseId&&expanded\?/);
  assert.match(source,/Atualizar<\/BotaoAcaoCompacto><\/Tooltip>\{registeredActions\}<BotaoExpandirCard/);
  assert.match(source,/registeredProductActions[\s\S]*Novo produto[\s\S]*Importar anúncios existentes[\s\S]*Recuperar fotos[\s\S]*Carregar estoque dos anúncios/);
  assert.equal((source.match(/id="load-listing-stock-button"/g)||[]).length,1);
  assert.doesNotMatch(source,/Busca automática nos cadastros desta empresa/);
  assert.doesNotMatch(html,/Novo produto|Importar anúncios existentes|Recuperar fotos|load-listing-stock-button/);
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
    assert.ok(source.includes(`<Tooltip texto="${text}"><BotaoAcaoCompacto`));
  }
  const kanban = readFileSync(resolve(root, 'app/components/AvantaKanban.tsx'), 'utf8');
  assert.match(kanban, /import Tooltip from '\.\/Tooltip'/);
  assert.ok(kanban.includes('texto="segure arraste para mudar a ordem"'));
  assert.ok(!kanban.includes('title={`Arrastar para organizar'));
});

test('abertura da página inicia contas, vendas, anúncios e produtos recolhidos', () => {
  const client = readFileSync(resolve(root, 'app/marketplaces/MarketplacesClient.tsx'), 'utf8');
  assert.match(client, /\[connectedAccountsExpanded, setConnectedAccountsExpanded\] = useState\(false\)/);
  assert.match(client, /useMarketplacePanelGroup\(companyId\)/);
  const expansion=readFileSync(resolve(root,'app/marketplaces/panel-expansion.ts'),'utf8');
  assert.match(expansion,/useState<PanelExpansionState>\(\{companyId,active:''\}\)/);
  assert.match(expansion,/\[localExpanded,setLocalExpanded\]=useState\(false\)/);
  const announced = readFileSync(resolve(root, 'app/marketplaces/Anunciados.tsx'), 'utf8');
  assert.match(announced, /\[panelExpanded, setPanelExpanded\] = usePanelExpansion\(/);
  const products = readFileSync(resolve(root, 'app/marketplaces/ProductsStock.tsx'), 'utf8');
  assert.match(products, /\[expanded, setExpanded\] = usePanelExpansion\(props\)/);
  for (const source of [client, announced, products]) assert.ok(!/localStorage\.(?:getItem|setItem)\([^\n]*(?:Expanded|expanded)/.test(source));
});

test('sino expande Vendas antes de levar ao bloco, sem alterar escopo da conta de anúncios', () => {
  const source = readFileSync(resolve(root, 'app/marketplaces/MarketplacesClient.tsx'), 'utf8');
  assert.match(source, /setSalesExpanded\(true\); setSalesAccount\(''\); setSalesMarketplaces\(\[\]\); setSalesSnapshot\(sales\); scrollToSales\(\)/);
  assert.match(source, /expanded=\{salesExpanded\} onExpandedChange=\{setSalesExpanded\}/);
});
