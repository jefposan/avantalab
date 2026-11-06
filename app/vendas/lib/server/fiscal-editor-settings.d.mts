export function createFiscalEditorSettingsRepository(options:{pool:any;issuerResolver?:(input:{companyId:string})=>Promise<any>}):any;
export function handleFiscalEditorSettings(options:{request:Request;runtime:any;companyId:string}):Promise<Response>;
