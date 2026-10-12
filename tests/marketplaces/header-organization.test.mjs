import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`,import.meta.url),'utf8');
const client=read('app/marketplaces/MarketplacesClient.tsx');
const filters=read('app/marketplaces/SalesFilters.tsx');
const css=read('app/marketplaces/marketplaces.module.css');

test('Todas permanece no topo e situações seguem as contagens, sem mudar seleção',()=>{
  assert.match(filters,/options=\{\[\s*\{ value: '', label: 'Todas', detail: String\(total\) \},\s*\.\.\.orderedSaleGroups\(counts\)\.map/);
  assert.match(filters,/value=\{group\}/);
});

test('três grupos visíveis reutilizam os filtros e os handlers originais',()=>{
  assert.match(client,/className=\{styles.headerToolbar\}/);
  assert.match(filters,/Período das vendas/);
  assert.match(filters,/label="Situação das vendas"/);
  assert.match(client,/Atualização e avisos/);
  assert.match(filters,/todosLabel="Todo o período"/);
  assert.match(filters,/Selecionar datas/);
  assert.match(client,/className=\{styles.headerButtonText\}>Atualizar/);
  assert.match(client,/className=\{styles.headerButtonText\}>Ver vendas/);
  assert.match(client,/setSalesExpanded\(true\); setSalesAccount\(''\)/);
  assert.match(client,/\{pendingSalesTotal\} vendas nos filtros selecionados/);
  assert.match(client,/updatesAvailable \|\| liveUnavailable/);
  assert.match(filters,/onPeriodChange\(draft\); setOpen\(false\)/);
  assert.match(filters,/onGroupChange\(value as SaleGroup \| ''\)/);
});
test('opções de apresentação são aditivas, sem alterar defaults de outros módulos',()=>{
  const date=read('app/recebimentos/components/FiltroCompetencia.tsx');
  const select=read('app/marketplaces/MarketplaceSelect.tsx');
  assert.match(date,/todosLabel\?: string/);
  assert.match(date,/todosLabel = 'Todos'/);
  assert.match(date,/onClick=\{onMostrarTodos\}/);
  assert.match(select,/leadingIcon\?: ReactNode/);
  assert.match(select,/detailAsBadge = false/);
  assert.match(select,/selected.detail \? ` · \$\{selected.detail\}` : ''/);
  assert.match(select,/aria-labelledby=\{label \? `\$\{labelId\} \$\{valueId\}`/);
  assert.match(select,/event.key === 'Escape'/);
});
test('cabeçalho conserva alturas responsivas e alvos de toque sem fixar menus',()=>{
  for(const height of [80,125,173,229]) assert.match(css,new RegExp(`--module-header-height: ${height}px`));
  assert.match(css,/grid-template-rows: 14px auto; gap: 3px/);
  assert.match(css,/inset: -6px 0/);
  assert.match(css,/height: 36px/);
  assert.match(css,/min-width: 48px/);
  assert.match(css,/\.dark \.headerGroupLabel/);
  assert.match(css,/\.dark \.selectCount/);
  assert.match(filters,/tooltipPosition="bottom"/);
  assert.match(client,/Tooltip posicao="bottom" texto="Atualizar anuncios"/);
  assert.match(filters,/aria-haspopup="dialog" aria-expanded=\{open\}/);
});
test('paleta suave fica isolada no cabeçalho e contador de vendas permanece interno',()=>{
  assert.match(css,/\.headerToolbar \{ --header-filter-accent: #003e73/);
  assert.match(css,/\.page \.headerToolbar \.salesNotification \{ color: #fff; border-color: var\(--brand\); background: var\(--brand\)/);
  assert.match(css,/\.headerToolbar \.salesNotification b \{ position: static; flex: 0 0 auto/);
  assert.match(css,/\.page \.headerToolbar \.selectTrigger \{[^}]*background: var\(--header-filter-soft\)/);
  assert.match(css,/\.page \.headerToolbar \.salesDateFilters button\[aria-pressed="true"\] \{ border-color: var\(--header-filter-selected-border\)/);
  assert.match(css,/\.dark \.headerToolbar \{ --header-filter-text: #e2e8f0/);
  assert.match(css,/\.salesNotification:hover:not\(:disabled\)/);
});
test('opções de situação ficam compactas em uma linha sem alterar outros seletores',()=>{
  assert.match(css,/\.headerToolbar \.salesStatusFilter \.selectList \{[^}]*width: max-content;[^}]*max-width: calc\(100vw - 32px\)/);
  assert.match(css,/\.headerToolbar \.salesStatusFilter \.selectList button \{ display: flex;[^}]*font-size: 11px/);
  assert.match(css,/\.headerToolbar \.salesStatusFilter \.selectList button > span \{ white-space: nowrap/);
  assert.match(css,/\.headerToolbar \.salesStatusFilter \.selectList small \{ flex: 0 0 auto/);
  assert.match(css,/\.headerToolbar \.salesStatusFilter \.selectList \{ left: 0; right: auto/);
  assert.match(css,/\.selectList button \{ display: grid/);
  assert.match(css,/min-width: max\(100%, 232px\)/);
  assert.match(css,/\.headerToolbar \.salesStatusFilter \.selectList button \{[^}]*min-height: 36px; height: 36px/);
  assert.match(css,/@media \(pointer: coarse\) \{ \.headerToolbar \.salesStatusFilter \.selectList button \{ min-height: 44px; height: 44px/);
});
test('botões do header têm duas reduções de 10% sem reduzir a área interativa ou as opções',()=>{
  assert.match(css,/--header-control-height: 35\.64px; --header-return-height: 29\.16px; --header-touch-height: 44px/);
  assert.match(css,/--header-control-height: 29\.16px; --header-return-height: 30\.78px; --header-touch-height: 48px/);
  assert.match(css,/\.page \.headerToolbar :is\(\.headerTextAction, \.selectTrigger, \.salesDateFilters button\) \{[^}]*height: var\(--header-control-height\)/);
  assert.match(css,/inset: auto 0; top: 50%; height: var\(--header-touch-height\); transform: translateY\(-50%\)/);
  assert.match(css,/\.headerToolbar \.salesDateFilters > \[aria-label="Filtro por competência"\] > div \{ height: var\(--header-control-height\); overflow: visible/);
});
