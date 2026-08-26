import { composicaoVazia, type DocumentoCustos, type ProdutoCustos, type RecursoCusto } from './types';

const agora = new Date().toISOString();
const recursos: RecursoCusto[] = [
  { id: 'base-creme', codigo: 'MP001', nome: 'Base creme neutra', categoria: 'Matéria-prima', unidade: 'kg', custo: 42.90 },
  { id: 'essencia', codigo: 'MP002', nome: 'Essência Tridium', categoria: 'Matéria-prima', unidade: 'kg', custo: 186.50 },
  { id: 'frasco-150', codigo: 'EMB001', nome: 'Frasco 150 ml', categoria: 'Embalagem', unidade: 'un', custo: 2.40 },
  { id: 'rotulo', codigo: 'EMB002', nome: 'Rótulo adesivo', categoria: 'Embalagem', unidade: 'un', custo: 0.65 },
  { id: 'mao-obra', codigo: 'MO001', nome: 'Mão de obra de produção', categoria: 'Mão de obra', unidade: 'h', custo: 28.00 },
  { id: 'frasco-30', codigo: 'EMB003', nome: 'Frasco conta-gotas 30 ml', categoria: 'Embalagem', unidade: 'un', custo: 4.20 },
];

const produto = (id: string, sku: string, nome: string, publicado = true): ProdutoCustos => ({
  id, catalogo_id: 'catalogo-demo', sku, tipo_item: 'produto', nome, marca: 'Tridium', categoria: 'Cosméticos', descricao: '',
  preco_custo: 0, preco_venda: 29.90, unidade: 'un', imagem_url: '', codigo_barras: '', ativo: true,
  disponivel_catalogo: publicado, ncm: publicado ? '3304.99.90' : '', cest: '', origem_mercadoria: '0 - Nacional',
  unidade_tributavel: 'un', cfop_padrao: '', cst: '', csosn: '', cst_pis: '', cst_cofins: '', cst_ibs_cbs: '',
  classificacao_ibs_cbs: '', codigo_tributacao_nacional: '', codigo_tributacao_municipal: '', nbs: '', item_lc116: '',
  municipio_prestacao: '', aliquota_iss: 0, atualizado_em: agora,
});

export function dadosDemonstracao() {
  const produtos = [
    produto('demo-t001', 'T001', 'Creme Hidratante Corporal'),
    produto('demo-t002', 'T002', 'Sérum Facial Vitamina C'),
    produto('demo-t003', 'T003', 'Sabonete Líquido Lavanda'),
    produto('demo-t004', 'T004', 'Home Spray Cítrico', false),
    produto('demo-t005', 'T005', 'Óleo Corporal de Lavanda'),
  ];
  const composicaoBase = { ...composicaoVazia(), indiretos: 12, impostos: 8, taxas: 4, margem: 30 };
  const documento: DocumentoCustos = {
    version: 1,
    recursos,
    composicoes: {
      'demo-t001': { ...composicaoBase, itens: [{ id: 'c1', recursoId: 'base-creme', quantidade: .15, perda: 3 }, { id: 'c2', recursoId: 'frasco-150', quantidade: 1, perda: 0 }, { id: 'c3', recursoId: 'rotulo', quantidade: 1, perda: 2 }, { id: 'c4', recursoId: 'mao-obra', quantidade: .18, perda: 0 }] },
      'demo-t002': { ...composicaoBase, margem: 38, itens: [{ id: 's1', recursoId: 'base-creme', quantidade: .022, perda: 4 }, { id: 's2', recursoId: 'essencia', quantidade: .0045, perda: 6 }, { id: 's3', recursoId: 'frasco-30', quantidade: 1, perda: 1 }, { id: 's4', recursoId: 'mao-obra', quantidade: .22, perda: 0 }] },
      'demo-t003': { ...composicaoBase, itens: [{ id: 'l1', recursoId: 'base-creme', quantidade: .24, perda: 3 }, { id: 'l2', recursoId: 'essencia', quantidade: .006, perda: 4 }, { id: 'l3', recursoId: 'frasco-150', quantidade: 1, perda: 1 }, { id: 'l4', recursoId: 'rotulo', quantidade: 1, perda: 2 }] },
    },
    cenarios: [], historico: [],
  };
  return { catalogoId: 'catalogo-demo', produtos, documento };
}
