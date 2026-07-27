import type { EmpresaConsultada } from '../types';

export const CAMPOS_CADASTRO_CNPJ = [
  'documento',
  'nome_fantasia',
  'razao_social',
  'cep',
  'rua',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'estado',
  'telefone',
  'email_empresa',
  'inscricao_estadual',
  'regime_tributario',
] as const;

export type CampoCadastroCnpj = (typeof CAMPOS_CADASTRO_CNPJ)[number];

export type CadastroCnpjPreenchivel = Record<CampoCadastroCnpj, string>;

export type DadosCnpjParaCadastro = Partial<CadastroCnpjPreenchivel>;

export const ROTULOS_CAMPOS_CADASTRO_CNPJ: Record<
  CampoCadastroCnpj,
  string
> = {
  documento: 'CNPJ',
  nome_fantasia: 'Nome Fantasia',
  razao_social: 'Razão Social',
  cep: 'CEP',
  rua: 'Rua',
  numero: 'Número',
  complemento: 'Complemento',
  bairro: 'Bairro',
  cidade: 'Cidade',
  estado: 'Estado',
  telefone: 'Telefone',
  email_empresa: 'E-mail da empresa',
  inscricao_estadual: 'Inscrição Estadual',
  regime_tributario: 'Regime Tributário',
};

type ResultadoAplicacao<T> = {
  dados: T;
  camposAplicados: CampoCadastroCnpj[];
  camposPreservados: CampoCadastroCnpj[];
};

function texto(valor: string | null | undefined) {
  return String(valor ?? '').trim().replace(/\s+/g, ' ');
}

function somenteDigitos(valor: string | null | undefined, limite: number) {
  return texto(valor).replace(/\D/g, '').slice(0, limite);
}

function logradouroCompleto(empresa: EmpresaConsultada) {
  const tipo = texto(empresa.endereco.tipoLogradouro);
  const logradouro = texto(empresa.endereco.logradouro);

  if (!tipo) return logradouro;
  if (!logradouro) return tipo;
  if (
    logradouro
      .toLocaleLowerCase('pt-BR')
      .startsWith(`${tipo.toLocaleLowerCase('pt-BR')} `)
  ) {
    return logradouro;
  }

  return `${tipo} ${logradouro}`;
}

function primeiroTelefone(empresa: EmpresaConsultada) {
  const telefone = empresa.contatos.telefones.find(
    (item) => texto(item.ddd) || texto(item.numero),
  );
  if (!telefone) return '';
  return somenteDigitos(`${telefone.ddd ?? ''}${telefone.numero ?? ''}`, 13);
}

function primeiroEmail(empresa: EmpresaConsultada) {
  return texto(
    empresa.contatos.emails.find((item) => texto(item.endereco))?.endereco,
  ).toLocaleLowerCase('pt-BR');
}

function inscricaoEstadualPreferencial(empresa: EmpresaConsultada) {
  const uf = texto(empresa.endereco.uf).toLocaleUpperCase('pt-BR');
  const inscricoes = empresa.inscricoesEstaduais.filter((item) =>
    texto(item.inscricao),
  );
  const preferencial =
    inscricoes.find(
      (item) =>
        item.ativa === true &&
        texto(item.uf).toLocaleUpperCase('pt-BR') === uf,
    ) ??
    inscricoes.find((item) => item.ativa === true) ??
    inscricoes.find(
      (item) => texto(item.uf).toLocaleUpperCase('pt-BR') === uf,
    ) ??
    inscricoes[0];

  return texto(preferencial?.inscricao);
}

function regimeTributarioDisponivel(empresa: EmpresaConsultada) {
  if (empresa.mei?.optante === true) return 'mei_simei';
  if (empresa.simples?.optante === true) return 'simples_nacional';
  return '';
}

export function mapearCnpjParaCadastro(
  empresa: EmpresaConsultada,
): DadosCnpjParaCadastro {
  const valores: CadastroCnpjPreenchivel = {
    documento: somenteDigitos(empresa.documento, 14),
    nome_fantasia: texto(empresa.nomeFantasia),
    razao_social: texto(empresa.razaoSocial),
    cep: somenteDigitos(empresa.endereco.cep, 8),
    rua: logradouroCompleto(empresa),
    numero: texto(empresa.endereco.numero),
    complemento: texto(empresa.endereco.complemento),
    bairro: texto(empresa.endereco.bairro),
    cidade: texto(empresa.endereco.cidade),
    estado: texto(empresa.endereco.uf).toLocaleUpperCase('pt-BR').slice(0, 2),
    telefone: primeiroTelefone(empresa),
    email_empresa: primeiroEmail(empresa),
    inscricao_estadual: inscricaoEstadualPreferencial(empresa),
    regime_tributario: regimeTributarioDisponivel(empresa),
  };

  return Object.fromEntries(
    CAMPOS_CADASTRO_CNPJ.filter((campo) => valores[campo]).map((campo) => [
      campo,
      valores[campo],
    ]),
  ) as DadosCnpjParaCadastro;
}

export function aplicarCnpjAoCadastro<T extends CadastroCnpjPreenchivel>(
  cadastroAtual: T,
  dadosConsultados: DadosCnpjParaCadastro,
  substituirPreenchidos = false,
): ResultadoAplicacao<T> {
  const alteracoes: DadosCnpjParaCadastro = {};
  const camposAplicados: CampoCadastroCnpj[] = [];
  const camposPreservados: CampoCadastroCnpj[] = [];

  for (const campo of CAMPOS_CADASTRO_CNPJ) {
    const novoValor = texto(dadosConsultados[campo]);
    if (!novoValor || novoValor === texto(cadastroAtual[campo])) continue;

    if (!substituirPreenchidos && texto(cadastroAtual[campo])) {
      camposPreservados.push(campo);
      continue;
    }

    alteracoes[campo] = novoValor;
    camposAplicados.push(campo);
  }

  return {
    dados: { ...cadastroAtual, ...alteracoes },
    camposAplicados,
    camposPreservados,
  };
}
