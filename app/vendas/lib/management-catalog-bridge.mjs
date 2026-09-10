import { resolveMunicipalityCode } from './municipality.mjs';

const MESSAGE_TYPE = 'AVANTALAB_VENDAS_CATALOGO_V1';
const READY_TYPE = 'AVANTALAB_VENDAS_CATALOGO_READY_V1';

function text(value) { return typeof value === 'string' ? value.trim() : String(value ?? '').trim(); }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function color(value) { const normalized = text(value); return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toLowerCase() : '#003e73'; }
function imageUrl(value) {
  const normalized = text(value);
  try { const url = new URL(normalized); return ['https:', 'http:'].includes(url.protocol) ? url.toString() : ''; } catch { return ''; }
}

export function isAllowedLocalManagementOrigin(origin, currentOrigin = '') {
  try {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    if (currentOrigin && url.origin === new URL(currentOrigin).origin) return true;
    return ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch { return false; }
}

function mapCompanyProfile(profile, companyId) {
  if (!profile || typeof profile !== 'object' || text(profile.empresa_id) !== companyId) return null;
  return {
    name: text(profile.nome_fantasia),
    legalName: text(profile.razao_social),
    document: text(profile.documento).replace(/\D/g, ''),
    stateRegistration: profile.inscricao_estadual_isento === true ? 'ISENTO' : text(profile.inscricao_estadual),
    municipalRegistration: profile.inscricao_municipal_isento === true ? 'ISENTO' : text(profile.inscricao_municipal),
    taxRegime: text(profile.regime_tributario),
    cityCode: resolveMunicipalityCode({ city: text(profile.cidade), uf: text(profile.estado), cep: text(profile.cep) }),
    cep: text(profile.cep),
    street: text(profile.rua),
    number: text(profile.numero),
    complement: text(profile.complemento),
    district: text(profile.bairro),
    city: [text(profile.cidade), text(profile.estado)].filter(Boolean).join('/'),
    email: text(profile.email_empresa),
    phone: text(profile.telefone),
  };
}

export function mapManagementCatalogItem(item) {
  const fiscal = item?.fiscal && typeof item.fiscal === 'object' ? item.fiscal : {};
  const service = item?.tipo === 'servico';
  return {
    catalogItemId: text(item?.id),
    sku: text(item?.sku),
    name: text(item?.nome),
    description: text(item?.descricao),
    category: service ? 'Serviço' : 'Produto acabado',
    current: Math.max(0, number(item?.saldoFisico)),
    reserved: Math.max(0, number(item?.saldoReservado)),
    available: Math.max(0, number(item?.saldoFisico) - number(item?.saldoReservado)),
    minimum: Math.max(0, number(item?.estoqueMinimo)),
    unit: text(item?.unidade) || (service ? 'serviço' : 'un'),
    cost: 0,
    price: Math.max(0, number(item?.preco)),
    fiscal: item?.situacaoFiscal === 'Completo' ? 'Completo' : 'Revisar cadastro fiscal',
    origin: 'Custos e Precificação',
    syncStatus: 'Sincronizado',
    syncedAt: text(item?.atualizadoEm),
    saleStatus: 'Ativo',
    trackStock: item?.controlaEstoque === true,
    allowNegativeStock: item?.permiteNegativo === true,
    stockLocationId: text(item?.localEstoqueId),
    ncm: text(fiscal.ncm),
    cest: text(fiscal.cest),
    gtin: text(item?.codigoBarras),
    municipalServiceCode: text(fiscal.codigoTributacaoMunicipal),
    nationalServiceCode: text(fiscal.codigoTributacaoNacional),
    nbs: text(fiscal.nbs),
    issRate: Math.max(0, number(fiscal.aliquotaIss)),
    fiscalOriginCode: text(fiscal.origemMercadoria).match(/^\d+/)?.[0] || '',
    taxableUnit: text(fiscal.unidadeTributavel),
    cfopInternal: text(fiscal.cfopPadrao),
    cfopInterstate: '',
    icmsCode: text(fiscal.csosn) || text(fiscal.cst),
    pisCst: text(fiscal.cstPis),
    cofinsCst: text(fiscal.cstCofins),
    ibsCbsCst: text(fiscal.cstIbsCbs),
    ibsCbsClassification: text(fiscal.classificacaoIbsCbs),
    serviceIncidenceMode: text(fiscal.municipioPrestacao),
  };
}

export function parseManagementCatalogMessage(data) {
  if (!data || data.type !== MESSAGE_TYPE) return null;
  const catalog = data.catalogo;
  if (!catalog || catalog.versao !== 1 || catalog.origem !== 'custos_precificacao' || catalog.somenteLeitura !== true || typeof catalog.estoqueIntegrado !== 'boolean' || !Array.isArray(catalog.itens)) return null;
  const items = catalog.itens.map(mapManagementCatalogItem).filter((item) => item.catalogItemId && item.sku && item.name && item.price >= 0);
  const companyId = text(catalog.empresaId);
  return {
    items,
    companyId,
    catalogAvailable: data.catalogoDisponivel !== false,
    message: text(data.mensagem).slice(0, 240),
    primaryColor: color(data.corPrimaria),
    logoUrl: imageUrl(data.logoUrl),
    company: mapCompanyProfile(data.perfil, companyId),
    priceTable: catalog.tabelaPreco ? { id: text(catalog.tabelaPreco.id), name: text(catalog.tabelaPreco.nome) } : null,
    generatedAt: text(catalog.geradoEm),
    stockIntegrated: catalog.estoqueIntegrado === true,
    readOnly: true,
  };
}

export const MANAGEMENT_CATALOG_MESSAGE_TYPE = MESSAGE_TYPE;
export const MANAGEMENT_CATALOG_READY_TYPE = READY_TYPE;
