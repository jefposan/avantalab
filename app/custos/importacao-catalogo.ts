export const COLUNAS_CATALOGO_PRODUTOS = [
  ['Código interno', 'sku'], ['Nome *', 'nome'], ['Marca', 'marca'], ['Categoria', 'categoria'],
  ['Descrição', 'descricao'], ['Custo (R$)', 'preco_custo'], ['Preço de venda (R$)', 'preco_venda'],
  ['Unidade', 'unidade'], ['Código de barras', 'codigo_barras'], ['Código do fornecedor', 'fornecedor_codigo'],
  ['Cadastro ativo', 'ativo'], ['Disponível no catálogo', 'disponivel_catalogo'],
  ['Habilitado fiscal', 'habilitado_fiscal'], ['NCM', 'ncm'], ['CEST', 'cest'],
  ['Origem da mercadoria', 'origem_mercadoria'], ['Unidade tributável', 'unidade_tributavel'],
  ['CFOP padrão', 'cfop_padrao'], ['CST', 'cst'], ['CSOSN', 'csosn'],
  ['CST PIS', 'cst_pis'], ['CST COFINS', 'cst_cofins'], ['CST IBS/CBS', 'cst_ibs_cbs'],
  ['Classificação IBS/CBS', 'classificacao_ibs_cbs'], ['Imagem URL', 'imagem_url'],
] as const;

export type ProdutoImportadoCatalogo = Record<(typeof COLUNAS_CATALOGO_PRODUTOS)[number][1], string | number | boolean> & { tipo_item: 'produto' };

