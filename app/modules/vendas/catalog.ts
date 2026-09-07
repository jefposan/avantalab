import type { CatalogoVendasDTO, ItemCatalogoVendas } from './types';

export type LinhaCatalogoCustos = Record<string, unknown>;

const texto = (valor: unknown) => String(valor ?? '').trim();
const numero = (valor: unknown) => Number.isFinite(Number(valor)) ? Number(valor) : 0;

export function situacaoFiscalItemCustos(linha: LinhaCatalogoCustos): ItemCatalogoVendas['situacaoFiscal'] {
  const tipo = linha.tipo_item === 'servico' ? 'servico' : 'produto';
  const completo = tipo === 'servico'
    ? Boolean(
      texto(linha.codigo_tributacao_nacional)
      && texto(linha.codigo_tributacao_municipal)
      && texto(linha.item_lc116)
      && texto(linha.municipio_prestacao)
    )
    : Boolean(
      texto(linha.ncm)
      && texto(linha.origem_mercadoria)
      && texto(linha.unidade_tributavel)
      && texto(linha.cfop_padrao)
      && (texto(linha.cst) || texto(linha.csosn))
      && texto(linha.cst_pis)
      && texto(linha.cst_cofins)
    );
  return completo ? 'Completo' : 'Revisar cadastro fiscal';
}

export function mapearItemCustosParaVendas(
  linha: LinhaCatalogoCustos,
  precoTabela?: number | null,
): ItemCatalogoVendas {
  const tipo = linha.tipo_item === 'servico' ? 'servico' : 'produto';
  const preco = precoTabela === null || precoTabela === undefined
    ? numero(linha.preco_venda)
    : Math.max(0, numero(precoTabela));
  return {
    id: texto(linha.id),
    sku: texto(linha.sku),
    tipo,
    nome: texto(linha.nome),
    descricao: texto(linha.descricao),
    categoria: texto(linha.categoria) || (tipo === 'servico' ? 'Serviço' : 'Produto'),
    unidade: texto(linha.unidade) || (tipo === 'servico' ? 'serviço' : 'un'),
    preco,
    controlaEstoque: linha.tipo_item !== 'servico' && linha.controla_estoque === true,
    saldoFisico: numero(linha.saldo_fisico),
    saldoReservado: Math.max(0, numero(linha.saldo_reservado)),
    estoqueMinimo: Math.max(0, numero(linha.estoque_minimo)),
    permiteNegativo: linha.permite_negativo === true,
    localEstoqueId: texto(linha.local_estoque_id),
    imagemUrl: texto(linha.imagem_url),
    codigoBarras: texto(linha.codigo_barras),
    situacaoFiscal: situacaoFiscalItemCustos(linha),
    fiscal: {
      ncm: texto(linha.ncm),
      cest: texto(linha.cest),
      origemMercadoria: texto(linha.origem_mercadoria),
      unidadeTributavel: texto(linha.unidade_tributavel),
      cfopPadrao: texto(linha.cfop_padrao),
      cst: texto(linha.cst),
      csosn: texto(linha.csosn),
      cstPis: texto(linha.cst_pis),
      cstCofins: texto(linha.cst_cofins),
      cstIbsCbs: texto(linha.cst_ibs_cbs),
      classificacaoIbsCbs: texto(linha.classificacao_ibs_cbs),
      codigoTributacaoNacional: texto(linha.codigo_tributacao_nacional),
      codigoTributacaoMunicipal: texto(linha.codigo_tributacao_municipal),
      nbs: texto(linha.nbs),
      itemLc116: texto(linha.item_lc116),
      municipioPrestacao: texto(linha.municipio_prestacao),
      aliquotaIss: Math.max(0, numero(linha.aliquota_iss)),
    },
    atualizadoEm: texto(linha.atualizado_em),
  };
}

export function montarCatalogoVendasDTO({
  empresaId,
  catalogoId,
  tabela,
  tabelas,
  produtos,
  precos,
  estoqueIntegrado = false,
  agora = new Date().toISOString(),
}: {
  empresaId: string;
  catalogoId: string;
  tabela: { id: string; nome: string; padrao: boolean } | null;
  tabelas: Array<{ id: string; nome: string; padrao: boolean }>;
  produtos: LinhaCatalogoCustos[];
  precos: Readonly<Record<string, number>>;
  estoqueIntegrado?: boolean;
  agora?: string;
}): CatalogoVendasDTO {
  return {
    versao: 1,
    origem: 'custos_precificacao',
    somenteLeitura: true,
    estoqueIntegrado,
    empresaId,
    catalogoId,
    tabelaPreco: tabela,
    tabelasDisponiveis: tabelas,
    itens: produtos.map((produto) => mapearItemCustosParaVendas(
      produto,
      tabela?.padrao ? null : precos[texto(produto.id)],
    )),
    geradoEm: agora,
  };
}
