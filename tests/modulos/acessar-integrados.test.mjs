import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const page = readFileSync(new URL('../../app/gestao/page.tsx', import.meta.url), 'utf8');
const modal = readFileSync(new URL('../../app/components/ModulosModal.tsx', import.meta.url), 'utf8');
test('cards instalados dos módulos integrados oferecem Acessar', () => {
  assert.match(modal, /m.id === 'ponto' \|\| m.id === 'vendas_mobile'/);
  assert.match(modal, /onClick=\{\(\) => onAcessar\(m.id\)\}/);
});
test('fecha catálogo e reutiliza abertura do menu sem contornar permissões', () => {
  assert.match(page, /!modulosAtivos.includes\(moduloId\)/);
  assert.match(page, /if \(moduloId === 'ponto'\) \{\s+if \(!podeGerenciarPonto\)/);
  assert.match(page, /setModalModulos\(false\);\s+abrirPontoIntegrado\(\)/);
  assert.match(page, /if \(moduloId === 'vendas_mobile'\) \{\s+if \(!podeAcessarVendasMobileWeb\)/);
  assert.match(page, /setModalModulos\(false\);\s+abrirConteudoVendasIntegrado\(\)/);
  assert.match(page, /onClick=\{abrirPontoIntegrado\}/);
  assert.match(page, /onClick=\{abrirConteudoVendasIntegrado\}/);
});
