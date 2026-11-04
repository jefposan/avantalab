import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { formatarMoedaDigitada } from '../../app/lib/formatters.ts';
import { parseLotCost } from '../../app/modules/marketplaces/price-lots.ts';

const app = readFileSync('app/marketplaces/consulta/MarketplaceMobileApp.tsx', 'utf8');
const preview = readFileSync('app/marketplaces/consulta/validacao-visual/page.tsx', 'utf8');
const css = readFileSync('app/marketplaces/price-lots.module.css', 'utf8');

test('topo da consulta e prévia têm somente os dois acessos de lote solicitados', () => {
  for (const source of [app, preview]) {
    const bar = source.match(/<section className=\{lotStyles.captureBar\}[\s\S]*?<\/section>/)?.[0];
    assert.ok(bar);
    assert.equal((bar.match(/<button /g) || []).length, 2);
    assert.match(bar, />Criar Lote<\/button>/);
    assert.match(bar, />Editar Lotes<\/button>/);
    assert.ok(!source.includes('Qual é o preço?'));
    assert.ok(!source.includes('Leia o código do produto e compare em poucos segundos.'));
    assert.ok(!source.includes('Modo comum · consulta de preços'));
  }
  assert.match(app, /setLotsPanel\(\{create:true\}\)/);
  assert.match(app, /setLotsPanel\(\{\}\)/);
});

test('dois botões usam colunas iguais sem quebra e preservam os controles do lote ativo', () => {
  const bar = css.match(/\.captureBar \{([^}]+)\}/)?.[1];
  assert.match(bar, /display:grid/);
  assert.match(bar, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.captureBar button \{ width:100%; \}/);
  assert.match(app, /lotCapture.active && <section className=\{lotStyles.activeLotBar\}/);
  assert.match(app, /Ver lote e totais/);
  assert.match(app, /lotCapture.activate\(null\)/);
});

