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
  preco: unknown;
};

export type ProdutoIdentificacao = {
  id: string;
  sku: string;
  nome: string;
  atualizado_em: string;
};

const normalizarIdentificacao = (valor: unknown) => String(valor ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').trim().toLocaleUpperCase('pt-BR').replace(/\s+/g, ' ');

export function identificarProdutosDoExcel(
  linhas: Array<{ codigo: unknown; nome: unknown }>,
  produtosDaEmpresa: ProdutoIdentificacao[],
): Array<{ id: string; sku: string; atualizado_em: string }> {
  const porCodigo = new Map<string, ProdutoIdentificacao[]>();
  for (const produto of produtosDaEmpresa) {
    const codigo = normalizarIdentificacao(produto.sku);
    const candidatos = porCodigo.get(codigo) || [];
    candidatos.push(produto);
    porCodigo.set(codigo,candidatos);
  }
  const idsUsados = new Set<string>();
  return linhas.map((linha, indice) => {
    const codigo = normalizarIdentificacao(linha.codigo);
    const nome = normalizarIdentificacao(linha.nome);
    if (!codigo || !nome) throw new Error(`Linha ${indice + 2}: informe Código e Nome do produto.`);
    const encontrados = porCodigo.get(codigo) || [];
    const candidatos = encontrados.length <= 1 ? encontrados : encontrados.filter((produto) =>
      normalizarIdentificacao(produto.nome) === nome);
    if (candidatos.length !== 1) {
      throw new Error(`Linha ${indice + 2}: ${candidatos.length ? 'Código/Nome ambíguos' : 'Produto não encontrado'} (${codigo}). Confira antes de importar.`);
    }
    const produto = candidatos[0];
    if (idsUsados.has(produto.id)) throw new Error(`O produto ${codigo} aparece mais de uma vez no Excel.`);
    idsUsados.add(produto.id);
    return {id:produto.id,sku:produto.sku,atualizado_em:produto.atualizado_em};
  });
}

function converterPrecoOrigem(valor: unknown, contexto: string): number | null {
  if (valor === null || valor === undefined || String(valor).trim() === '') return null;
  if (typeof valor === 'number') {
    if (Number.isFinite(valor) && valor >= 0) return valor;
    throw new Error(`Preço inválido em ${contexto}.`);
  }
  const texto = String(valor).trim().replace(/^R\$\s*/i,'').replace(/\s/g,'');
  const moeda = texto.includes(',') ? texto.replace(/\./g,'').replace(',','.') : texto;
  const numero = Number(moeda);
  if (!/^-?\d+(?:\.\d+)?$/.test(moeda) || !Number.isFinite(numero) || numero < 0) {
    throw new Error(`Preço inválido em ${contexto}.`);
  }
  return numero;
}

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
  const origensSelecionadas = new Set(mapeamentos.map((item) => item.origem));
  const porColuna = new Map<string, Array<ValorOrigemPreco & { preco: number }>>();
  for (const valor of valoresOrigem) {
    if (!origensSelecionadas.has(valor.cabecalho)) continue;
    const preco = converterPrecoOrigem(valor.preco, `${valor.cabecalho} para o produto ${valor.sku}`);
    if (preco === null) continue;
    const encontrados = porColuna.get(valor.cabecalho) || [];
    encontrados.push({...valor, preco});
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
