import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const fonte = readFileSync('app/hooks/useEmpresas.ts', 'utf8');
const salvar = fonte.slice(fonte.indexOf('const salvarEdicaoUsuario = async'), fonte.indexOf('const redefinirSenhaUsuario = async'));
test('edição fecha somente após sucesso e antes de recarregar a lista', () => {
  const erro = salvar.indexOf('if (resultado.erro)');
  const fechar = salvar.indexOf('cancelarEdicaoUsuario();');
  assert.ok(erro >= 0 && fechar > erro);
  assert.match(salvar.slice(erro, fechar), /return;/);
  assert.ok(salvar.indexOf('await carregarUsuariosEmpresa();') > fechar);
  assert.ok(salvar.indexOf('const editandoProprioAcesso') < fechar);
  assert.match(salvar, /if \(editandoProprioAcesso\) window.location.replace/);
});