test('edição compacta mantém três ações curtas e o aviso explícito de reabertura', () => {
  const panel = readFileSync('app/marketplaces/PriceLotsPanel.tsx', 'utf8');
  assert.match(panel, /detail \? 'Salvar'/);
  assert.match(panel, /name="intent" value="continue"[\s\S]*?>Salvar e continuar<\/button>/);
  assert.match(panel, /Salvar e continuar reabre este lote para novas leituras/);
  assert.match(panel, /aria-describedby=\{detail.lot.status === 'closed' \? 'lot-reopen-notice'/);
  assert.match(panel, /rows=\{2\}/);
  assert.match(css, /\.formActions.withContinue \{ display:grid;grid-template-columns:max-content max-content minmax\(0,1fr\); \}/);
  assert.match(css, /\.compactForm \.form \{ gap:12px; \}/);
});

test('data e custo compartilham a linha e a máscara oficial preserva centavos e ausência', () => {
  const panel = readFileSync('app/marketplaces/PriceLotsPanel.tsx', 'utf8');
  assert.match(panel, /styles.dateCostRow/);
  assert.match(css, /\.dateCostRow \{ display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(panel, /formatarMoedaDigitada\(String\(lot.purchase_cost_cents\)\)/);
  assert.match(panel, /formatarMoedaDigitada\(input.value\)/);
  assert.match(panel, /function positionLotCostCursor\(input: HTMLInputElement\) \{ input.setSelectionRange\(input.value.length, input.value.length\); \}/);
  assert.match(panel, /onClick=\{event => positionLotCostCursor\(event.currentTarget\)\}/);
  for (const [digits, masked, cents] of [['1','0,01',1],['12','0,12',12],['123','1,23',123],['123456','1.234,56',123456],['0','0,00',0]]) {
    assert.equal(formatarMoedaDigitada(digits),masked);
    assert.equal(parseLotCost(masked),cents);
  }
  assert.equal(formatarMoedaDigitada(''),'');
  assert.equal(parseLotCost(formatarMoedaDigitada('')),null);
});

test('campos do lote não excedem a coluna, data centraliza e custo alinha à direita sem legenda opcional', () => {
  const panel = readFileSync('app/marketplaces/PriceLotsPanel.tsx', 'utf8');
  assert.match(css, /\.dateCostRow \{[^}]*gap:16px/);
  assert.match(css, /\.dateCostRow label,\.dateCostRow input \{[^}]*box-sizing:border-box;min-width:0;min-inline-size:0;width:100%;max-width:100%/);
  assert.match(panel, /<CampoData anoCurto required value=\{draft.receivedOn\}/);
  const dateCss = readFileSync('app/components/CampoData.module.css', 'utf8');
  assert.match(dateCss, /\.display \{[^}]*text-align:center/);
  assert.match(dateCss, /\.field \{[^}]*overflow:hidden/);
  assert.match(dateCss, /\.field input.native \{ position:absolute;inset:0;box-sizing:border-box;width:100%;height:100%;min-width:0;min-inline-size:0;max-width:100%/);
  assert.match(css, /input\[inputmode="numeric"\] \{ text-align:right/);
  assert.ok(!panel.includes('styles.optional'));
  const cost = panel.match(/<input aria-label="Valor de custo do lote \(R\$\)"[\s\S]*?<\/label>/)?.[0];
  assert.ok(cost);
  assert.ok(!cost.includes('required'));
});

test('ações de criação ocupam duas colunas iguais e leitura reutiliza o verde do Ler EAN', () => {
  const panel = readFileSync('app/marketplaces/PriceLotsPanel.tsx', 'utf8');
  const mobileCss = readFileSync('app/marketplaces/consulta/marketplaces-mobile.module.css', 'utf8');
  const globals = readFileSync('app/globals.css', 'utf8');
  assert.match(panel, /styles.actions\} \$\{styles.lotChoice/);
  assert.match(css, /\.actions.lotChoice \{ display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.formActions \{ display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.panel \.formActions:not\(\.withContinue\) button \{[^}]*width:100%;white-space:normal/);
  assert.match(panel, /onActivate \? styles.readingAction : styles.primary/);
  assert.match(panel, /name="intent" value="continue" className=\{styles.readingAction\}/);
  assert.match(css, /\.panel \.readingAction \{ background:var\(--av-ean-reading-background\)/);
  assert.match(mobileCss, /\.scanButton \{[^}]*background: var\(--av-ean-reading-background\)/);
  assert.match(globals, /--av-ean-reading-background: linear-gradient\(145deg, #1fb6ad, #0b8f9a\)/);
});

test('lista de lotes tem Atualizar à esquerda e Criar novo à direita com a mesma grade igualitária', () => {
  const panel = readFileSync('app/marketplaces/PriceLotsPanel.tsx', 'utf8');
  const actions = panel.match(/<div className=\{`\$\{styles.actions\} \$\{styles.lotChoice\} \$\{!canEdit \? styles.singleAction : ''\}`\} role="group" aria-label="Ações dos lotes">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(actions);
  assert.match(actions, /onClick=\{\(\) => void load\(\)\}>Atualizar<\/button>\{canEdit && <button[\s\S]*onClick=\{newLot\}>Criar novo lote<\/button>/);
  assert.match(css, /\.actions.singleAction \{ grid-template-columns:minmax\(0,1fr\); \}/);
});

test('lote ativo mantém nome acima e duas ações iguais na mesma linha, sem mudar seus destinos', () => {
  assert.match(css, /\.activeLotBar \{[^}]*box-sizing:border-box;[^}]*display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.activeLotBar strong \{ grid-column:1\/-1;min-width:0;overflow-wrap:anywhere; \}/);
  assert.match(css, /\.activeLotBar button \{ box-sizing:border-box;width:100%;white-space:normal;overflow-wrap:anywhere; \}/);
  const active = app.match(/lotCapture.active && <section className=\{lotStyles.activeLotBar\}[\s\S]*?<\/section>/)?.[0];
  assert.ok(active);
  assert.equal((active.match(/<button /g) || []).length, 2);
  assert.match(active, /setLotsPanel\(\{id:lotCapture.active!\.lot.id\}\)/);
  assert.match(active, /lotCapture.activate\(null\)/);
  assert.match(active, /Ver lote e totais/);
  assert.match(active, /Voltar ao modo comum/);
});

test('conferência do lote distribui ações visíveis igualmente sem mudar ordem ou permissões', () => {
  const panel = readFileSync('app/marketplaces/PriceLotsPanel.tsx', 'utf8');
  const actions = panel.match(/<div className=\{`\$\{styles.actions\} \$\{styles.detailActions\}`\} role="group" aria-label="Ações do lote">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(actions);
  assert.match(actions, />Todos os lotes<\/button>\{canEdit && <button[\s\S]*>Editar lote<\/button>\}<button[\s\S]*>Atualizar<\/button>/);
  assert.match(actions, /void load\(detail.lot.id\)/);
  assert.match(css, /\.actions.detailActions \{ display:grid;grid-auto-flow:column;grid-auto-columns:minmax\(0,1fr\); \}/);
  assert.match(css, /\.panel \.detailActions button \{ box-sizing:border-box;min-width:0;width:100%;white-space:normal;overflow-wrap:anywhere; \}/);
});

test('concluir e continuar leituras reutilizam a grade igualitária e a cor de leitura preservando as guardas', () => {
  const panel = readFileSync('app/marketplaces/PriceLotsPanel.tsx', 'utf8');
  const actions = panel.match(/<div className=\{`\$\{styles.actions\} \$\{styles.detailActions\}`\} role="group" aria-label="Conferência e leituras do lote">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(actions);
  assert.equal((actions.match(/<button /g) || []).length, 2);
  assert.match(actions, /\{canEdit && <button/);
  assert.match(actions, /\{canEdit && onActivate && <button type="button" className=\{styles.readingAction\}/);
  assert.match(actions, /mutate\('status', \{ status: detail.lot.status === 'open' \? 'closed' : 'open' \}\)/);
  assert.match(actions, /continueLot\(detail.lot\)/);
  assert.match(actions, /'Concluir conferência' : 'Reabrir conferência'/);
  assert.match(actions, /'Reabrir e continuar leituras' : 'Continuar leituras neste lote'/);
});

test('card de lote salvo usa ações iguais em linha completa e continuidade verde, sem mudar operações', () => {
  const panel = readFileSync('app/marketplaces/PriceLotsPanel.tsx', 'utf8');
  const saved = panel.slice(panel.indexOf('<div className={styles.savedList}>'));
  assert.match(saved, /\{canEdit && <div className=\{`\$\{styles.actions\} \$\{styles.detailActions\}`\} role="group" aria-label=\{`Ações do lote \$\{lot.name\}`\}/);
  assert.match(saved, /void load\(lot.id, false, true\)/);
  assert.match(saved, /\{onActivate && <button type="button" className=\{styles.readingAction\} disabled=\{busy \|\| loading\}/);
  assert.match(saved, /void continueLot\(lot\)/);
  assert.match(saved, /'Reabrir e continuar' : 'Continuar leituras'/);
  assert.match(css, /\.savedLot \.detailActions button \{ place-items:center;text-align:center; \}/);
});
