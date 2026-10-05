import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { montarCatalogoVendasDTO } from '../catalog';

const CAMPOS_ITEM = 'id,sku,tipo_item,nome,categoria,descricao,preco_venda,unidade,imagem_url,codigo_barras,ncm,cest,origem_mercadoria,unidade_tributavel,cfop_padrao,cst,csosn,cst_pis,cst_cofins,cst_ibs_cbs,classificacao_ibs_cbs,codigo_tributacao_nacional,codigo_tributacao_municipal,nbs,item_lc116,municipio_prestacao,aliquota_iss,habilitado_fiscal,atualizado_em';

export class ErroCatalogoVendas extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function carregarCatalogoCustosParaVendas({
  db,
  empresaId,
  tabelaPrecoId,
  incluirItensFiscais = false,
}: {
  db: SupabaseClient;
  empresaId: string;
  tabelaPrecoId?: string;
  /** A emissão pode enxergar insumos fiscais sem expô-los à venda comum. */
  incluirItensFiscais?: boolean;
}) {
  const [{ data: custos }, { data: catalogos, error: erroCatalogo }, { data: tabelas, error: erroTabelas }] = await Promise.all([
    db.from('empresa_modulos').select('ativo,expira_em').eq('empresa_id', empresaId).eq('modulo_id', 'custos').maybeSingle(),
    db.from('vendas_mobile_catalogos').select('id,padrao').eq('empresa_id', empresaId).eq('ativo', true).order('padrao', { ascending: false }).order('criado_em'),
    db.from('custos_tabelas_preco').select('id,nome,padrao').eq('empresa_id', empresaId).eq('ativo', true).order('padrao', { ascending: false }).order('nome'),
  ]);
  const expiraEm = custos?.expira_em ? new Date(custos.expira_em) : null;
  if (custos?.ativo !== true || (expiraEm && expiraEm <= new Date())) {
    throw new ErroCatalogoVendas('Custos e Precificação precisa estar ativo neste perfil.', 403);
  }
  if (erroCatalogo || erroTabelas) throw new ErroCatalogoVendas('Não foi possível consultar o catálogo mestre.', 500);
  if (!catalogos?.length) throw new ErroCatalogoVendas('Ative ao menos um catálogo em Custos e Precificação para usá-lo no Vendas.', 409);
  const catalogoIds = catalogos.map((catalogo) => String(catalogo.id));

  const tabelasAtivas = (tabelas || []).map((tabela) => ({
    id: String(tabela.id),
    nome: String(tabela.nome || 'Tabela de preços'),
    padrao: tabela.padrao === true,
  }));
  const tabela = tabelasAtivas.find((item) => item.id === tabelaPrecoId)
    || tabelasAtivas.find((item) => item.padrao)
    || tabelasAtivas[0]
    || null;
  const produtos: Record<string, unknown>[] = [];
  const tamanhoPagina = 1000;
  for (let inicio = 0; ; inicio += tamanhoPagina) {
    let consultaProdutos = db
      .from('vendas_mobile_catalogo_produtos')
      .select(CAMPOS_ITEM)
      .in('catalogo_id', catalogoIds)
      .eq('ativo', true)
      .order('nome')
      .order('id')
      .range(inicio, inicio + tamanhoPagina - 1);
    consultaProdutos = incluirItensFiscais
      ? consultaProdutos.or('disponivel_catalogo.eq.true,habilitado_fiscal.eq.true')
      : consultaProdutos.eq('disponivel_catalogo', true);
    const { data: paginaProdutos, error: erroProdutos } = await consultaProdutos;
    if (erroProdutos) throw new ErroCatalogoVendas('Não foi possível carregar os produtos e serviços publicados.', 500);
    produtos.push(...(paginaProdutos || []));
    if (!paginaProdutos || paginaProdutos.length < tamanhoPagina) break;
  }

  const { data: localEstoque, error: erroLocalEstoque } = await db
    .from('vendas_estoque_locais')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .order('padrao', { ascending: false })
    .order('criado_em')
    .limit(1)
    .maybeSingle();
  if (erroLocalEstoque) throw new ErroCatalogoVendas('Não foi possível consultar o local principal de estoque.', 500);
  let saldos: Record<string, Record<string, unknown>> = {};
  if (localEstoque && produtos.length) {
    for (let inicio = 0; ; inicio += tamanhoPagina) {
      const { data: linhasSaldo, error: erroSaldos } = await db
        .from('vendas_estoque_saldos')
        .select('produto_id,saldo_fisico,saldo_reservado,estoque_minimo,permite_negativo')
        .eq('empresa_id', empresaId)
        .eq('local_id', localEstoque.id)
        .order('produto_id')
        .range(inicio, inicio + tamanhoPagina - 1);
      if (erroSaldos) throw new ErroCatalogoVendas('Não foi possível consultar os saldos de estoque.', 500);
      Object.assign(saldos, Object.fromEntries((linhasSaldo || []).map((saldo) => [String(saldo.produto_id), saldo as Record<string, unknown>])));
      if (!linhasSaldo || linhasSaldo.length < tamanhoPagina) break;
    }
  }

  let precos: Record<string, number> = {};
  if (tabela && !tabela.padrao) {
    for (let inicio = 0; ; inicio += tamanhoPagina) {
      const { data: itensPreco, error } = await db
        .from('custos_tabela_preco_itens')
        .select('produto_id,preco')
        .eq('tabela_preco_id', tabela.id)
        .order('produto_id')
        .range(inicio, inicio + tamanhoPagina - 1);
      if (error) throw new ErroCatalogoVendas('Não foi possível carregar a tabela de preços selecionada.', 500);
      Object.assign(precos, Object.fromEntries((itensPreco || []).map((item) => [String(item.produto_id), Number(item.preco) || 0])));
      if (!itensPreco || itensPreco.length < tamanhoPagina) break;
    }
  }

  return montarCatalogoVendasDTO({
    empresaId,
    catalogoId: catalogoIds[0],
    tabela,
    tabelas: tabelasAtivas,
    produtos: produtos.map((produto) => {
      const saldo = saldos[String(produto.id)] || {};
      return {
        ...produto,
        controla_estoque: produto.tipo_item !== 'servico' && Boolean(localEstoque && saldos[String(produto.id)]),
        saldo_fisico: saldo.saldo_fisico,
        saldo_reservado: saldo.saldo_reservado,
        estoque_minimo: saldo.estoque_minimo,
        permite_negativo: saldo.permite_negativo,
        local_estoque_id: localEstoque?.id || '',
      };
    }) as unknown as Record<string, unknown>[],
    precos,
    estoqueIntegrado: Boolean(localEstoque),
  });
}
