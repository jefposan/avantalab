import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('app/components/Dashboard.tsx', 'utf8');
const css = readFileSync('app/components/Dashboard.module.css', 'utf8');

test('os nove cabeçalhos preservam arrastar e opções no mesmo grupo fixo', () => {
  const ids = ['controlePonto', 'saldo', 'insightsAva', 'caixinha', 'meusPerfis', 'centrosCusto', 'resumoFinanceiro', 'evolucaoMensal', 'registrarEntradas'];
  for (const id of ids) {
    assert.match(source, new RegExp('className=\\{styles.fixedActions\\}>\\s*<DragHandle[^>]*\\/>\\s*<BotaoOpcoesCard id="' + id + '"'));
  }
  assert.equal((source.match(/styles.cardHeader/g) || []).length, ids.length);
  assert.equal((source.match(/styles.fixedActions/g) || []).length, ids.length);
});

test('compactação usa largura do card, título integral e reserva lateral dos controles', () => {
  assert.match(css, /container: dashboard-card \/ inline-size/);
  assert.match(css, /@container dashboard-card \(max-width: 600px\)/);
  assert.match(css, /flex-basis: 100%/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /padding-right: 72px/);
  assert.match(css, /\.cardHeader \.fixedActions\s*\{[^}]*right: 0;[^}]*bottom: 0;/);
  assert.match(css, /\.monthPicker select\s*\{\s*height: 24px/);
});

test('mês mantém identificação acessível e título de perfis não é abreviado', () => {
  assert.match(source, /aria-label=\{ariaLabel\}/);
  assert.match(source, /<span className="truncate">Meus perfis<\/span>/);
  assert.doesNotMatch(source, /\? 'Meus perfis' : 'Perfis'/);
  assert.match(css, /\.monthLabel\s*\{[^}]*clip-path: inset\(50%\)/);
});
