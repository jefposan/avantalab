export const DANFE_LAYOUT_VERSION:string;
export function buildPresentedNfeDanfe(options?:{processedXml?:string;expectedAccessKey?:string;expectedEnvironment?:'homologacao'|'producao';sampleMode?:boolean;logoBytes?:Uint8Array|null}):Promise<ReturnType<typeof import('./nfe-danfe.mjs').buildNfeDanfe>>;
export function loadDanfeLogo(value:unknown,options?:{supabaseUrl?:string;fetcher?:typeof fetch}):Promise<Uint8Array|null>;
