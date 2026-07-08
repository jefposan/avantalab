export const formatarMoeda = (valor: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
};

const SIGLAS_DESCRICAO: Record<string, string> = {
  cnpj: 'CNPJ',
  cofins: 'COFINS',
  cpf: 'CPF',
  csll: 'CSLL',
  darf: 'DARF',
  doc: 'DOC',
  fgts: 'FGTS',
  gps: 'GPS',
  icms: 'ICMS',
  inss: 'INSS',
  iptu: 'IPTU',
  ir: 'IR',
  irpf: 'IRPF',
  irpj: 'IRPJ',
  iss: 'ISS',
  issqn: 'ISSQN',
  mei: 'MEI',
  nf: 'NF',
  nfe: 'NF-e',
  'nf-e': 'NF-e',
  nfse: 'NFS-e',
  'nfs-e': 'NFS-e',
  pis: 'PIS',
  pix: 'PIX',
  ted: 'TED',
};

const TERMOS_ESPECIAIS_DESCRICAO: Record<string, string> = {
  esocial: 'eSocial',
  ifood: 'iFood',
  mcdonalds: "McDonald's",
  "mcdonald's": "McDonald's",
  netflix: 'Netflix',
  nubank: 'Nubank',
  picpay: 'PicPay',
  prolabore: 'Pró-labore',
  'pro-labore': 'Pró-labore',
  youtube: 'YouTube',
};

const CONECTIVOS_DESCRICAO = new Set([
  'a',
  'ao',
  'aos',
  'as',
  'com',
  'da',
  'das',
  'de',
  'do',
  'dos',
  'e',
  'em',
  'na',
  'nas',
  'no',
  'nos',
  'o',
  'os',
  'para',
  'por',
  'sem',
]);

const removerAcentosDescricao = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const capitalizarDescricao = (texto: string) =>
  texto
    .toLocaleLowerCase('pt-BR')
    .split('-')
    .map((parte) => (parte ? parte.charAt(0).toLocaleUpperCase('pt-BR') + parte.slice(1) : parte))
    .join('-');

export const formatarDescricao = (texto: string) => {
  const textoLimpo = String(texto || '').trim().replace(/\s+/g, ' ');

  if (!textoLimpo) return '';

  const palavrasNormalizadas = textoLimpo
    .split(' ')
    .map((palavra) => removerAcentosDescricao(palavra).toLocaleLowerCase('pt-BR'));
  const contextoFiscal = palavrasNormalizadas.some((palavra) =>
    ['guia', 'imposto', 'mei', 'nacional', 'receita', 'simples', 'tributo', 'tributos'].includes(palavra)
  );

  return textoLimpo
    .split(' ')
    .map((palavra, indice) => {
      const partes = palavra.match(/^([^A-Za-zÀ-ÖØ-öø-ÿ0-9]*)(.*?)([^A-Za-zÀ-ÖØ-öø-ÿ0-9]*)$/);
      if (!partes) return palavra;

      const [, prefixo, miolo, sufixo] = partes;
      if (!miolo) return palavra;

      const chave = removerAcentosDescricao(miolo).toLocaleLowerCase('pt-BR');
      const originalMaiusculo = miolo === miolo.toLocaleUpperCase('pt-BR') && /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(miolo);

      if (chave === 'das' && (originalMaiusculo || contextoFiscal)) {
        return `${prefixo}DAS${sufixo}`;
      }

      if (SIGLAS_DESCRICAO[chave]) return `${prefixo}${SIGLAS_DESCRICAO[chave]}${sufixo}`;
      if (TERMOS_ESPECIAIS_DESCRICAO[chave]) return `${prefixo}${TERMOS_ESPECIAIS_DESCRICAO[chave]}${sufixo}`;
      if (/[a-zà-öø-ÿ][A-ZÀ-ÖØ-Þ]/.test(miolo)) return palavra;
      if (indice > 0 && CONECTIVOS_DESCRICAO.has(chave)) return `${prefixo}${chave}${sufixo}`;

      return `${prefixo}${capitalizarDescricao(miolo)}${sufixo}`;
    })
    .join(' ');
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
export const normalizarTexto = (texto: string) => {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
};