const valorTexto = (valor: unknown) => String(valor ?? '').trim();
const cabecalhoNormalizado = (valor: unknown) => valorTexto(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s*\*\s*/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
const booleano = (valor: unknown, padrao: boolean) => {
  const texto = valorTexto(valor).toLocaleLowerCase('pt-BR');
  if (!texto) return padrao;
  if (['sim', 's', 'true', '1'].includes(texto)) return true;
  if (['não', 'nao', 'n', 'false', '0'].includes(texto)) return false;
  throw new Error('use Sim ou Não');
};
const dinheiro = (valor: unknown) => {
  const bruto = valorTexto(valor).replace(/R\$/gi, '').replace(/\s/g, '');
  if (!bruto) return 0;
  const normalizado = bruto.includes(',') ? bruto.replace(/\./g, '').replace(',', '.') : bruto;
  const numero = Number(normalizado);
  if (!Number.isFinite(numero) || numero < 0 || Math.abs(Math.round(numero * 100) - numero * 100) > 1e-6 || numero > 9999999999.99) throw new Error('informe valor positivo ou zero, com até duas casas decimais');
  return numero;
};

export function validarPlanilhaCatalogo(linhas: unknown[][], fornecedores: Array<{ codigo: string }> = []) {
  const cabecalhoIndice = linhas.findIndex((linha) => linha.some((valor) => cabecalhoNormalizado(valor) === 'nome'));
  if (cabecalhoIndice < 0) throw new Error('A planilha precisa ter uma coluna Nome. Use o modelo AvantaLab como referência.');
  const cabecalhos = linhas[cabecalhoIndice].map(cabecalhoNormalizado);
  if (new Set(cabecalhos.filter(Boolean)).size !== cabecalhos.filter(Boolean).length) throw new Error('A planilha possui cabeçalhos repetidos.');
  const conteudo = linhas.slice(cabecalhoIndice + 1).map((linha, indice) => ({ linha, numero: cabecalhoIndice + indice + 2 }))
    .filter(({ linha }) => linha.some((valor) => valorTexto(valor)));
  if (!conteudo.length) throw new Error('Preencha pelo menos um produto na planilha.');
  if (conteudo.length > 1000) throw new Error('Importe até 1.000 produtos por catálogo.');
  const erros: string[] = [];
  const avisos: string[] = [];
  const codigos = new Set<string>();
  const produtos = conteudo.map(({ linha, numero }) => {
    const entrada = Object.fromEntries(COLUNAS_CATALOGO_PRODUTOS.map(([rotulo, campo]) => [campo, linha[cabecalhos.indexOf(cabecalhoNormalizado(rotulo))]]));
    const sku = valorTexto(entrada.sku).toUpperCase();
    const nome = valorTexto(entrada.nome);
    const ncmBruto = valorTexto(entrada.ncm);
    const ncm = ncmBruto.replace(/[.\s-]/g, '');
    const unidade = valorTexto(entrada.unidade) || 'un';
    const unidadeTributavel = valorTexto(entrada.unidade_tributavel).toUpperCase();
    if (sku.length > 80) erros.push(`Linha ${numero}: código interno deve ter até 80 caracteres.`);
    if (sku && codigos.has(sku)) erros.push(`Linha ${numero}: código ${sku} repetido.`);
    if (sku) codigos.add(sku);
    if (!nome || nome.length > 250) erros.push(`Linha ${numero}: nome obrigatório, até 250 caracteres.`);
    if (ncmBruto && !/^\d{8}$/.test(ncm)) erros.push(`Linha ${numero}: NCM informado deve ter 8 dígitos.`);
    if (unidadeTributavel.length > 20) erros.push(`Linha ${numero}: unidade tributável muito longa.`);
    if (unidade.length > 20) erros.push(`Linha ${numero}: unidade muito longa.`);
    const produto: Record<string, string | number | boolean> = { tipo_item: 'produto', sku, nome, ncm, unidade, unidade_tributavel: unidadeTributavel };
    for (const [, campo] of COLUNAS_CATALOGO_PRODUTOS) {
      if (campo in produto) continue;
      try {
        produto[campo] = campo === 'preco_custo' || campo === 'preco_venda' ? dinheiro(entrada[campo])
          : campo === 'ativo' || campo === 'disponivel_catalogo' || campo === 'habilitado_fiscal'
            ? booleano(entrada[campo], campo === 'ativo') : valorTexto(entrada[campo]);
      } catch (falha) { erros.push(`Linha ${numero}, ${campo}: ${(falha as Error).message}.`); }
    }
    if (valorTexto(produto.cest) && !/^\d{2}[.\s-]?\d{3}[.\s-]?\d{2}$/.test(valorTexto(produto.cest))) erros.push(`Linha ${numero}: CEST deve ter 7 dígitos.`);
    if (valorTexto(produto.cest)) produto.cest = valorTexto(produto.cest).replace(/[.\s-]/g, '');
    if (valorTexto(produto.cfop_padrao) && !/^\d{4}$/.test(valorTexto(produto.cfop_padrao))) erros.push(`Linha ${numero}: CFOP deve ter 4 dígitos.`);
    if (valorTexto(produto.codigo_barras) && !/^\d{8,14}$/.test(valorTexto(produto.codigo_barras))) erros.push(`Linha ${numero}: código de barras deve ter de 8 a 14 dígitos.`);
    if (valorTexto(produto.fornecedor_codigo) && !/^\d+$/.test(valorTexto(produto.fornecedor_codigo))) erros.push(`Linha ${numero}: fornecedor deve ser identificado pelo código numérico.`);
    if (valorTexto(produto.fornecedor_codigo) && !fornecedores.some((fornecedor) => fornecedor.codigo === valorTexto(produto.fornecedor_codigo))) erros.push(`Linha ${numero}: fornecedor ${produto.fornecedor_codigo} não está ativo neste perfil.`);
    if (valorTexto(produto.imagem_url) && !/^https:\/\//i.test(valorTexto(produto.imagem_url))) erros.push(`Linha ${numero}: URL da imagem deve começar com https://.`);
    if (produto.disponivel_catalogo && Number(produto.preco_venda) <= 0) {
      produto.disponivel_catalogo = false;
      avisos.push(`Linha ${numero}: sem preço de venda positivo; ficará fora do Vendas até a revisão.`);
    }
    if (produto.habilitado_fiscal && (!ncm || !unidadeTributavel)) {
      produto.habilitado_fiscal = false;
      avisos.push(`Linha ${numero}: NCM ou unidade tributável ausente; uso fiscal ficará desabilitado.`);
    }
    return produto as ProdutoImportadoCatalogo;
  });
  return { produtos, erros, avisos, codigosGerar: produtos.filter((produto) => !produto.sku).length };
}
