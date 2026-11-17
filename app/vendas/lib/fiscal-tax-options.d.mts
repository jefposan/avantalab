export type TaxOption={value:string;label:string};
export type CompanyFiscalDefaults={origem_mercadoria_padrao:string;csosn:string;cst_icms:string;cst_pis:string;cst_cofins:string;cfop_venda_interna:string;cfop_venda_interestadual:string};
export const CSOSN_OPTIONS:TaxOption[];
export const ICMS_OPTIONS:TaxOption[];
export const CONTRIBUTION_OPTIONS:TaxOption[];
export const ORIGIN_OPTIONS:TaxOption[];
export const TAX_OPTIONS_SOURCE:string;
export function normalizeCompanyFiscalDefaults(source?:object):CompanyFiscalDefaults;
