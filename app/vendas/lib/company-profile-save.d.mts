import type { ManagementCatalogBridge } from './management-catalog-bridge.mjs';
export const COMPANY_PROFILE_SAVE_REQUEST: string;
export const COMPANY_PROFILE_SAVE_RESPONSE: string;
export function companyProfilePatch(company: Record<string, any>): Record<string, any>;
export function saveCompanyProfile(input: {companyId:string; company:Record<string,any>; token:string; fetcher?:typeof fetch}):Promise<{cadastro:Record<string,unknown>;company:ManagementCatalogBridge['company']}>;
