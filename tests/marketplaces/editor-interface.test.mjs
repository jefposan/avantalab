import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
const read=(file) => readFileSync(new URL(`../../${file}`,import.meta.url),'utf8');
const form=read('app/marketplaces/ListingEditor.tsx'),page=read('app/marketplaces/Anunciados.tsx'),route=read('app/api/modulos/marketplaces/anunciados/editar/route.ts');
test('formulário comum permite salvar/cancelar, valida, protege descarte e usa formatação oficial', () => {
  for(const text of ['Salvar alterações','Cancelar','Descartar alterações?','Recarregar edição','changedFields','validateChanges','moedaDigitadaParaNumero','formatarMoedaDigitada','aria-describedby','aria-invalid','beforeunload']) assert.ok(form.includes(text),text);
  assert.match(form,/setStale\(true\)/);
  assert.match(form,/requestKey\.current/);
  assert.match(form,/document.getElementById.*?\.focus\(\)/);
});
test('atualização, filtros e troca de conta não descartam edição aberta', () => {
  assert.match(page,/syncController.current \|\| acting \|\| expanded/);
  assert.match(page,/syncController.current\?\.abort\(\);\n    setExpanded/);
  assert.match(page,/<ListingEditor key=\{`\$\{accountId\}-\$\{item.id\}`\}/);
  assert.match(page,/disabled=\{syncing \|\| acting \|\| !!expanded \|\| publicationBusy\}/);
});
test('os quatro campos editáveis antecedem o EAN na mesma lista expandida', () => {
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
  assert.match(form, /title: snapshot\.title, price: snapshot\.price, stock: snapshot\.stock/);
  assert.match(form, /\{EDIT_FIELDS\.map\(\(field\) =>/);
  assert.doesNotMatch(form, /\{editor && EDIT_FIELDS\.map/);
  assert.match(form, /disabled = !editor \|\| !rule\?\.editable/);
  assert.match(form, /descrição não está no cache/i);
});
test('GET e PATCH autenticam gestão e isolam empresa/conta; migração preserva acesso backend', () => {
  assert.equal((route.match(/authorizeMarketplace\(request, .*?, 'manage'\)/g)||[]).length,2);
  assert.equal((route.match(/loadConnection\(db, empresaId,/g)||[]).length,2);
  assert.match(route,/Cache-Control.*?no-store/);
  const sql=read('supabase/migrations/20261005190000_marketplace_listing_edit.sql');
  assert.match(sql,/'delete', 'edit'/);assert.match(sql,/create unique index/);assert.doesNotMatch(sql,/revoke|grant|drop table|disable row level security/i);
});
