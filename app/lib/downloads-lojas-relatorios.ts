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

export function lerRelatorioGoogle(conteudo: string): LinhaGoogle[] {
  const linhas = conteudo.trim().split(/\r?\n/).filter(Boolean);
  if (linhas.length < 2) return [];
  const cabecalho = dividirCsv(linhas[0]).map(normalizarCabecalho);
  const indice = (...nomes: string[]) => nomes.map((nome) => cabecalho.indexOf(nome)).find((posicao) => posicao >= 0) ?? -1;
  const data = indice('date');
  const pacote = indice('package name', 'package');
  const instalacoes = indice('daily device installs', 'daily user installs');
  if (data < 0 || pacote < 0 || instalacoes < 0) return [];
  return linhas.slice(1).map((linha) => {
    const colunas = dividirCsv(linha);
    return {
      data: colunas[data]?.trim() || '',
      pacote: colunas[pacote]?.trim() || '',
      instalacoes: numero(colunas[instalacoes]),
    };
  });
}
