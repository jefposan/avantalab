import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Todos consulta cadastros e Perfis AvantaLab com o mesmo termo', async () => {
  const pagina = await readFile(new URL('../../app/admin/page.tsx', import.meta.url), 'utf8');

  assert.match(pagina, /if \(consulta === 'todos'\) \{[\s\S]*carregarCadastros\('todos',[\s\S]*buscarPerfis\(1, undefined, termo\)/);
  assert.match(pagina, /placeholder=\{consultaCadastros === 'todos' \? 'Nome, e-mail ou perfil \(vazio = todos\)'/);
  assert.match(pagina, /consultaCadastros === 'todos' \|\| consultaCadastros === 'perfis_avantalab'/);
});

test('Todos informa o total combinado sem transformar perfis em pessoas', async () => {
  const pagina = await readFile(new URL('../../app/admin/page.tsx', import.meta.url), 'utf8');

  assert.match(pagina, /consultaCadastros === 'todos' \? 'Resultados'/);
  assert.match(pagina, /\(cadastroTotal \+ perfilTotal\)\.toLocaleString\('pt-BR'\)/);
  assert.match(pagina, /Cadastros · \{rotuloPlataformaCadastro\(plataformaCadastro\)\}/);
  assert.match(pagina, />Perfis AvantaLab</);
});

test('Perfis cancelados permanecem no resultado quando a situação é Todos', async () => {
  const api = await readFile(new URL('../../app/api/admin-perfis/route.ts', import.meta.url), 'utf8');

  assert.match(api, /if \(filtro === 'todos'\) return true/);
});
