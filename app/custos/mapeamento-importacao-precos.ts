// O mesmo preço de origem pode atualizar várias tabelas de destino.
// Um destino aparece somente uma vez para evitar sobrescritas ambíguas.
export type MapeamentoImportacaoPreco = {
  id: number;
  origem: string;
  destino: string;
};

export type ValorOrigemPreco = {
  produto_id: string;
  sku: string;
  cabecalho: string;
  preco: number;
};

export function validarMapeamentosImportacao(
  mapeamentos: MapeamentoImportacaoPreco[],
  colunasDisponiveis: string[],
  tabelasDisponiveis: string[],
): string | null {
  const origens = new Set(colunasDisponiveis);
  const destinosPermitidos = new Set(tabelasDisponiveis);
  const destinosUsados = new Set<string>();
  for (const item of mapeamentos) {
    if (!item.origem || !item.destino) return 'Escolha a coluna do Excel e a tabela de destino para cada linha.';
    if (!origens.has(item.origem)) return `A coluna ${item.origem} não existe no arquivo.`;
    if (!destinosPermitidos.has(item.destino)) return `A tabela ${item.destino} não está disponível.`;
    if (destinosUsados.has(item.destino)) return 'Cada tabela de destino só pode aparecer uma vez. Você pode repetir a coluna de origem.';
    destinosUsados.add(item.destino);
  }
  return null;
}

export function montarAtualizacaoPrecos(
  produtos: Array<Record<string, unknown>>,
  valoresOrigem: ValorOrigemPreco[],
  mapeamentos: MapeamentoImportacaoPreco[],
  codigoTabelaPadrao: string | null,
) {
  const patches = produtos.map((produto) => ({ ...produto }));
  const indiceProduto = new Map(patches.map((produto) => [String(produto.id || ''), produto]));
  const porColuna = new Map<string, ValorOrigemPreco[]>();
  for (const valor of valoresOrigem) {
    if (!Number.isFinite(valor.preco) || valor.preco < 0) throw new Error(`Valor inválido em ${valor.cabecalho} para o produto ${valor.sku}.`);
    const encontrados = porColuna.get(valor.cabecalho) || [];
    encontrados.push(valor);
    porColuna.set(valor.cabecalho, encontrados);
  }
  const precos: Array<Record<string, unknown>> = [];
  for (const item of mapeamentos) {
    for (const valor of porColuna.get(item.origem) || []) {
      if (!indiceProduto.has(valor.produto_id)) throw new Error(`Produto ${valor.sku} sem ID correspondente na planilha.`);
      if (item.destino === codigoTabelaPadrao) {
        indiceProduto.get(valor.produto_id)!.preco_venda = valor.preco;
      } else {
        precos.push({
          produto_id: valor.produto_id,
          sku: valor.sku,
          tabela_codigo: item.destino,
          preco: valor.preco,
        });
      }
    }
  }
  return { produtos: patches, precos };
}
