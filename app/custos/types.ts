export type TipoItem = 'produto' | 'servico';

export type ProdutoCustos = {
  id: string;
  catalogo_id: string;
  sku: string;
  tipo_item: TipoItem;
  nome: string;
  marca: string;
  categoria: string;
  descricao: string;
  preco_custo: number;
  preco_venda: number;
  unidade: string;
  imagem_url: string;
  codigo_barras: string;
  ativo: boolean;
  disponivel_catalogo: boolean;
  ncm: string;
  cest: string;
  origem_mercadoria: string;
  unidade_tributavel: string;
  cfop_padrao: string;
  cst: string;
  csosn: string;
  cst_pis: string;
  cst_cofins: string;
  cst_ibs_cbs: string;
  classificacao_ibs_cbs: string;
  codigo_tributacao_nacional: string;
  codigo_tributacao_municipal: string;
  nbs: string;
  item_lc116: string;
  municipio_prestacao: string;
  aliquota_iss: number;
  atualizado_em: string;
};

export type RecursoCusto = {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  unidade: string;
  custo: number;
};

export type ItemComposicao = {
  id: string;
  recursoId: string;
  quantidade: number;
  perda: number;
};

export type ComposicaoCusto = {
  itens: ItemComposicao[];
  indiretos: number;
  impostos: number;
  taxas: number;
  margem: number;
  atualizadoEm: string;
};

export type CampoCenario = {
  id: string;
  nome: string;
  tipo: 'valor' | 'percentual';
  valor: number;
};

export type CenarioPreco = {
  id: string;
  nome: string;
  campos: CampoCenario[];
  atualizadoEm: string;
};

export type VersaoCusto = {
  id: string;
  produtoId: string;
  custoDireto: number;
  custoTotal: number;
  precoSugerido: number;
  criadoEm: string;
};

export type TabelaPreco = {
  id: string;
  empresa_id: string;
  codigo: string;
  nome: string;
  descricao: string;
  padrao: boolean;
  ativo: boolean;
  atualizado_em: string;
};

export type PrecoTabelaItem = {
  tabela_preco_id: string;
  produto_id: string;
  preco: number;
  atualizado_em: string;
};

export type ResumoImportacaoCadastro = {
  produtos_criados: number;
  produtos_atualizados: number;
  precos_atualizados: number;
  aplicado: boolean;
};

export function precoEfetivoTabela(tabela: TabelaPreco | undefined, produto: ProdutoCustos, precos: PrecoTabelaItem[]) {
  if (!tabela || tabela.padrao) return produto.preco_venda;
  return precos.find((item) => item.tabela_preco_id === tabela.id && item.produto_id === produto.id)?.preco ?? produto.preco_venda;
}

export type DocumentoCustos = {
  version: 1;
  recursos: RecursoCusto[];
  composicoes: Record<string, ComposicaoCusto>;
  cenarios: CenarioPreco[];
  historico: VersaoCusto[];
};

export const documentoVazio = (): DocumentoCustos => ({
  version: 1,
  recursos: [],
  composicoes: {},
  cenarios: [],
  historico: [],
});

export const composicaoVazia = (): ComposicaoCusto => ({
  itens: [],
  indiretos: 0,
  impostos: 0,
  taxas: 0,
  margem: 30,
  atualizadoEm: new Date().toISOString(),
});

export function normalizarDocumento(valor: unknown): DocumentoCustos {
  if (!valor || typeof valor !== 'object') return documentoVazio();
  const dado = valor as Partial<DocumentoCustos>;
  return {
    version: 1,
    recursos: Array.isArray(dado.recursos) ? dado.recursos : [],
    composicoes: dado.composicoes && typeof dado.composicoes === 'object' ? dado.composicoes : {},
    cenarios: Array.isArray(dado.cenarios) ? dado.cenarios : [],
    historico: Array.isArray(dado.historico) ? dado.historico : [],
  };
}

export function novoProduto(tipo: TipoItem, catalogoId: string): ProdutoCustos {
  return {
    id: '', catalogo_id: catalogoId, sku: '', tipo_item: tipo, nome: '', marca: '', categoria: '', descricao: '',
    preco_custo: 0, preco_venda: 0, unidade: tipo === 'produto' ? 'un' : 'serviço', imagem_url: '', codigo_barras: '',
    ativo: true, disponivel_catalogo: false, ncm: '', cest: '', origem_mercadoria: '0 - Nacional',
    unidade_tributavel: tipo === 'produto' ? 'un' : 'serviço', cfop_padrao: '', cst: '', csosn: '', cst_pis: '',
    cst_cofins: '', cst_ibs_cbs: '', classificacao_ibs_cbs: '', codigo_tributacao_nacional: '',
    codigo_tributacao_municipal: '', nbs: '', item_lc116: '', municipio_prestacao: '', aliquota_iss: 0,
    atualizado_em: new Date().toISOString(),
  };
}

export function calcularComposicao(composicao: ComposicaoCusto, recursos: RecursoCusto[]) {
  const linhas = composicao.itens.map((item) => {
    const recurso = recursos.find((registro) => registro.id === item.recursoId);
    const custo = (recurso?.custo || 0) * item.quantidade * (1 + item.perda / 100);
    return { item, recurso, custo };
  });
  const direto = linhas.reduce((total, linha) => total + linha.custo, 0);
  const indireto = direto * composicao.indiretos / 100;
  const total = direto + indireto;
  const divisor = 1 - (composicao.impostos + composicao.taxas + composicao.margem) / 100;
  const preco = divisor > 0 ? total / divisor : 0;
  return { linhas, direto, indireto, total, preco, valido: divisor > 0 };
}

export function proximoCodigo(prefixoInformado: string, codigos: string[]) {
  const prefixo = prefixoInformado.toUpperCase().replace(/[^A-Z0-9_-]/g, '') || 'P';
  const exp = new RegExp(`^${prefixo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`, 'i');
  const numeros = codigos.map((codigo) => codigo.match(exp)?.[1]).filter((item): item is string => Boolean(item));
  const largura = Math.max(3, ...numeros.map((numero) => numero.length));
  const maior = numeros.reduce((maximo, numero) => Math.max(maximo, Number(numero)), 0);
  return `${prefixo}${String(maior + 1).padStart(largura, '0')}`;
}
