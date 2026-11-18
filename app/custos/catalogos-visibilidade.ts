type Catalogo = { id: string; ativo: boolean };
type Produto = { catalogo_id: string; excluido_em?: string | null };

export function produtosParaCadastro<T extends Produto>(produtos: T[], catalogos: Catalogo[], filtro = ''): T[] {
  const ids = new Set(catalogos.map((catalogo) => catalogo.id));
  return produtos.filter((produto) => !produto.excluido_em && ids.has(produto.catalogo_id) && (!filtro || produto.catalogo_id === filtro));
}

export function produtosParaTabelas<T extends Produto>(produtos: T[], catalogos: Catalogo[]): T[] {
  return produtosParaCadastro(produtos, catalogos.filter((catalogo) => catalogo.ativo));
}
