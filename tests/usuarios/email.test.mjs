import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizarEmail, validarEmail, emailTecnicoUsuario, emailPessoalUsuario } from '../../app/lib/email.ts';

test('normaliza e-mails de cadastro', () => {
  assert.equal(normalizarEmail('  Usuario@Empresa.COM.BR '), 'usuario@empresa.com.br');
});

test('aceita e-mails válidos', () => {
  assert.equal(validarEmail('usuario@empresa.com.br'), true);
  assert.equal(validarEmail('nome.sobrenome+acesso@dominio.com'), true);
});

test('rejeita e-mails vazios ou incompletos', () => {
  assert.equal(validarEmail(''), false);
  assert.equal(validarEmail('usuario'), false);
  assert.equal(validarEmail('usuario@empresa'), false);
  assert.equal(validarEmail('usuario @empresa.com'), false);
});

test('identificador técnico não é exibido como contato e não confunde domínio semelhante', () => {
  assert.equal(emailTecnicoUsuario('  LOGIN+ID@USUARIOS.AVANTALAB.LOCAL '), true);
  assert.equal(emailPessoalUsuario('usuario-id@usuarios.avantalab.local'), '');
  assert.equal(emailPessoalUsuario(' PESSOA@EMPRESA.COM '), 'pessoa@empresa.com');
  assert.equal(emailTecnicoUsuario('pessoa@usuarios.avantalab.local.exemplo.com'), false);
});
