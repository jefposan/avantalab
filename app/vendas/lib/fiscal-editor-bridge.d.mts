export const FISCAL_EDITOR_REQUEST:string;
export function requestFiscalEditor(input:{companyId:string;origin:string;action?:'load'|'create-message'|'load-defaults'|'save-defaults';message?:unknown;defaults?:unknown;version?:string}):Promise<any>;
