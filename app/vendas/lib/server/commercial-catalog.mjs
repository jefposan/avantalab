import { evaluateAccessDecision } from '../access-control.mjs';

export const COMMERCIAL_CATALOG_REFERENCE = '2026-09-04';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
const number = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const timestamp = (value) => value instanceof Date ? value.toISOString() : clean(value, 40);

function fiscalReady(row) {
  if (row.tipo_item === 'servico') {
    return Boolean(clean(row.codigo_tributacao_nacional) && clean(row.codigo_tributacao_municipal)
      && clean(row.item_lc116) && clean(row.municipio_prestacao));
  }
  return Boolean(clean(row.ncm) && clean(row.origem_mercadoria) && clean(row.unidade_tributavel)
    && clean(row.cfop_padrao) && (clean(row.cst) || clean(row.csosn))
    && clean(row.cst_pis) && clean(row.cst_cofins));
}

function mapItem(row, price) {
  const service = row.tipo_item === 'servico';
  return Object.freeze({
    id: clean(row.id, 36),
    sku: clean(row.sku, 80),
    tipo: service ? 'servico' : 'produto',
    nome: clean(row.nome, 180),
    descricao: clean(row.descricao, 1000),
    categoria: clean(row.categoria, 100) || (service ? 'Serviço' : 'Produto'),
    unidade: clean(row.unidade, 20) || (service ? 'serviço' : 'un'),
    preco: number(price ?? row.preco_venda),
    imagemUrl: '',
    codigoBarras: clean(row.codigo_barras, 40),
    situacaoFiscal: fiscalReady(row) ? 'Completo' : 'Revisar cadastro fiscal',
    fiscal: Object.freeze({
      ncm: clean(row.ncm, 8), cest: clean(row.cest, 7), origemMercadoria: clean(row.origem_mercadoria, 1),
      unidadeTributavel: clean(row.unidade_tributavel, 20), cfopPadrao: clean(row.cfop_padrao, 4),
      cst: clean(row.cst, 4), csosn: clean(row.csosn, 4), cstPis: clean(row.cst_pis, 2),
      cstCofins: clean(row.cst_cofins, 2), cstIbsCbs: clean(row.cst_ibs_cbs, 6),
      classificacaoIbsCbs: clean(row.classificacao_ibs_cbs, 20),
      codigoTributacaoNacional: clean(row.codigo_tributacao_nacional, 20),
      codigoTributacaoMunicipal: clean(row.codigo_tributacao_municipal, 20),
      nbs: clean(row.nbs, 20), itemLc116: clean(row.item_lc116, 20),
      municipioPrestacao: clean(row.municipio_prestacao, 120), aliquotaIss: number(row.aliquota_iss),
    }),
    atualizadoEm: timestamp(row.atualizado_em),
  });
}

export function createPostgresCommercialCatalogRepository({ pool } = {}) {
  if (!pool?.query) throw new TypeError('Informe o pool PostgreSQL server-side.');
  return Object.freeze({
    configured: true,
    async list({ companyId, priceTableId = '' } = {}) {
      const [catalogResult, tableResult] = await Promise.all([
        pool.query(`select id from public.vendas_mobile_catalogos
          where empresa_id=$1 and ativo=true order by criado_em,id limit 1`, [companyId]),
        pool.query(`select id,nome,padrao from public.custos_tabelas_preco
          where empresa_id=$1 and ativo=true order by padrao desc,nome,id`, [companyId]),
      ]);
      const catalog = catalogResult.rows?.[0];
      if (!catalog) return null;
      const tables = (tableResult.rows || []).map((row) => Object.freeze({ id: clean(row.id, 36), nome: clean(row.nome, 120), padrao: row.padrao === true }));
      const table = tables.find((row) => row.id === priceTableId) || tables.find((row) => row.padrao) || tables[0] || null;
      const products = await pool.query(`
        select id,sku,tipo_item,nome,categoria,descricao,preco_venda,unidade,codigo_barras,
          ncm,cest,origem_mercadoria,unidade_tributavel,cfop_padrao,cst,csosn,cst_pis,cst_cofins,
          cst_ibs_cbs,classificacao_ibs_cbs,codigo_tributacao_nacional,codigo_tributacao_municipal,
          nbs,item_lc116,municipio_prestacao,aliquota_iss,atualizado_em
        from public.vendas_mobile_catalogo_produtos
        where catalogo_id=$1 and ativo=true and disponivel_catalogo=true
        order by nome,id limit 500
      `, [catalog.id]);
      let prices = new Map();
      if (table && !table.padrao) {
        const rows = await pool.query(`select produto_id,preco from public.custos_tabela_preco_itens
          where tabela_preco_id=$1`, [table.id]);
        prices = new Map((rows.rows || []).map((row) => [clean(row.produto_id, 36), number(row.preco)]));
      }
      return Object.freeze({
        versao: 1,
        origem: 'custos_precificacao',
        somenteLeitura: true,
        estoqueIntegrado: false,
        empresaId: clean(companyId, 36),
        catalogoId: clean(catalog.id, 36),
        tabelaPreco: table,
        tabelasDisponiveis: Object.freeze(tables),
        itens: Object.freeze((products.rows || []).map((row) => mapItem(row, table?.padrao ? null : prices.get(clean(row.id, 36))))),
        geradoEm: new Date().toISOString(),
      });
    },
  });
}

export function createCommercialCatalogService({ repository } = {}) {
  return Object.freeze({
    id: 'avantalab-commercial-catalog-v1',
    async list({ boundary, effectivePermissions, priceTableId = '' } = {}) {
      const access = evaluateAccessDecision({ boundary, effectivePermissions, permission: 'catalog.view' });
      if (!access.allowed) return { ok: false, reason: access.reason, catalog: null };
      if (repository?.configured !== true || typeof repository.list !== 'function') {
        return { ok: false, reason: 'repository_unavailable', catalog: null };
      }
      if (priceTableId && !UUID.test(clean(priceTableId, 36))) return { ok: false, reason: 'invalid_price_table', catalog: null };
      const catalog = await repository.list({ companyId: access.session.companyId, priceTableId: clean(priceTableId, 36) });
      return catalog ? { ok: true, reason: 'allowed', catalog } : { ok: false, reason: 'catalog_not_found', catalog: null };
    },
  });
}
