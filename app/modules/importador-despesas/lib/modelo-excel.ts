const CAMINHO_MODELO = '/modelos/modelo-importacao-despesas-avantalab.xlsx';
const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function escaparXml(valor: string) {
  return valor
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function tiposUnicos(tipos: string[]) {
  return Array.from(new Set(tipos.map((tipo) => tipo.trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
}

function proximoNumero(xml: string, expressao: RegExp) {
  const encontrados = Array.from(xml.matchAll(expressao), (resultado) => Number(resultado[1]))
    .filter(Number.isFinite);
  return Math.max(0, ...encontrados) + 1;
}

function prefixoDaTag(xml: string, tag: string) {
  const encontrado = xml.match(new RegExp(`<([A-Za-z][\\w.-]*:)?${tag}\\b`));
  return encontrado?.[1] ?? '';
}

function inserirAntesDaTag(xml: string, tag: string, conteudo: string) {
  const expressao = new RegExp(`<([A-Za-z][\\w.-]*:)?${tag}\\b`);
  if (!expressao.test(xml)) throw new Error('O arquivo modelo está incompleto.');
  return xml.replace(expressao, (marcador) => `${conteudo}${marcador}`);
}

function inserirAntesDoFechamento(xml: string, tag: string, conteudo: string) {
  const expressao = new RegExp(`</([A-Za-z][\\w.-]*:)?${tag}>`);
  if (!expressao.test(xml)) throw new Error('O arquivo modelo está incompleto.');
  return xml.replace(expressao, (marcador) => `${conteudo}${marcador}`);
}

export async function personalizarModeloImportacaoDespesas(
  arquivoBase: ArrayBuffer,
  tipos: string[],
) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(arquivoBase);
  const lerXml = async (caminho: string) => {
    const arquivo = zip.file(caminho);
    if (!arquivo) throw new Error('O arquivo modelo está incompleto.');
    return arquivo.async('string');
  };

  let workbookXml = await lerXml('xl/workbook.xml');
  let relacionamentosXml = await lerXml('xl/_rels/workbook.xml.rels');
  let tiposConteudoXml = await lerXml('[Content_Types].xml');
  let despesasXml = await lerXml('xl/worksheets/sheet1.xml');

  const lista = tiposUnicos(tipos);
  const quantidade = Math.max(lista.length, 1);
  const proximaPlanilha = proximoNumero(workbookXml, /sheetId="(\d+)"/g);
  const proximoRelacionamento = proximoNumero(relacionamentosXml, /Id="rId(\d+)"/g);
  const idRelacionamento = `rId${proximoRelacionamento}`;
  const nomePlanilha = 'Tipos do perfil';
  const caminhoPlanilha = `xl/worksheets/sheet${proximaPlanilha}.xml`;
  const prefixoWorkbook = prefixoDaTag(workbookXml, 'workbook');
  const prefixoDespesas = prefixoDaTag(despesasXml, 'worksheet');

  const linhas = lista.length
    ? lista.map((tipo, indice) => `<row r="${indice + 1}"><c r="A${indice + 1}" t="inlineStr"><is><t>${escaparXml(tipo)}</t></is></c></row>`).join('')
    : '<row r="1"><c r="A1" t="inlineStr"><is><t></t></is></c></row>';

  const planilhaTiposXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + `<dimension ref="A1:A${quantidade}"/><sheetViews><sheetView workbookViewId="0"/></sheetViews>`
    + `<sheetFormatPr defaultRowHeight="15"/><sheetData>${linhas}</sheetData></worksheet>`;

  workbookXml = inserirAntesDoFechamento(
    workbookXml,
    'sheets',
    `<${prefixoWorkbook}sheet name="${nomePlanilha}" sheetId="${proximaPlanilha}" state="hidden" `
      + `r:id="${idRelacionamento}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>`,
  );
  const nomeDefinido = `<${prefixoWorkbook}definedName name="TiposDespesa">`
    + `&apos;${nomePlanilha}&apos;!$A$1:$A$${quantidade}</${prefixoWorkbook}definedName>`;
  workbookXml = /<([A-Za-z][\w.-]*:)?definedNames\b/.test(workbookXml)
    ? inserirAntesDoFechamento(workbookXml, 'definedNames', nomeDefinido)
    : inserirAntesDoFechamento(
      workbookXml,
      'workbook',
      `<${prefixoWorkbook}definedNames>${nomeDefinido}</${prefixoWorkbook}definedNames>`,
    );

  relacionamentosXml = inserirAntesDoFechamento(
    relacionamentosXml,
    'Relationships',
    `<Relationship Id="${idRelacionamento}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${proximaPlanilha}.xml"/>`,
  );
  tiposConteudoXml = inserirAntesDoFechamento(
    tiposConteudoXml,
    'Types',
    `<Override PartName="/${caminhoPlanilha}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  );

  const validacao = `<${prefixoDespesas}dataValidations count="1">`
    + `<${prefixoDespesas}dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" `
    + 'errorStyle="stop" errorTitle="Tipo inválido" error="Selecione um tipo cadastrado na lista." '
    + 'promptTitle="Tipo de despesa" prompt="Selecione um tipo cadastrado no perfil." sqref="B4:B500">'
    + `<${prefixoDespesas}formula1>TiposDespesa</${prefixoDespesas}formula1>`
    + `</${prefixoDespesas}dataValidation></${prefixoDespesas}dataValidations>`;
  despesasXml = inserirAntesDaTag(despesasXml, 'pageMargins', validacao);

  zip.file('xl/workbook.xml', workbookXml);
  zip.file('xl/_rels/workbook.xml.rels', relacionamentosXml);
  zip.file('[Content_Types].xml', tiposConteudoXml);
  zip.file('xl/worksheets/sheet1.xml', despesasXml);
  zip.file(caminhoPlanilha, planilhaTiposXml);

  return zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

export async function baixarModeloImportacaoDespesas(tipos: string[]) {
  const resposta = await fetch(CAMINHO_MODELO, { cache: 'no-store' });
  if (!resposta.ok) throw new Error('Não foi possível carregar o arquivo modelo.');
  const conteudo = await personalizarModeloImportacaoDespesas(await resposta.arrayBuffer(), tipos);
  const buffer = conteudo.buffer.slice(
    conteudo.byteOffset,
    conteudo.byteOffset + conteudo.byteLength,
  ) as ArrayBuffer;
  const url = URL.createObjectURL(new Blob([buffer], { type: TIPO_XLSX }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'modelo-importacao-despesas-avantalab.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
