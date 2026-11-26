// A tabela de DESTINO determina o campo que será atualizado; uma mesma
// coluna do Excel pode ser reutilizada em quantas tabelas o usuário escolher.
export type MapeamentoImportacaoPreco = {
  origem: string;
  destino: string;
};

export type ColunaPrecoDisponivel = {
  codigo: string;
  cabecalho: string;
};

export type TabelaPrecoDestino = {
  codigo: string;
  nome: string;
  padrao: boolean;
};

export type ValorOrigemPreco = {
  produto_id: string;
  sku: string;
  cabecalho: string;
  preco: number;
};

const normalizarRotulo = (valor: string) => String(valor ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  .replace(/\bpreco(?:s)?\b/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

export function sugerirColunaPreco(
  tabela: TabelaPrecoDestino,
  colunasDisponiveis: ColunaPrecoDisponivel[],
): string {
  const candidatos = tabela.padrao ? ['preco padrao', 'padrao'] : [tabela.nome, tabela.codigo];
  for (const nome of candidatos) {
    const identificador = normalizarRotulo(nome);
    const equivalente = colunasDisponiveis.find((coluna) => normalizarRotulo(coluna.cabecalho) === identificador
      || normalizarRotulo(coluna.codigo) === identificador);
    if (equivalente) return equivalente.cabecalho;
  }
  return '';
}

export function validarMapeamentosImportacao(
  mapeamentos: MapeamentoImportacaoPreco[],
  colunasDisponiveis: string[],
  tabelasDisponiveis: string[],
): string | null {
  const origens = new Set(colunasDisponiveis);
  const destinosPermitidos = new Set(tabelasDisponiveis);
  const destinosUsados = new Set<string>();
  for (const item of mapeamentos) {
    if (!item.origem || !item.destino) return 'Escolha uma coluna de origem para cada tabela selecionada.';
    if (!origens.has(item.origem)) return `A coluna ${item.origem} não existe no arquivo.`;
    if (!destinosPermitidos.has(item.destino)) return `A tabela ${item.destino} não está disponível.`;
    if (destinosUsados.has(item.destino)) return 'Cada tabela de destino só pode ser atualizada uma vez por importação.';
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
