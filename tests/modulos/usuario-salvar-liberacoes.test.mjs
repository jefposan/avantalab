import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const fonte = readFileSync('app/gestao/page.tsx', 'utf8');
const expressao = fonte.match(/const dadosUsuarioAlterados = ([\s\S]*?);\n/)?.[1];
assert.ok(expressao);
const avaliar = new Function('usuarioOriginalEditando', 'editUsuarioLiberacoes', 'editUsuarioNome', 'editUsuarioLogin', 'editUsuarioEmail', 'editUsuarioPerfil', 'liberacoesDoVinculo', `return (${expressao});`);
const usuario = { nome: 'Usuário Teste', login: 'teste', email: 'teste@example.com', perfil: 'administrador', dashboard_liberada: true, modulos_liberados: ['projetos'] };
const conferir = acessos => avaliar(usuario, acessos, usuario.nome, usuario.login, usuario.email, usuario.perfil, u => ({ dashboard: u.dashboard_liberada, modulos: u.modulos_liberados }));
test('Salvar reconhece alteração somente de Dashboard ou módulos', () => {
  assert.equal(conferir({ dashboard: true, modulos: ['projetos'] }), false);
  assert.equal(conferir({ dashboard: false, modulos: ['projetos'] }), true);
  assert.equal(conferir({ dashboard: true, modulos: ['projetos', 'custos'] }), true);
  assert.equal(conferir({ dashboard: true, modulos: [] }), true);
});
