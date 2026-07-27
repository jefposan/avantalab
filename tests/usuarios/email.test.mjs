import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizarEmail, validarEmail } from '../../app/lib/email.ts';

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
