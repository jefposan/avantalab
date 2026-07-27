import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizarCnpjWs } from '../../lib/consultas/normalizers/cnpj.ts';
import {
  CnpjWsProviderError,
  consultarCnpjWs,
} from '../../lib/consultas/providers/cnpjws.ts';
import {
  formatarCnpjParaExibicao,
  sanitizarCnpj,
  validarCnpj,
} from '../../lib/consultas/validators/cnpj.ts';

const respostaBase = {
  cnpj_raiz: '27865757',
  razao_social: 'EMPRESA TESTE S/A',
  capital_social: '12345.67',
  porte: { id: '05', descricao: 'Demais' },
  natureza_juridica: { id: '2054', descricao: 'Sociedade Anônima Fechada' },
  socios: [],
  simples: null,
  estabelecimento: {
    cnpj: '27865757000102',
    nome_fantasia: null,
    situacao_cadastral: 'Ativa',
    data_situacao_cadastral: '2005-11-03',
    data_inicio_atividade: '1986-01-31',
    tipo_logradouro: 'RUA',
    logradouro: 'EXEMPLO',
    numero: '100',
    bairro: 'CENTRO',
    cep: '01001000',
    ddd1: '11',
    telefone1: '12345678',
    email: 'CONTATO@EXEMPLO.COM.BR',
    atividade_principal: { id: '6204000', descricao: 'Consultoria em TI' },
    atividades_secundarias: [],
    cidade: { nome: 'São Paulo' },
    estado: { sigla: 'SP' },
    pais: { nome: 'Brasil' },
    inscricoes_estaduais: [],
  },
};

test('sanitiza máscara sem descartar letras do CNPJ alfanumérico', () => {
  assert.equal(sanitizarCnpj('12.Abc.345/01de-35'), '12ABC34501DE35');
  assert.equal(formatarCnpjParaExibicao('27865757000102'), '27.865.757/0001-02');
});

test('valida matematicamente CNPJ numérico atual', () => {
  assert.equal(validarCnpj('27.865.757/0001-02').valido, true);
  assert.equal(validarCnpj('27.865.757/0001-03').valido, false);
  assert.equal(validarCnpj('11.111.111/1111-11').valido, false);
});

test('valida estrutural e matematicamente CNPJ alfanumérico', () => {
  const resultado = validarCnpj('12.ABC.345/01DE-35');
  assert.equal(resultado.valido, true);
  assert.equal(resultado.formato, 'ALFANUMERICO');
  assert.equal(resultado.documento, '12ABC34501DE35');
});

test('rejeita documento vazio, curto e com URL', () => {
  assert.equal(validarCnpj('').motivo, 'VAZIO');
  assert.equal(validarCnpj('123').motivo, 'TAMANHO_INVALIDO');
  assert.equal(validarCnpj('https://x.co/a').valido, false);
});

test('normaliza resposta sem nome fantasia sem inventar conteúdo', () => {
  const empresa = normalizarCnpjWs(respostaBase, '2026-07-26T12:00:00.000Z');
  assert.equal(empresa.nomeFantasia, null);
  assert.equal(empresa.razaoSocial, 'EMPRESA TESTE S/A');
  assert.equal(empresa.capitalSocial, 12345.67);
  assert.equal(empresa.endereco.uf, 'SP');
  assert.deepEqual(empresa.contatos.emails, [
    {
      endereco: 'CONTATO@EXEMPLO.COM.BR',
      dominio: 'EXEMPLO.COM.BR',
    },
  ]);
  assert.equal(empresa.fonte, 'CNPJ_WS');
});

test('preserva listas extensas de sócios e atividades', () => {
  const muitosSocios = Array.from({ length: 40 }, (_, indice) => ({
    nome: `SÓCIO ${indice + 1}`,
    tipo: 'Pessoa Física',
    data_entrada: '2020-01-01',
    qualificacao_socio: { descricao: 'Sócio-Administrador' },
  }));
  const muitasAtividades = Array.from({ length: 50 }, (_, indice) => ({
    id: String(6200000 + indice),
    descricao: `Atividade ${indice + 1}`,
  }));
  const empresa = normalizarCnpjWs({
    ...respostaBase,
    socios: muitosSocios,
    estabelecimento: {
      ...respostaBase.estabelecimento,
      atividades_secundarias: muitasAtividades,
    },
  });

  assert.equal(empresa.socios.length, 40);
  assert.equal(empresa.atividadesSecundarias.length, 50);
});

test('provedor retorna JSON de sucesso sem cache', async () => {
  let initRecebido;
  const fetcher = async (_url, init) => {
    initRecebido = init;
    return Response.json(respostaBase);
  };

  const resposta = await consultarCnpjWs('27865757000102', { fetcher });
  assert.deepEqual(resposta, respostaBase);
  assert.equal(initRecebido.cache, 'no-store');
  assert.equal(initRecebido.method, 'GET');
});

for (const [status, codigo] of [
  [404, 'NOT_FOUND'],
  [429, 'RATE_LIMITED'],
  [500, 'PROVIDER_UNAVAILABLE'],
]) {
  test(`provedor mapeia HTTP ${status} para ${codigo}`, async () => {
    await assert.rejects(
      consultarCnpjWs('27865757000102', {
        fetcher: async () => new Response(null, { status }),
      }),
      (error) =>
        error instanceof CnpjWsProviderError && error.code === codigo,
    );
  });
}

test('provedor interrompe consulta no timeout', async () => {
  const fetcher = async (_url, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        reject(new DOMException('Abortado', 'AbortError'));
      });
    });

  await assert.rejects(
    consultarCnpjWs('27865757000102', { fetcher, timeoutMs: 5 }),
    (error) =>
      error instanceof CnpjWsProviderError && error.code === 'TIMEOUT',
  );
});
