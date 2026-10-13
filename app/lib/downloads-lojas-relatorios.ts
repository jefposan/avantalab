type LinhaApple = {
  appleId: string;
  unidades: number;
  tipoProduto: string;
};

type LinhaGoogle = {
  data: string;
  pacote: string;
  instalacoes: number;
};

// A Apple usa variantes por plataforma para a primeira instalação. As versões
// 1, 1F e 1T são as mais comuns para iOS/iPadOS; as demais mantêm a leitura
// correta quando o app é publicado como app personalizado.
const TIPOS_DOWNLOAD_INICIAL_APPLE = new Set(['1', '1F', '1T', '1E', '1EP', '1EU']);

export function ehDownloadInicialApple(tipoProduto: string) {
  return TIPOS_DOWNLOAD_INICIAL_APPLE.has(tipoProduto.trim().toUpperCase());
}

function numero(valor: string | undefined) {
  if (!valor) return 0;
  const convertido = Number(valor.replace(/,/g, ''));
  return Number.isFinite(convertido) ? convertido : 0;
}

function normalizarCabecalho(valor: string) {
  return valor.trim().toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, ' ').trim();
}

function dividirCsv(linha: string) {
  const campos: string[] = [];
  let atual = '';
  let entreAspas = false;
  for (let indice = 0; indice < linha.length; indice += 1) {
    const caractere = linha[indice];
    if (caractere === '"') {
      if (entreAspas && linha[indice + 1] === '"') {
        atual += '"';
        indice += 1;
      } else {
        entreAspas = !entreAspas;
      }
    } else if (caractere === ',' && !entreAspas) {
      campos.push(atual.trim());
      atual = '';
    } else {
      atual += caractere;
    }
  }
  campos.push(atual.trim());
  return campos;
}

export function lerRelatorioApple(conteudo: string): LinhaApple[] {
  const linhas = conteudo.trim().split(/\r?\n/).filter(Boolean);
  if (linhas.length < 2) return [];
  const cabecalho = linhas[0].split('\t').map(normalizarCabecalho);
  const indice = (nome: string) => cabecalho.indexOf(nome);
  const appleId = indice('apple identifier');
  const unidades = indice('units');
  const tipoProduto = indice('product type identifier');
  if (appleId < 0 || unidades < 0) return [];
  return linhas.slice(1).map((linha) => {
    const colunas = linha.split('\t');
    return {
      appleId: colunas[appleId]?.trim() || '',
      unidades: numero(colunas[unidades]),
      tipoProduto: tipoProduto >= 0 ? colunas[tipoProduto]?.trim() || '' : '',
    };
  });
}

export function decodificarRelatorioGoogle(conteudo: Uint8Array): string {
  // Os CSVs oficiais do Play Console usam UTF-16. Também aceitamos UTF-8
  // para arquivos já convertidos e UTF-16 sem BOM, sem perder o cabeçalho.
  const bigEndian = conteudo[0] === 0xfe && conteudo[1] === 0xff;
  const littleEndian = conteudo[0] === 0xff && conteudo[1] === 0xfe;
  const semBomLittleEndian = conteudo[1] === 0 && conteudo[3] === 0;
  const semBomBigEndian = conteudo[0] === 0 && conteudo[2] === 0;
  const encoding = bigEndian || semBomBigEndian ? 'utf-16be'
    : littleEndian || semBomLittleEndian ? 'utf-16le' : 'utf-8';
  return new TextDecoder(encoding, { fatal: true }).decode(conteudo);
}

export function lerRelatorioGoogle(conteudo: string | Uint8Array): LinhaGoogle[] {
  const texto = typeof conteudo === 'string' ? conteudo : decodificarRelatorioGoogle(conteudo);
  const linhas = texto.trim().split(/\r?\n/).filter(Boolean);
  if (!linhas.length) throw new Error('O relatório de instalações do Google Play está vazio.');
  const cabecalho = dividirCsv(linhas[0]).map(normalizarCabecalho);
  const indice = (...nomes: string[]) => nomes.map((nome) => cabecalho.indexOf(nome)).find((posicao) => posicao >= 0) ?? -1;
  const data = indice('date');
  const pacote = indice('package name', 'package');
  const instalacoes = indice('daily device installs', 'daily user installs');
  if (data < 0 || pacote < 0 || instalacoes < 0) {
    throw new Error('Não foi possível reconhecer as colunas de instalações do relatório Google Play.');
  }
  return linhas.slice(1).map((linha) => {
    const colunas = dividirCsv(linha);
    return {
      data: colunas[data]?.trim() || '',
      pacote: colunas[pacote]?.trim() || '',
      instalacoes: numero(colunas[instalacoes]),
    };
  });
}
