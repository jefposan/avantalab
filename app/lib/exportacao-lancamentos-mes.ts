export type LinhaExportacaoLancamentoMes = {
  tipo: 'Receita' | 'Despesa';
  data: string;
  descricao: string;
  natureza?: string;
  status?: string;
  valor: number;
};

export type DadosExportacaoLancamentosMes = {
  mes: string;
  ano: string | number;
  perfil: string;
  linhas: LinhaExportacaoLancamentoMes[];
};

const moeda = (valor: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(Number(valor || 0));

const textoSeguro = (valor: string | undefined) => String(valor || '—').replace(/\s+/g, ' ').trim() || '—';

const nomeArquivo = ({ mes, ano }: DadosExportacaoLancamentosMes, extensao: 'xlsx' | 'pdf') =>
  `lancamentos-avantalab-${String(mes || 'mes').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}-${ano}.${extensao}`;

const baixar = (conteudo: BlobPart, tipo: string, arquivo: string) => {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const link = document.createElement('a');
  link.href = url;
  link.download = arquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

const totais = (linhas: LinhaExportacaoLancamentoMes[]) => {
  const receitas = linhas
    .filter((linha) => linha.tipo === 'Receita')
    .reduce((soma, linha) => soma + Number(linha.valor || 0), 0);
  const despesas = linhas
    .filter((linha) => linha.tipo === 'Despesa')
    .reduce((soma, linha) => soma + Number(linha.valor || 0), 0);
  return { receitas, despesas, saldo: receitas - despesas };
};

export async function exportarLancamentosMesExcel(dados: DadosExportacaoLancamentosMes) {
  const XLSX = await import('xlsx');
  const resumo = totais(dados.linhas);
  const linhas = [...dados.linhas].sort((a, b) => a.data.localeCompare(b.data) || a.tipo.localeCompare(b.tipo));
  const planilha = XLSX.utils.aoa_to_sheet([
    ['Lançamentos do mês'],
    ['Perfil', textoSeguro(dados.perfil)],
    ['Competência', `${textoSeguro(dados.mes)} de ${dados.ano}`],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
    [],
    ['Data', 'Tipo', 'Descrição', 'Natureza', 'Situação', 'Valor'],
    ...linhas.map((linha) => [
      textoSeguro(linha.data),
      linha.tipo,
      textoSeguro(linha.descricao),
      textoSeguro(linha.natureza),
      textoSeguro(linha.status),
      Number(linha.valor || 0),
    ]),
  ]);
  planilha['!cols'] = [{ wch: 13 }, { wch: 12 }, { wch: 44 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
  planilha['!autofilter'] = { ref: `A6:F${Math.max(7, linhas.length + 6)}` };
  for (let indice = 7; indice <= linhas.length + 6; indice += 1) {
    const celula = planilha[`F${indice}`];
    if (celula) celula.z = '[$R$-pt-BR] #,##0.00';
  }

  const resumoPlanilha = XLSX.utils.aoa_to_sheet([
    ['Resumo mensal'],
    ['Perfil', textoSeguro(dados.perfil)],
    ['Competência', `${textoSeguro(dados.mes)} de ${dados.ano}`],
    [],
    ['Receitas', resumo.receitas],
    ['Despesas', resumo.despesas],
    ['Saldo', resumo.saldo],
  ]);
  resumoPlanilha['!cols'] = [{ wch: 24 }, { wch: 18 }];
  ['B5', 'B6', 'B7'].forEach((chave) => { if (resumoPlanilha[chave]) resumoPlanilha[chave].z = '[$R$-pt-BR] #,##0.00'; });

  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Lançamentos');
  XLSX.utils.book_append_sheet(livro, resumoPlanilha, 'Resumo');
  XLSX.writeFile(livro, nomeArquivo(dados, 'xlsx'));
}

export async function exportarLancamentosMesPdf(dados: DadosExportacaoLancamentosMes) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const largura = 841.89;
  const altura = 595.28;
  const margem = 34;
  const colunas = [
    { titulo: 'DATA', largura: 66 }, { titulo: 'TIPO', largura: 62 }, { titulo: 'DESCRIÇÃO', largura: 315 },
    { titulo: 'NATUREZA', largura: 80 }, { titulo: 'SITUAÇÃO', largura: 80 }, { titulo: 'VALOR', largura: 100 },
  ];
  const linhas = [...dados.linhas].sort((a, b) => a.data.localeCompare(b.data) || a.tipo.localeCompare(b.tipo));
  const resumo = totais(linhas);
  const corPrimaria = rgb(0 / 255, 62 / 255, 115 / 255);
  const corTexto = rgb(30 / 255, 41 / 255, 59 / 255);
  const corAuxiliar = rgb(100 / 255, 116 / 255, 139 / 255);
  const corBorda = rgb(203 / 255, 213 / 255, 225 / 255);
  const corCabecalho = rgb(241 / 255, 245 / 255, 249 / 255);
  const reduzir = (valor: string | undefined, tamanho: number, limite: number) => {
    const texto = textoSeguro(valor);
    if (fonte.widthOfTextAtSize(texto, tamanho) <= limite) return texto;
    let fim = texto.length;
    while (fim > 1 && fonte.widthOfTextAtSize(`${texto.slice(0, fim)}…`, tamanho) > limite) fim -= 1;
    return `${texto.slice(0, fim).trimEnd()}…`;
  };
  let pagina = pdf.addPage([largura, altura]);
  let y = altura - margem;
  let numeroPagina = 1;
  const cabecalho = () => {
    pagina.drawRectangle({ x: margem, y: altura - margem - 45, width: largura - margem * 2, height: 45, color: corPrimaria });
    pagina.drawText('Lançamentos do mês', { x: margem + 14, y: altura - margem - 23, size: 17, font: negrito, color: rgb(1, 1, 1) });
    pagina.drawText(`${textoSeguro(dados.mes)} de ${dados.ano} · ${textoSeguro(dados.perfil)}`, { x: margem + 14, y: altura - margem - 37, size: 8.5, font: fonte, color: rgb(220 / 255, 246 / 255, 255 / 255) });
    y = altura - margem - 63;
    let x = margem;
    colunas.forEach((coluna) => {
      pagina.drawRectangle({ x, y: y - 17, width: coluna.largura, height: 17, color: corCabecalho, borderColor: corBorda, borderWidth: 0.5 });
      pagina.drawText(coluna.titulo, { x: x + 5, y: y - 11, size: 6.8, font: negrito, color: corAuxiliar });
      x += coluna.largura;
    });
    y -= 17;
  };
  const rodape = () => {
    pagina.drawText(`AvantaLab · Gerado em ${new Date().toLocaleString('pt-BR')} · Página ${numeroPagina}`, { x: margem, y: 16, size: 7, font: fonte, color: corAuxiliar });
  };
  cabecalho();
  if (!linhas.length) {
    pagina.drawText('Nenhum lançamento foi encontrado nesta competência.', { x: margem, y: y - 22, size: 10, font: fonte, color: corAuxiliar });
  }
  linhas.forEach((linha) => {
    if (y < 48) {
      rodape();
      pagina = pdf.addPage([largura, altura]);
      numeroPagina += 1;
      cabecalho();
    }
    const valores = [linha.data, linha.tipo, linha.descricao, linha.natureza, linha.status, moeda(linha.valor)];
    let x = margem;
    valores.forEach((valor, indice) => {
      const coluna = colunas[indice];
      pagina.drawRectangle({ x, y: y - 18, width: coluna.largura, height: 18, borderColor: corBorda, borderWidth: 0.5 });
      const alinhadoDireita = indice === valores.length - 1;
      const texto = reduzir(valor, 7.5, coluna.largura - 10);
      pagina.drawText(texto, {
        x: alinhadoDireita ? x + coluna.largura - 5 - fonte.widthOfTextAtSize(texto, 7.5) : x + 5,
        y: y - 11.5,
        size: 7.5,
        font: fonte,
        color: corTexto,
      });
      x += coluna.largura;
    });
    y -= 18;
  });
  if (y < 72) {
    rodape();
    pagina = pdf.addPage([largura, altura]);
    numeroPagina += 1;
    cabecalho();
  }
  pagina.drawRectangle({ x: margem, y: y - 34, width: 360, height: 28, color: corCabecalho, borderColor: corBorda, borderWidth: 0.5 });
  pagina.drawText(`Receitas: ${moeda(resumo.receitas)}   Despesas: ${moeda(resumo.despesas)}   Saldo: ${moeda(resumo.saldo)}`, { x: margem + 8, y: y - 22, size: 8.5, font: negrito, color: corTexto });
  rodape();
  const arquivo = await pdf.save();
  const bytes = arquivo.buffer.slice(arquivo.byteOffset, arquivo.byteOffset + arquivo.byteLength) as ArrayBuffer;
  baixar(bytes, 'application/pdf', nomeArquivo(dados, 'pdf'));
}
