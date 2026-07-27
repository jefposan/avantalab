import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aplicarCnpjAoCadastro,
  mapearCnpjParaCadastro,
} from '../../lib/consultas/mappers/cadastro-perfil.ts';
import { normalizarCnpjWs } from '../../lib/consultas/normalizers/cnpj.ts';

const empresaConsultada = normalizarCnpjWs({
  razao_social: 'EMPRESA CONSULTADA LTDA',
  simples: {
    simples: true,
    mei: false,
  },
  estabelecimento: {
    cnpj: '27865757000102',
    nome_fantasia: 'EMPRESA CONSULTADA',
    tipo_logradouro: 'AVENIDA',
    logradouro: 'PAULISTA',
    numero: '1000',
    complemento: 'CONJUNTO 10',
    bairro: 'BELA VISTA',
    cep: '01310100',
    ddd1: '11',
    telefone1: '33334444',
    email: 'CONTATO@EMPRESA.COM.BR',
    cidade: { nome: 'São Paulo' },
    estado: { sigla: 'SP' },
    inscricoes_estaduais: [
      {
        inscricao_estadual: 'IE-INATIVA',
        ativo: false,
        estado: { sigla: 'SP' },
      },
      {
        inscricao_estadual: 'IE-ATIVA',
        ativo: true,
        estado: { sigla: 'SP' },
      },
    ],
  },
});

const cadastroBase = {
  documento: '27865757000102',
  nome_fantasia: '',
  razao_social: 'RAZÃO JÁ INFORMADA',
  cep: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  telefone: '',
  email_empresa: '',
  inscricao_estadual: '',
  regime_tributario: '',
};

test('mapeia somente campos com correspondência direta no cadastro', () => {
  const mapeado = mapearCnpjParaCadastro(empresaConsultada);

  assert.deepEqual(mapeado, {
    documento: '27865757000102',
    nome_fantasia: 'EMPRESA CONSULTADA',
    razao_social: 'EMPRESA CONSULTADA LTDA',
    cep: '01310100',
    rua: 'AVENIDA PAULISTA',
    numero: '1000',
    complemento: 'CONJUNTO 10',
    bairro: 'BELA VISTA',
    cidade: 'São Paulo',
    estado: 'SP',
    telefone: '1133334444',
    email_empresa: 'contato@empresa.com.br',
    inscricao_estadual: 'IE-ATIVA',
    regime_tributario: 'simples_nacional',
  });
});

test('preserva campos já preenchidos por padrão', () => {
  const mapeado = mapearCnpjParaCadastro(empresaConsultada);
  const resultado = aplicarCnpjAoCadastro(cadastroBase, mapeado);

  assert.equal(resultado.dados.razao_social, 'RAZÃO JÁ INFORMADA');
  assert.equal(resultado.dados.nome_fantasia, 'EMPRESA CONSULTADA');
  assert.deepEqual(resultado.camposPreservados, ['razao_social']);
  assert.equal(resultado.camposAplicados.includes('cep'), true);
});

test('substitui campos existentes somente após confirmação explícita', () => {
  const mapeado = mapearCnpjParaCadastro(empresaConsultada);
  const resultado = aplicarCnpjAoCadastro(cadastroBase, mapeado, true);

  assert.equal(resultado.dados.razao_social, 'EMPRESA CONSULTADA LTDA');
  assert.deepEqual(resultado.camposPreservados, []);
  assert.equal(resultado.camposAplicados.includes('razao_social'), true);
});
