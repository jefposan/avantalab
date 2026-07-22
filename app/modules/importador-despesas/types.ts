export type CategoriaDespesa = string;

export type TipoDocumentoImportado = 'extrato-bancario' | 'fatura-cartao';
export type TipoDocumentoSelecionado = 'automatico' | TipoDocumentoImportado;

export type DespesaImportada = {
  id: string;
  data: string;
  descricaoOriginal: string;
  descricao: string;
  valor: number;
  categoria: CategoriaDespesa | '';
  incluir: boolean;
  confianca: 'Alta' | 'Revisar';
  natureza?: 'despesa' | 'estorno';
  pagina?: number;
  cartaoFinal?: string;
};

export type RascunhoImportacao = {
  versao: 1;
  empresaId?: string;
  loteChave?: string;
  arquivo: string;
  tipoDocumento?: TipoDocumentoImportado;
  tipoDocumentoSelecionado?: TipoDocumentoSelecionado;
  salvoEm: string;
  totalDocumento: string;
  despesas: DespesaImportada[];
};
