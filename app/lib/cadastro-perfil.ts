export const TIPOS_EMPRESA = [
  ['autonomo', 'Autônomo'],
  ['mei', 'MEI'],
  ['me', 'ME'],
  ['epp', 'EPP'],
  ['ltda', 'LTDA'],
  ['sa', 'S/A'],
  ['associacao', 'Associação'],
  ['cooperativa', 'Cooperativa'],
  ['outro', 'Outro Segmento'],
] as const;

export const REGIMES_TRIBUTARIOS = [
  ['mei_simei', 'MEI / SIMEI'],
  ['simples_nacional', 'Simples Nacional'],
  ['lucro_presumido', 'Lucro Presumido'],
  ['lucro_real', 'Lucro Real'],
  ['lucro_arbitrado', 'Lucro Arbitrado'],
  ['imune', 'Imune'],
  ['isenta', 'Isenta'],
  ['nao_aplicavel', 'Não se aplica'],
  ['outro', 'Outro'],
] as const;

export const ESTADOS_BRASIL = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
] as const;

export type CadastroPerfil = {
  empresa_id: string;
  nome_fantasia: string;
  nome_responsavel: string;
  razao_social: string;
  tipo_documento: 'cpf' | 'cnpj';
  documento: string;
  tipo_empresa: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  telefone: string;
  whatsapp: string;
  email_empresa: string;
  site: string;
  instagram: string;
  inscricao_estadual: string;
  inscricao_estadual_isento: boolean;
  inscricao_municipal: string;
  inscricao_municipal_isento: boolean;
  regime_tributario: string;
  obrigatorio_em: string;
  concluido_em: string | null;
};

export type StatusCadastroPerfil = {
  cadastro: CadastroPerfil;
  completo: boolean;
  obrigatorio: boolean;
  diasRestantes: number;
  podeEditar: boolean;
  tipoPerfil: 'empresa' | 'pessoal';
};

export function somenteDigitos(valor: unknown, limite = 30) {
  return String(valor || '').replace(/\D/g, '').slice(0, limite);
}

export function validarCpf(valor: unknown) {
  const cpf = somenteDigitos(valor, 11);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calcular = (tamanho: number) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calcular(9) === Number(cpf[9]) && calcular(10) === Number(cpf[10]);
}

export function validarCnpj(valor: unknown) {
  const cnpj = somenteDigitos(valor, 14);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digito = (tamanho: number) => {
    const pesos = tamanho === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    const soma = pesos.reduce((total, peso, indice) => total + Number(cnpj[indice]) * peso, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return digito(12) === Number(cnpj[12]) && digito(13) === Number(cnpj[13]);
}
