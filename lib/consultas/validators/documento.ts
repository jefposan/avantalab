import { validarCnpj } from './cnpj';

function validarCpfNumerico(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const calcular = (tamanho: number) => {
    let soma = 0; for (let i = 0; i < tamanho; i += 1) soma += Number(cpf[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11; return resto === 10 ? 0 : resto;
  };
  return calcular(9) === Number(cpf[9]) && calcular(10) === Number(cpf[10]);
}

export function validarDocumentoCredito(valor: unknown) {
  const documento = String(valor || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  if (documento.length === 11 && /^\d+$/.test(documento)) return { valido: validarCpfNumerico(documento), documento, tipo: 'CPF' as const };
  const cnpj = validarCnpj(documento);
  return { valido: cnpj.valido, documento: cnpj.documento, tipo: 'CNPJ' as const };
}
