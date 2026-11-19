// Contrato compartilhado entre seleção de colunas e importação parcial.
export const CAMPOS_EXCEL = [
  ['nome', 'Nome'], ['tipo_item', 'Tipo'], ['marca', 'Marca'], ['categoria', 'Categoria'],
  ['descricao', 'Descrição'], ['preco_custo', 'Custo'], ['preco_venda', 'Preço padrão'],
  ['unidade', 'Unidade'], ['codigo_barras', 'Código de barras'], ['ativo', 'Ativo'],
  ['disponivel_catalogo', 'Disponível no catálogo'], ['ncm', 'NCM'], ['cest', 'CEST'],
  ['origem_mercadoria', 'Origem'], ['unidade_tributavel', 'Unidade tributável'],
  ['cfop_padrao', 'CFOP padrão'], ['cst', 'CST'], ['csosn', 'CSOSN'], ['cst_pis', 'CST PIS'],
  ['cst_cofins', 'CST COFINS'], ['cst_ibs_cbs', 'CST IBS/CBS'], ['classificacao_ibs_cbs', 'Classificação IBS/CBS'],
  ['codigo_tributacao_nacional', 'Código tributação nacional'], ['codigo_tributacao_municipal', 'Código tributação municipal'],
  ['nbs', 'NBS'], ['item_lc116', 'Item LC 116'], ['municipio_prestacao', 'Município da prestação'], ['aliquota_iss', 'Alíquota ISS'],
] as const;

export function camposPresentesExcel(cabecalhos: string[], selecionados?: string[]) {
  return CAMPOS_EXCEL.filter(([campo, titulo]) => cabecalhos.includes(titulo) && (!selecionados || selecionados.includes(campo))).map(([campo]) => campo);
}

export function limitarPatchExcel(produto: Record<string, unknown>, campos: string[]) {
  return Object.fromEntries(Object.entries(produto).filter(([campo, valor]) =>
    (['id', 'sku', 'atualizado_em'].includes(campo) || campos.includes(campo)) &&
    !(campo === 'preco_venda' && (valor === null || valor === ''))));
}
