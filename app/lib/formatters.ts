export const formatarMoeda = (valor: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
};

export const formatarDescricao = (texto: string) => {
  const textoLimpo = texto.trim().toLowerCase();

  if (!textoLimpo) return '';

  return textoLimpo.charAt(0).toUpperCase() + textoLimpo.slice(1);
};

export const corEhClara = (hex: string) => {
  const cor = hex.replace('#', '');

  if (cor.length !== 6) return false;

  const r = parseInt(cor.substring(0, 2), 16);
  const g = parseInt(cor.substring(2, 4), 16);
  const b = parseInt(cor.substring(4, 6), 16);

  const brilho = (r * 299 + g * 587 + b * 114) / 1000;

  return brilho > 180;
};

export const getMaxDias = (mes: string | null, ano: string | number) => {
  if (!mes) return 31;

  if (['ABRIL', 'JUNHO', 'SETEMBRO', 'NOVEMBRO'].includes(mes)) {
    return 30;
  }

  if (mes === 'FEVEREIRO') {
    const anoNumerico = Number(ano);

    const bissexto =
      (anoNumerico % 4 === 0 && anoNumerico % 100 !== 0) ||
      anoNumerico % 400 === 0;

    return bissexto ? 29 : 28;
  }

  return 31;
};