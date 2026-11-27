export const FISCAL_EDITOR_REQUEST:string;
export function requestFiscalEditor(input:{companyId:string;origin:string;action?:'load'|'create-message'|'load-defaults'|'save-defaults'|'load-policy'|'save-policy'|'load-revenue'|'save-revenue'|'load-payments'|'save-payments';message?:unknown;defaults?:unknown;version?:string;policy?:unknown;revenue?:unknown;paymentSettings?:unknown}):Promise<any>;
