import { supabase } from '@/app/lib/supabase';
import { documentoVazio, normalizarDocumento, type DocumentoCustos, type ProdutoCustos } from './types';

const CAMPOS_PRODUTO = 'id,catalogo_id,sku,tipo_item,nome,marca,categoria,descricao,preco_custo,preco_venda,unidade,imagem_url,codigo_barras,ativo,disponivel_catalogo,ncm,cest,origem_mercadoria,unidade_tributavel,cfop_padrao,cst,csosn,cst_pis,cst_cofins,cst_ibs_cbs,classificacao_ibs_cbs,codigo_tributacao_nacional,codigo_tributacao_municipal,nbs,item_lc116,municipio_prestacao,aliquota_iss,atualizado_em';

const texto = (valor: unknown) => String(valor || '');
const mapearProduto = (linha: Record<string, unknown>): ProdutoCustos => ({
  id: texto(linha.id), catalogo_id: texto(linha.catalogo_id), sku: texto(linha.sku),
  tipo_item: linha.tipo_item === 'servico' ? 'servico' : 'produto', nome: texto(linha.nome), marca: texto(linha.marca),
  categoria: texto(linha.categoria), descricao: texto(linha.descricao), preco_custo: Number(linha.preco_custo) || 0,
  preco_venda: Number(linha.preco_venda) || 0, unidade: texto(linha.unidade) || 'un', imagem_url: texto(linha.imagem_url),
  codigo_barras: texto(linha.codigo_barras), ativo: linha.ativo !== false, disponivel_catalogo: linha.disponivel_catalogo !== false,
  ncm: texto(linha.ncm), cest: texto(linha.cest), origem_mercadoria: texto(linha.origem_mercadoria),
  unidade_tributavel: texto(linha.unidade_tributavel), cfop_padrao: texto(linha.cfop_padrao), cst: texto(linha.cst),
  csosn: texto(linha.csosn), cst_pis: texto(linha.cst_pis), cst_cofins: texto(linha.cst_cofins),
  cst_ibs_cbs: texto(linha.cst_ibs_cbs), classificacao_ibs_cbs: texto(linha.classificacao_ibs_cbs),
  codigo_tributacao_nacional: texto(linha.codigo_tributacao_nacional), codigo_tributacao_municipal: texto(linha.codigo_tributacao_municipal),
  nbs: texto(linha.nbs), item_lc116: texto(linha.item_lc116), municipio_prestacao: texto(linha.municipio_prestacao),
  aliquota_iss: Number(linha.aliquota_iss) || 0, atualizado_em: texto(linha.atualizado_em),
});

export async function carregarCustos(empresaId: string, podeEditar: boolean) {
  let { data: catalogo, error: erroCatalogo } = await supabase.from('vendas_mobile_catalogos')
    .select('id').eq('empresa_id', empresaId).eq('ativo', true).order('criado_em').limit(1).maybeSingle();
  if (!catalogo && !erroCatalogo && podeEditar) {
    const criado = await supabase.from('vendas_mobile_catalogos')
      .insert({ empresa_id: empresaId, nome: 'Catálogo principal', codigo: 'PRINCIPAL' }).select('id').single();
    catalogo = criado.data;
    erroCatalogo = criado.error;
  }
  if (erroCatalogo) throw new Error('Não foi possível preparar o cadastro mestre desta empresa.');

  if (!catalogo) {
    const documentoResultado = await supabase.from('custos_documentos').select('documento,revisao').eq('empresa_id', empresaId).maybeSingle();
    if (documentoResultado.error) throw new Error('Não foi possível carregar composições e simulações.');
    return { catalogoId: '', produtos: [], documento: normalizarDocumento(documentoResultado.data?.documento), revisao: Number(documentoResultado.data?.revisao) || 0 };
  }

  const [produtosResultado, documentoResultado] = await Promise.all([
    supabase.from('vendas_mobile_catalogo_produtos').select(CAMPOS_PRODUTO).eq('catalogo_id', catalogo.id).order('nome'),
    supabase.from('custos_documentos').select('documento,revisao').eq('empresa_id', empresaId).maybeSingle(),
  ]);
  if (produtosResultado.error) throw new Error('A atualização de banco do módulo ainda não foi aplicada neste ambiente.');
  if (documentoResultado.error) throw new Error('Não foi possível carregar composições e simulações.');

  let documento = normalizarDocumento(documentoResultado.data?.documento);
  let revisao = Number(documentoResultado.data?.revisao) || 0;
  if (!documentoResultado.data && podeEditar) {
    const vazio = documentoVazio();
    const criado = await supabase.from('custos_documentos').insert({ empresa_id: empresaId, documento: vazio }).select('documento,revisao').single();
    if (criado.error) throw new Error('Não foi possível iniciar os dados de custos desta empresa.');
    documento = normalizarDocumento(criado.data?.documento);
    revisao = Number(criado.data?.revisao) || 1;
  }
  return {
    catalogoId: String(catalogo.id),
    produtos: ((produtosResultado.data || []) as unknown as Record<string, unknown>[]).map(mapearProduto),
    documento,
    revisao,
  };
}

