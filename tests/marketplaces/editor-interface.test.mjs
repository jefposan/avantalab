import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const read=(file) => readFileSync(new URL(`../../${file}`,import.meta.url),'utf8');
const form=read('app/marketplaces/ListingEditor.tsx'),page=read('app/marketplaces/Anunciados.tsx'),route=read('app/api/modulos/marketplaces/anunciados/editar/route.ts'),css=read('app/marketplaces/marketplaces.module.css');
test('formulário comum permite salvar/cancelar, valida, protege descarte e usa formatação oficial', () => {
  for(const text of ['Salvar alterações','Cancelar','Descartar alterações?','Recarregar edição','changedFields','validateChanges','moedaDigitadaParaNumero','formatarMoedaDigitada','aria-describedby','aria-invalid','beforeunload']) assert.ok(form.includes(text),text);
  assert.match(form,/setStale\(true\)/);
  assert.match(form,/requestKey\.current/);
  assert.match(form,/document.getElementById.*?\.focus\(\)/);
});
test('atualização e filtros não descartam edição aberta; a conta é bloqueada no card Marketplace', () => {
  assert.match(page,/syncController.current \|\| acting \|\| expanded/);
  assert.match(page,/syncController.current\?\.abort\(\);\n    setExpanded/);
  assert.match(page,/<ListingEditor key=\{`\$\{accountId\}-\$\{item.id\}`\}/);
  assert.match(page,/disabled=\{!accountId \|\| account\?\.status !== 'connected' \|\| syncing \|\| acting \|\| !!expanded\}/);
  assert.match(page, /MarketplaceAccountPicker label="Conta de destino"/);
  const client = read('app/marketplaces/MarketplacesClient.tsx');
  assert.match(client,/disabled=\{accountSelectionLocked \|\| publicationBusy\}/);
});
test('os campos editáveis, incluindo tipo e taxa do anúncio, antecedem o EAN na mesma lista expandida', () => {
  const row = page.split('{expanded === item.id && <tr')[1];
  assert.ok(row.includes('<ListingEditor') && row.includes('<ListingData item={item} /></ListingEditor>'));
  assert.ok(page.indexOf('<ListingEditor') > page.indexOf('className={styles.tableScroll}'));
  assert.match(form, /<dl>[\s\S]*EDIT_FIELDS\.map[\s\S]*\{children\}[\s\S]*<\/dl>/);
  assert.doesNotMatch(form, /editorPanel|editorFields|<h3/);
});
test('nome base editável e bloqueios usam o tooltip compartilhado e campo correto da API', () => {
  const service = read('app/modules/marketplaces/services/mercadolivre-editor.ts');
  assert.match(service, /titleAssociationForItem/);
  assert.match(service, /body\[locked\.titleWriteField\] = changes\.title/);
  assert.match(form, /import Tooltip from '@\/app\/components\/Tooltip'/);
  assert.match(form, /<Tooltip texto=\{rule\?\.reason/);
  assert.match(form, /rule\?\.label \|\| labels\[field\]/);
});
test('falha na consulta preserva os campos visíveis sem permitir salvar dados em cache', () => {
  assert.match(page, /snapshot=\{item\}/);
  assert.match(form, /title: snapshot\.title, price: snapshot\.price, listingType: snapshot\.listingType \|\| '', stock: snapshot\.stock/);
  assert.match(form, /\{EDIT_FIELDS\.map\(\(field\) =>/);
  assert.doesNotMatch(form, /\{editor && EDIT_FIELDS\.map/);
  assert.match(form, /disabled = !editor \|\| !rule\?\.editable/);
  assert.match(form, /Estes dados são da última atualização e estão sem descrição\. Clique em “Recarregar edição” para tentar novamente\./);
  assert.doesNotMatch(form, /descrição não está no cache|restabelecer a consulta ao marketplace/i);
});
test('editor carrega os tipos autorizados e recalcula a taxa no preço selecionado', () => {
  const service = read('app/modules/marketplaces/services/mercadolivre-editor.ts');
  const feeRoute = read('app/api/modulos/marketplaces/anunciados/editar/taxa/route.ts');
  assert.match(form, /<MarketplaceSelect id=\{id\} label="" ariaLabel=\{label\} value=\{values\.listingType\}/);
  assert.match(form, /refreshListingTypeFee/);
  assert.match(form, /onBlur=\{field === 'price' \? \(\) => void refreshListingTypeFee\(\)/);
  assert.match(service, /available_listing_types\?category_id=/);
  assert.match(service, /\/items\/\$\{editor\.id\}\/listing_type`, 'POST', \{ id: changes\.listingType \}/);
  assert.match(feeRoute, /readMercadoLivreListingTypeFee/);
});
test('ações de publicação ficam disponíveis na própria edição e preservam alterações não salvas', () => {
  assert.match(form, /const lifecycleActions: Record<string, ListingAction\[]> = \{ active: \['pause', 'close'\], paused: \['resume', 'close'\], closed: \['delete'\] \}/);
  assert.match(form, /'Excluir definitivamente'/);
  assert.match(form, /const lifecycleDisabled = loading \|\| saving \|\| stale \|\| dirty;/);
  assert.match(form, /Salve ou cancele as alterações antes de mudar a situação do anúncio\./);
  assert.match(page, /onListingAction=\{\(action\) => setConfirmation\(\{ action, id: item\.id, name: item\.title, connectionId: accountId \}\)\}/);
  assert.match(page, /setExpanded\(''\);\n      setSyncNotice\('Ação confirmada pelo Mercado Livre\.'/);
  assert.match(css, /\.inlineEditorForm \.actionBar \.destructiveAction \{[^}]*color: #b42318;/);
});
test('publicar em outra conta ocupa a barra comum, à direita e com destaque contextual', () => {
  assert.match(page, /additionalAction=\{publishOtherAccountAction\}/);
  assert.equal((page.match(/>Publicar em outra conta<\/button>/g)||[]).length,1);
  assert.match(form, /Abrir no Mercado Livre ↗<\/a>\}[\s\S]*?\{additionalAction\}[\s\S]*?<\/div>/);
  assert.match(page, /aria-controls=\{`listing-copy-\$\{item\.id\}`\}/);
  assert.match(page, /Preparar este anúncio em outra conta para revisar antes de publicar/);
  assert.match(css, /\.publishOtherAccountAction \{[^}]*margin-inline-start: auto;/);
  assert.match(css, /button\.publishOtherAccountButton \{[^}]*background: color-mix\(in srgb, var\(--brand\) 10%, #fff\)/);
  assert.match(css, /\.dark \.listingsPanel \.actionBar button\.publishOtherAccountButton \{/);
  assert.match(css, /button\.publishOtherAccountButton:focus-visible/);
  assert.equal((css.match(/:not\(\.publishOtherAccountButton\)/g)||[]).length,2);
});
test('anúncio em edição usa fundo e faixa contextual, mantendo as cores normais do texto', () => {
  assert.match(page, /className=\{expanded === item.id && editing \? styles\.editingListingTitle : undefined\}/);
  assert.match(page, /expanded === item.id && editing && <small className=\{styles\.editingListingLabel\}>Em edição<\/small>/);
  assert.match(css, /th\.editingListingTitle \{[^}]*background: color-mix\(in srgb, var\(--brand\) 8%, #fff\);[^}]*box-shadow: inset 3px 0 0 var\(--brand\)/);
  assert.match(css, /\.dark \.listingTable tbody th\.editingListingTitle \{[^}]*background: color-mix\(in srgb, var\(--brand\) 18%, #182235\)/);
  assert.doesNotMatch(css, /editingListing(?:Title|Label)[^{]*\{[^}]*\bcolor:/);
});
test('nomes e descrições dos produtos na lista aparecem completos com quebra de linha', () => {
  assert.match(css, /\.listingTable tbody th strong \{[^}]*white-space: normal;[^}]*overflow-wrap: anywhere;/);
  assert.doesNotMatch(css, /\.listingTable tbody th strong \{[^}]*(?:white-space: nowrap|overflow: hidden|text-overflow: ellipsis)/);
});
test('hover leve destaca somente a linha do anúncio, incluindo ações, sem alterar o título em edição', () => {
  assert.match(page, /<Fragment key=\{item.id\}><tr className=\{styles.listingRow\}>/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(css, /\.listingRow:hover > :is\(th, td\):not\(\.editingListingTitle\) \{ background: color-mix\(in srgb, var\(--brand\) 4%, #fff\)/);
  assert.match(css, /\.dark \.listingTable tbody \.listingRow:hover[^}]*var\(--brand\) 10%, #182235/);
  assert.match(css, /\.listingRow:has\(:focus-visible\)/);
  assert.doesNotMatch(css, /\.listingRow(?::hover|:has\(:focus-visible\))[^}]*\bcolor:/);
});
test('GET e PATCH autenticam gestão e isolam empresa/conta; migração preserva acesso backend', () => {
  assert.equal((route.match(/authorizeMarketplace\(request, .*?, 'manage'\)/g)||[]).length,2);
  assert.equal((route.match(/loadConnection\(db, empresaId,/g)||[]).length,2);
  assert.match(route,/Cache-Control.*?no-store/);
  const sql=read('supabase/migrations/20261005190000_marketplace_listing_edit.sql');
  assert.match(sql,/'delete', 'edit'/);assert.match(sql,/create unique index/);assert.doesNotMatch(sql,/revoke|grant|drop table|disable row level security/i);
});
test('abrir edição alinha o título abaixo do cabeçalho, após expandir e sem nova rolagem ao carregar dados', () => {
  const open = page.match(/function openEditing\(id: string\) \{([\s\S]*?)\n  \}/)?.[1];
  assert.ok(open);
  assert.match(open, /if \(expanded !== id\) \{[\s\S]*requestAnimationFrame/);
  assert.match(open, /const row = button\?\.closest\('tr'\)/);
  assert.match(open, /getAttribute\('aria-expanded'\) !== 'true'/);
  assert.match(open, /closest\('main'\)\?\.querySelector\('header'\)/);
  assert.match(open, /window.scrollY \+ row.getBoundingClientRect\(\).top - headerBottom - 8/);
  assert.match(open, /prefers-reduced-motion: reduce.*'instant' : 'smooth'/);
  assert.match(form, /requestAnimationFrame\(\(\) => formRef.current\?\.querySelector<HTMLElement>[\s\S]*?\.focus\(\{ preventScroll: true \}\)\)/);
  for (const [headerBottom, reducedMotion] of [[80, false], [228, true]]) {
    const frames = [], scrolls = [], horizontal = [];
    let selected = '';
    const button = { closest: () => ({ getBoundingClientRect: () => ({ top: 500 }) }), getAttribute: () => selected === 'listing-a' ? 'true' : 'false' };
    const context = {
      acting: false, expanded: '', syncController: { current: null },
      setExpanded: (id) => { selected = id; },
      editButtons: { current: new Map([['listing-a', button]]) },
      tableScroll: { current: { scrollTo: (options) => horizontal.push(options.left), closest: () => ({ querySelector: () => ({ getBoundingClientRect: () => ({ bottom: headerBottom }) }) }) } },
      requestAnimationFrame: (callback) => frames.push(callback),
      window: { scrollY: 1000, scrollTo: (options) => scrolls.push(options), matchMedia: () => ({ matches: reducedMotion }) },
    };
    const openEditing = runInNewContext(`(id) => {${open}}`, context);
    openEditing('listing-a');
    assert.equal(scrolls.length, 0, 'aguarda a expansão antes de medir');
    frames.shift()();
    assert.equal(scrolls[0].top, 1500 - headerBottom - 8);
    assert.equal(scrolls[0].behavior, reducedMotion ? 'instant' : 'smooth');
    assert.deepEqual(horizontal, [0]);
    context.expanded = 'listing-a';
    openEditing('listing-a');
    assert.equal(selected, '');
    assert.equal(frames.length, 0, 'fechar não agenda uma nova rolagem');
    assert.equal(scrolls.length, 1);
    context.expanded = 'another-listing';
    openEditing('listing-a');
    assert.equal(frames.length, 0, 'não substitui outra edição aberta');
  }
});
