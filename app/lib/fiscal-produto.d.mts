export type FiscalProdutoResolvido = { useCompanyFiscal: boolean; ncm: string; cest: string; taxableUnit: string; originCode: string; icmsCode: string; pisCst: string; cofinsCst: string; ibsCbsCst: string; ibsCbsClassification: string; cfop: string };
export function usaFiscalEmpresa(source?: object): boolean;
export function padroesFiscaisEmpresa(profile?: object): Pick<FiscalProdutoResolvido, 'originCode' | 'icmsCode' | 'pisCst' | 'cofinsCst' | 'ibsCbsCst' | 'ibsCbsClassification'>;
export function resolverFiscalProduto(product?: object, company?: object, operation?: {destination?: string; cfop?: string}): FiscalProdutoResolvido;
