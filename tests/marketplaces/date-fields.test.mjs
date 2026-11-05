import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { formatarDataISO } from '../../app/lib/formatters.ts';
import { marketplaceDateLabel, marketplaceDateTimeLabel } from '../../app/modules/marketplaces/date-format.ts';

test('data civil mostra ano curto sem interpretar século nem deslocar dia por fuso', () => {
  for (const iso of ['2026-10-17', '2000-02-29', '2099-12-31', '1900-01-01']) {
    const [year, month, day] = iso.split('-');
    assert.equal(formatarDataISO(iso), `${day}/${month}/${year}`);
    assert.equal(marketplaceDateLabel(iso), `${day}/${month}/${year.slice(-2)}`);
  }
  for (const invalid of ['', '17/10/26', '2026-02-29', '1900-02-29', '2026-04-31', '2026-13-01', '0000-01-01']) assert.equal(formatarDataISO(invalid), '');
});

test('datas com horário usam dd/mm/aa em São Paulo e mantêm hora/minuto', () => {
  assert.equal(marketplaceDateTimeLabel('2026-10-17T01:30:00Z'), '16/10/26, 22:30');
  assert.equal(marketplaceDateTimeLabel(new Date('2026-10-17T12:00:00Z')), '17/10/26, 09:00');
  assert.equal(marketplaceDateTimeLabel('inválida'), 'Data não informada');
});

test('todos os campos de data do módulo usam CampoData com ano curto e datas ISO completas', () => {
  const panel = readFileSync('app/marketplaces/PriceLotsPanel.tsx', 'utf8');
  const filters = readFileSync('app/marketplaces/SalesFilters.tsx', 'utf8');
  assert.match(panel, /<CampoData anoCurto required value=\{draft.receivedOn\}/);
  assert.equal((filters.match(/<CampoData anoCurto required/g) || []).length, 2);
  assert.match(filters, /min=\{draft.start \|\| undefined\}/);
  assert.match(panel, /marketplaceDateLabel\(lot.received_on\)/);
  function files(path) { return readdirSync(path, { withFileTypes: true }).flatMap(item => item.isDirectory() ? files(join(path, item.name)) : [join(path, item.name)]); }
  for (const path of files('app/marketplaces').filter(path => /\.tsx$/.test(path))) {
    const source = readFileSync(path, 'utf8');
    assert.ok(!source.includes('type="date"'), `Data nativa sem apresentação compartilhada: ${path}`);
    assert.doesNotMatch(source, /new Date\([^;\n]+?\)\.toLocaleString\('pt-BR'\)/, `Data com ano extenso: ${path}`);
    assert.ok(!source.includes("dateStyle: 'short'"), `Data sem formato explícito: ${path}`);
  }
});

test('controle compartilhado preserva seletor e validação nativos sem largura intrínseca do iOS', () => {
  const component = readFileSync('app/components/CampoData.tsx', 'utf8');
  const css = readFileSync('app/components/CampoData.module.css', 'utf8');
  assert.match(component, /anoCurto = false/);
  assert.match(component, /<input \{\.\.\.props\}[\s\S]*type="date" value=\{value\}/);
  assert.match(component, /onChange\(event.currentTarget.value\)/);
  assert.match(component, /showPicker\(\)/);
  assert.match(css, /\.field \{[^}]*min-width:0;max-width:100%;width:100%/);
  assert.match(css, /\.field input.native \{ position:absolute/);
  assert.match(css, /opacity:0/);
  assert.match(css, /\.field:focus-within/);
});