export async function salvarDocumentoCustos(empresaId: string, documento: DocumentoCustos, revisaoEsperada: number) {
  const { data, error } = await supabase.from('custos_documentos')
    .update({ documento })
    .eq('empresa_id', empresaId)
    .eq('revisao', revisaoEsperada)
    .select('revisao')
    .maybeSingle();
  if (error) throw new Error('Não foi possível salvar os dados de custos.');
  if (!data) throw new Error('Os dados foram atualizados por outra pessoa. Recarregue a página antes de salvar novamente.');
  return Number(data.revisao);
}

export async function salvarProdutoCustos(produto: ProdutoCustos) {
  const payload = {
    catalogo_id: produto.catalogo_id, sku: produto.sku.trim().toUpperCase(), tipo_item: produto.tipo_item,
    nome: produto.nome.trim(), marca: produto.marca.trim() || null, categoria: produto.categoria.trim() || null,
    descricao: produto.descricao.trim() || null, preco_custo: produto.preco_custo, preco_venda: produto.preco_venda,
    unidade: produto.unidade.trim() || 'un', imagem_url: produto.imagem_url.trim() || null,
    codigo_barras: produto.codigo_barras.trim() || null, ativo: produto.ativo,
    disponivel_catalogo: produto.disponivel_catalogo, ncm: produto.ncm.trim() || null, cest: produto.cest.trim() || null,
    origem_mercadoria: produto.origem_mercadoria.trim() || null, unidade_tributavel: produto.unidade_tributavel.trim() || null,
    cfop_padrao: produto.cfop_padrao.trim() || null, cst: produto.cst.trim() || null, csosn: produto.csosn.trim() || null,
    cst_pis: produto.cst_pis.trim() || null, cst_cofins: produto.cst_cofins.trim() || null,
    cst_ibs_cbs: produto.cst_ibs_cbs.trim() || null, classificacao_ibs_cbs: produto.classificacao_ibs_cbs.trim() || null,
    codigo_tributacao_nacional: produto.codigo_tributacao_nacional.trim() || null,
    codigo_tributacao_municipal: produto.codigo_tributacao_municipal.trim() || null, nbs: produto.nbs.trim() || null,
    item_lc116: produto.item_lc116.trim() || null, municipio_prestacao: produto.municipio_prestacao.trim() || null,
    aliquota_iss: produto.aliquota_iss, atualizado_em: new Date().toISOString(),
  };
  const consulta = produto.id
    ? supabase.from('vendas_mobile_catalogo_produtos').update(payload).eq('id', produto.id)
    : supabase.from('vendas_mobile_catalogo_produtos').insert(payload);
  const { data, error } = await consulta.select(CAMPOS_PRODUTO).single();
  if (error) {
    if (error.message.toLowerCase().includes('sku')) throw new Error('Este código já está sendo usado neste catálogo.');
    throw new Error('Não foi possível salvar o produto ou serviço.');
  }
  return mapearProduto(data as unknown as Record<string, unknown>);
}

export async function enviarImagemProduto(empresaId: string, arquivo: File) {
  if (!arquivo.type.startsWith('image/') || arquivo.size > 5 * 1024 * 1024) throw new Error('Use uma imagem JPG, PNG ou WebP de até 5 MB.');
  const extensao = arquivo.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg';
  const caminho = `catalogos/${empresaId}/${crypto.randomUUID()}.${extensao}`;
  const { error } = await supabase.storage.from('vendas-produtos').upload(caminho, arquivo, { upsert: false, contentType: arquivo.type });
  if (error) throw new Error('Não foi possível enviar a imagem.');
  return supabase.storage.from('vendas-produtos').getPublicUrl(caminho).data.publicUrl;
}
