import assert from 'node:assert/strict';
import test from 'node:test';
import { gerarAej, type DadosAej } from './rep-p-aej.ts';

const base: DadosAej = {
  empregador: { tipoDocumento: 'cnpj', documento: '12345678000199', razaoSocial: 'Empresa Ágil' },
  inicio: '2026-07-01', fim: '2026-07-31', geradoEm: '2026-07-20T15:30:00Z',
  reps: [{ id: 1, tipo: 3, numero: '12345678901234567' }],
  vinculos: [{ id: 1, cpf: '12345678901', nome: 'João da Silva', matriculaEsocial: 'MAT-1' }],
  horarios: [{ codigo: 'H1', duracaoMinutos: 480, pares: [{ entrada: '08:00', saida: '17:00' }] }],
  marcacoes: [
    { vinculoId: 1, dataHora: '2026-07-01T08:00:00-03:00', repId: 1, tipo: 'E', sequencia: 1, fonte: 'O', codigoHorario: 'H1' },
    { vinculoId: 1, dataHora: '2026-07-01T17:00:00-03:00', repId: 1, tipo: 'S', sequencia: 1, fonte: 'O' },
    { vinculoId: 1, dataHora: '2026-07-02T08:05:00-03:00', tipo: 'E', sequencia: 1, fonte: 'I', codigoHorario: 'H1', motivo: 'Ajuste aprovado' },
  ],
  movimentos: [{ vinculoId: 1, tipo: 3, data: '2026-07-03', minutos: 45, movimentoBanco: 1 }],
  ptrp: { nome: 'AvantaLab Gestão', versao: '1.6.0.84', tipoDocumentoDesenvolvedor: 'cnpj', documentoDesenvolvedor: '12345678000199', nomeDesenvolvedor: 'AvantaLab', emailDesenvolvedor: 'suporte@avantalab.com.br' },
};

test('gera todos os registros do AEJ v001, trailer e assinatura destacada', () => {
  const arquivo = gerarAej(base); const texto = arquivo.toString('latin1'); const linhas = texto.slice(0, -2).split('\r\n');
  assert.equal(texto.includes('\n') && !texto.replaceAll('\r\n', '').includes('\n'), true);
  assert.equal(linhas[0], '01|1|12345678000199|||Empresa Ágil|2026-07-01|2026-07-31|2026-07-20T12:30:00-0300|001');
  assert.ok(linhas.some((linha) => linha.startsWith('04|H1|480|0800|1700')));
  assert.ok(linhas.some((linha) => linha.includes('|I|H1|Ajuste aprovado')));
  assert.ok(linhas.some((linha) => linha === '07|1|3|2026-07-03|45|1'));
  assert.equal(linhas.at(-2), '99|1|1|1|1|3|1|1|1');
  assert.equal(linhas.at(-1)?.length, 100);
});

test('recusa marcação manual sem motivo', () => {
  assert.throws(() => gerarAej({ ...base, marcacoes: [{ vinculoId: 1, dataHora: '2026-07-01T08:00:00-03:00', tipo: 'E', sequencia: 1, fonte: 'I' }] }), /precisam de motivo/);
});

test('recusa documento de empregador inválido', () => {
  assert.throws(() => gerarAej({ ...base, empregador: { ...base.empregador, documento: '123' } }), /empregador inválido/);
});
