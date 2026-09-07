import { resolveMunicipalityCode } from '../municipality.mjs';

const clean = (value) => String(value ?? '').trim();
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

function fiscalReady(row) {
  if (row.tipo_item === 'servico') {
    return Boolean(clean(row.codigo_tributacao_nacional) && clean(row.codigo_tributacao_municipal)
      && clean(row.item_lc116) && clean(row.municipio_prestacao));
  }
  return Boolean(clean(row.ncm) && clean(row.origem_mercadoria) && clean(row.unidade_tributavel)
    && clean(row.cfop_padrao) && (clean(row.cst) || clean(row.csosn))
    && clean(row.cst_pis) && clean(row.cst_cofins));
}

export function createPostgresCommercialCatalogResolver({ pool } = {}) {
  if (!pool?.query) throw new TypeError('Informe o pool PostgreSQL server-side.');
  return async ({ companyId, priceTableId = '', itemIds = [] } = {}) => {
    const productResult = await pool.query(`
      select item.*,
        exists(
          select 1 from public.vendas_estoque_saldos saldo
          where saldo.empresa_id=$1 and saldo.produto_id=item.id
        ) as controla_estoque
      from public.vendas_mobile_catalogo_produtos item
      join public.vendas_mobile_catalogos catalog on catalog.id=item.catalogo_id
      where catalog.empresa_id=$1 and catalog.ativo=true
        and item.id=any($2::uuid[]) and item.ativo=true and item.disponivel_catalogo=true
    `, [companyId, itemIds]);
    let priceTable = null;
    let prices = new Map();
    if (clean(priceTableId)) {
      const tableResult = await pool.query(`
        select id,nome,padrao from public.custos_tabelas_preco
        where empresa_id=$1 and id=$2 and ativo=true limit 1
      `, [companyId, priceTableId]);
      priceTable = tableResult.rows?.[0] || null;
      if (priceTable && priceTable.padrao !== true) {
        const priceResult = await pool.query(`
          select produto_id,preco from public.custos_tabela_preco_itens
          where tabela_preco_id=$1 and produto_id=any($2::uuid[])
        `, [priceTable.id, itemIds]);
        prices = new Map((priceResult.rows || []).map((row) => [row.produto_id, number(row.preco)]));
      }
    }
    return {
      priceTable: priceTable ? { id: priceTable.id, name: clean(priceTable.nome), default: priceTable.padrao === true } : null,
      items: (productResult.rows || []).map((row) => ({
        id: row.id,
        type: row.tipo_item === 'servico' ? 'servico' : 'produto',
        sku: clean(row.sku), name: clean(row.nome), description: clean(row.descricao), unit: clean(row.unidade) || 'un',
        salePrice: prices.has(row.id) ? prices.get(row.id) : number(row.preco_venda),
        costPrice: number(row.preco_custo), active: true, published: true, controlsStock: row.tipo_item !== 'servico' && row.controla_estoque === true, fiscalReady: fiscalReady(row),
        fiscal: {
          ncm: clean(row.ncm), cest: clean(row.cest), originCode: clean(row.origem_mercadoria),
          taxableUnit: clean(row.unidade_tributavel), cfop: clean(row.cfop_padrao),
          cst: clean(row.cst), csosn: clean(row.csosn), pisCst: clean(row.cst_pis), cofinsCst: clean(row.cst_cofins),
          ibsCbsCst: clean(row.cst_ibs_cbs), ibsCbsClassification: clean(row.classificacao_ibs_cbs),
          nationalServiceCode: clean(row.codigo_tributacao_nacional), municipalServiceCode: clean(row.codigo_tributacao_municipal),
          itemLc116: clean(row.item_lc116), nbs: clean(row.nbs), taxableMunicipality: clean(row.municipio_prestacao),
        },
      })),
    };
  };
}

export function createPostgresCommercialIssuerResolver({ pool } = {}) {
  if (!pool?.query) throw new TypeError('Informe o pool PostgreSQL server-side.');
  return async ({ companyId } = {}) => {
    const result = await pool.query(`
      select cadastro.*,empresa.nome as empresa_nome
      from public.cadastros_perfil cadastro
      join public.empresas empresa on empresa.id=cadastro.empresa_id
      where cadastro.empresa_id=$1 limit 1
    `, [companyId]);
    const row = result.rows?.[0];
    if (!row) return {};
    return {
      establishmentId: companyId,
      document: clean(row.documento), legalName: clean(row.razao_social), tradeName: clean(row.nome_fantasia || row.empresa_nome),
      stateRegistration: row.inscricao_estadual_isento ? 'ISENTO' : clean(row.inscricao_estadual),
      municipalRegistration: row.inscricao_municipal_isento ? 'ISENTO' : clean(row.inscricao_municipal),
      taxRegime: clean(row.regime_tributario), postalCode: clean(row.cep), street: clean(row.rua), number: clean(row.numero),
      complement: clean(row.complemento), district: clean(row.bairro), city: clean(row.cidade),
      cityCode: resolveMunicipalityCode({ city: row.cidade, uf: row.estado, cep: row.cep }), state: clean(row.estado).toUpperCase(),
    };
  };
}
