export const FISCAL_EDITOR_REQUEST:string;
export function requestFiscalEditor(input:{companyId:string;origin:string;action?:'load'|'create-message';message?:unknown}):Promise<any>;
