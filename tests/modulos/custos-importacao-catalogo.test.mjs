import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import XLSX from 'xlsx';
import { COLUNAS_CATALOGO_PRODUTOS, validarPlanilhaCatalogo } from '../../app/custos/importacao-catalogo.ts';

const cabecalhos = COLUNAS_CATALOGO_PRODUTOS.map(([rotulo]) => rotulo);
const produto = (mudancas = {}) => Object.entries({
  'Código interno': 'ABC-01', 'Nome *': 'Produto teste', 'Custo (R$)': 12.5,
  'Preço de venda (R$)': '19,90', NCM: '12345678', 'Unidade tributável': 'UN',
  'Cadastro ativo': 'Sim', 'Disponível no catálogo': 'Sim',
  ...mudancas,
}).reduce((linha, [rotulo, valor]) => {
  linha[cabecalhos.indexOf(rotulo)] = valor;
  return linha;
}, Array(cabecalhos.length).fill(''));

test('modelo Excel entregue preserva todos os cabeçalhos do importador', async () => {
  const arquivo = await readFile(new URL('../../public/modelos/modelo-importacao-catalogo-produtos-avantalab.xlsx', import.meta.url));
  const livro = XLSX.read(arquivo, { type: 'buffer' });
  const linhas = XLSX.utils.sheet_to_json(livro.Sheets.Produtos, { header: 1, defval: '' });
  assert.deepEqual(linhas[4], cabecalhos);
});

test('produto coerente é normalizado antes da gravação', () => {
  const { produtos, erros } = validarPlanilhaCatalogo([cabecalhos, produto({ 'Cadastro ativo': 'Sim', 'Disponível no catálogo': 'Não' })]);
  assert.deepEqual(erros, []);
  assert.equal(produtos[0].sku, 'ABC-01');
  assert.equal(produtos[0].preco_venda, 19.9);
  assert.equal(produtos[0].disponivel_catalogo, false);
});

test('duplicidade, NCM preenchido incorretamente e indicador incoerente impedem aplicar', () => {
  const { erros } = validarPlanilhaCatalogo([cabecalhos, produto(), produto({ 'Código interno': 'abc-01', NCM: '123', 'Cadastro ativo': 'Talvez' })]);
  assert.ok(erros.some((erro) => erro.includes('repetido')));
  assert.ok(erros.some((erro) => erro.includes('NCM')));
  assert.ok(erros.some((erro) => erro.includes('Sim ou Não')));
});

test('nome é o único campo obrigatório e colunas opcionais podem faltar', () => {
  const resultado = validarPlanilhaCatalogo([['Nome'], ['Produto sem demais dados'], ['Outro produto sem código']]);
  assert.deepEqual(resultado.erros, []);
  assert.equal(resultado.codigosGerar, 2);
  assert.equal(resultado.produtos[0].sku, '');
  assert.equal(resultado.produtos[1].sku, '');
  assert.equal(resultado.produtos[0].preco_venda, 0);
  assert.equal(resultado.produtos[0].disponivel_catalogo, false);
  assert.equal(resultado.produtos[0].habilitado_fiscal, false);
});

test('CEST válido é normalizado; caracteres alfabéticos não são aceitos', () => {
  const valido = validarPlanilhaCatalogo([cabecalhos, produto({ CEST: '12.345.67' })]);
  assert.deepEqual(valido.erros, []);
  assert.equal(valido.produtos[0].cest, '1234567');
  const invalido = validarPlanilhaCatalogo([cabecalhos, produto({ CEST: 'AB1234567' })]);
  assert.ok(invalido.erros.some((erro) => erro.includes('CEST')));
});

test('fornecedor informado precisa pertencer ao perfil', () => {
  const { erros } = validarPlanilhaCatalogo([cabecalhos, produto({ 'Código do fornecedor': '77' })], [{ codigo: '12' }]);
  assert.ok(erros.some((erro) => erro.includes('fornecedor 77')));
});

test('publicação e uso fiscal pedidos sem dados completos são adiados com aviso', () => {
  const { produtos, erros, avisos } = validarPlanilhaCatalogo([cabecalhos, produto({
    'Preço de venda (R$)': '', NCM: '', 'Unidade tributável': '',
    'Disponível no catálogo': 'Sim', 'Habilitado fiscal': 'Sim',
  })]);
  assert.deepEqual(erros, []);
  assert.equal(produtos[0].disponivel_catalogo, false);
  assert.equal(produtos[0].habilitado_fiscal, false);
  assert.equal(avisos.length, 2);
});

test('sem coluna Nome a planilha é recusada', () => {
  assert.throws(() => validarPlanilhaCatalogo([['Código interno'], ['ABC']]), /coluna Nome/);
});
