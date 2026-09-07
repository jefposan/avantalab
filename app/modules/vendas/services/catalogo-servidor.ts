import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { montarCatalogoVendasDTO } from '../catalog';

const CAMPOS_ITEM = 'id,sku,tipo_item,nome,categoria,descricao,preco_venda,unidade,imagem_url,codigo_barras,ncm,cest,origem_mercadoria,unidade_tributavel,cfop_padrao,cst,csosn,cst_pis,cst_cofins,cst_ibs_cbs,classificacao_ibs_cbs,codigo_tributacao_nacional,codigo_tributacao_municipal,nbs,item_lc116,municipio_prestacao,aliquota_iss,atualizado_em';

export class ErroCatalogoVendas extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function carregarCatalogoCustosParaVendas({
  db,
  empresaId,
  tabelaPrecoId,
}: {
  db: SupabaseClient;
  empresaId: string;
  tabelaPrecoId?: string;
}) {
  const [{ data: custos }, { data: catalogo, error: erroCatalogo }, { data: tabelas, error: erroTabelas }] = await Promise.all([
    db.from('empresa_modulos').select('ativo,expira_em').eq('empresa_id', empresaId).eq('modulo_id', 'custos').maybeSingle(),
    db.from('vendas_mobile_catalogos').select('id').eq('empresa_id', empresaId).eq('ativo', true).order('criado_em').limit(1).maybeSingle(),
    db.from('custos_tabelas_preco').select('id,nome,padrao').eq('empresa_id', empresaId).eq('ativo', true).order('padrao', { ascending: false }).order('nome'),
  ]);
  const expiraEm = custos?.expira_em ? new Date(custos.expira_em) : null;
  if (custos?.ativo !== true || (expiraEm && expiraEm <= new Date())) {
    throw new ErroCatalogoVendas('Custos e Precificação precisa estar ativo neste perfil.', 403);
  }
  if (erroCatalogo || erroTabelas) throw new ErroCatalogoVendas('Não foi possível consultar o catálogo mestre.', 500);
  if (!catalogo) throw new ErroCatalogoVendas('Este perfil ainda não possui um catálogo mestre ativo.', 404);

  const tabelasAtivas = (tabelas || []).map((tabela) => ({
    id: String(tabela.id),
    nome: String(tabela.nome || 'Tabela de preços'),
    padrao: tabela.padrao === true,
  }));
  const tabela = tabelasAtivas.find((item) => item.id === tabelaPrecoId)
    || tabelasAtivas.find((item) => item.padrao)
    || tabelasAtivas[0]
    || null;
  const { data: produtos, error: erroProdutos } = await db
    .from('vendas_mobile_catalogo_produtos')
    .select(CAMPOS_ITEM)
    .eq('catalogo_id', catalogo.id)
    .eq('ativo', true)
    .eq('disponivel_catalogo', true)
    .order('nome');
  if (erroProdutos) throw new ErroCatalogoVendas('Não foi possível carregar os produtos e serviços publicados.', 500);

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
  if (localEstoque && (produtos || []).length) {
    const { data: linhasSaldo, error: erroSaldos } = await db
      .from('vendas_estoque_saldos')
      .select('produto_id,saldo_fisico,saldo_reservado,estoque_minimo,permite_negativo')
      .eq('empresa_id', empresaId)
      .eq('local_id', localEstoque.id);
    if (erroSaldos) throw new ErroCatalogoVendas('Não foi possível consultar os saldos de estoque.', 500);
    saldos = Object.fromEntries((linhasSaldo || []).map((saldo) => [String(saldo.produto_id), saldo as Record<string, unknown>]));
  }

  let precos: Record<string, number> = {};
  if (tabela && !tabela.padrao) {
    const { data: itensPreco, error } = await db
      .from('custos_tabela_preco_itens')
      .select('produto_id,preco')
      .eq('tabela_preco_id', tabela.id);
    if (error) throw new ErroCatalogoVendas('Não foi possível carregar a tabela de preços selecionada.', 500);
    precos = Object.fromEntries((itensPreco || []).map((item) => [String(item.produto_id), Number(item.preco) || 0]));
  }

  return montarCatalogoVendasDTO({
    empresaId,
    catalogoId: String(catalogo.id),
    tabela,
    tabelas: tabelasAtivas,
    produtos: (produtos || []).map((produto) => {
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
