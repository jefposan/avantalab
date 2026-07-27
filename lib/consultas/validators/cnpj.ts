export const CNPJ_TAMANHO = 14;
export const CNPJ_ENTRADA_MAXIMA = 32;

export type ResultadoValidacaoCnpj = {
  valido: boolean;
  documento: string;
  formato: 'NUMERICO' | 'ALFANUMERICO' | null;
  motivo:
    | 'VALIDO'
    | 'VAZIO'
    | 'TAMANHO_INVALIDO'
    | 'CARACTERE_INVALIDO'
    | 'DIGITO_INVALIDO';
};

const PESOS_PRIMEIRO_DIGITO = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_SEGUNDO_DIGITO = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function sanitizarCnpj(valor: string): string {
  return valor
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[.\-\/\s]/g, '');
}

export function formatarCnpjParaExibicao(valor: string): string {
  const documento = sanitizarCnpj(valor).slice(0, CNPJ_TAMANHO);

  if (!/^\d*$/.test(documento)) return documento;

  return documento
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function valorDoCaractere(caractere: string): number {
  return caractere.charCodeAt(0) - 48;
}

function calcularDigito(base: string, pesos: number[]): number {
  const soma = base
    .split('')
    .reduce(
      (total, caractere, indice) =>
        total + valorDoCaractere(caractere) * pesos[indice],
      0,
    );
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function validarCnpj(valor: string): ResultadoValidacaoCnpj {
  const documento = sanitizarCnpj(valor);

  if (!documento) {
    return { valido: false, documento, formato: null, motivo: 'VAZIO' };
  }

  if (documento.length !== CNPJ_TAMANHO) {
    return {
      valido: false,
      documento,
      formato: null,
      motivo: 'TAMANHO_INVALIDO',
    };
  }

  if (!/^[A-Z0-9]{12}\d{2}$/.test(documento)) {
    return {
      valido: false,
      documento,
      formato: null,
      motivo: 'CARACTERE_INVALIDO',
    };
  }

  const formato = /^\d{14}$/.test(documento)
    ? 'NUMERICO'
    : 'ALFANUMERICO';

  if (formato === 'NUMERICO' && /^(\d)\1{13}$/.test(documento)) {
    return {
      valido: false,
      documento,
      formato,
      motivo: 'DIGITO_INVALIDO',
    };
  }

  const base = documento.slice(0, 12);
  const primeiroDigito = calcularDigito(base, PESOS_PRIMEIRO_DIGITO);
  const segundoDigito = calcularDigito(
    `${base}${primeiroDigito}`,
    PESOS_SEGUNDO_DIGITO,
  );
  const digitosInformados = documento.slice(12);
  const digitosCalculados = `${primeiroDigito}${segundoDigito}`;

  if (digitosInformados !== digitosCalculados) {
    return {
      valido: false,
      documento,
      formato,
      motivo: 'DIGITO_INVALIDO',
    };
  }

  return { valido: true, documento, formato, motivo: 'VALIDO' };
}
