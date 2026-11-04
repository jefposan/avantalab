import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const gestao = readFileSync('app/gestao/page.tsx', 'utf8');
const banco = readFileSync('app/lib/database.ts', 'utf8');

test('entrada e revalidação não recarregam as liberações de todos os perfis', () => {
  assert.doesNotMatch(gestao, /buscarAcessosUsuario\(\)/);
  assert.match(gestao, /buscarAcessosUsuario\(empresa\.id, \{ logoAposDashboard: true \}\)/);
  assert.match(gestao, /buscarAcessosUsuario\(empresaId\)/);
  assert.match(banco, /telefone_confirmado_em, dashboard_liberada, modulos_liberados/);
  assert.match(banco, /dashboard_liberada: vinculo\.dashboard_liberada/);
});

test('confirmação mantém seleção visível e falha tem recuperação', () => {
  assert.doesNotMatch(gestao, /if \(modalSelecionarEmpresa && carregandoPerfil\)/);
  assert.match(gestao, /carregandoPerfil \? 'Confirmando acesso…' : 'Confirmar acesso'/);
  assert.match(gestao, /erroAcessoPerfil && <p role="alert"/);
  assert.match(gestao, /disabled=\{!empresaParaSelecionar \|\| carregandoPerfil\}/);
});
