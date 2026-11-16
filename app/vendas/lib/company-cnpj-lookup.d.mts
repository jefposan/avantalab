export type CompanyCnpjLookup = {
 document: string; legalName?: string; tradeName?: string; stateRegistration?: string;
 municipalRegistration?: string; email?: string; phone?: string; cep?: string;
 street?: string; number?: string; complement?: string; district?: string;
 cityName?: string; cityCode?: string; state?: string; name?: string;
};
export function lookupCompanyCnpj(document: string, options?: { fetcher?: typeof fetch; signal?: AbortSignal }): Promise<CompanyCnpjLookup>;
