import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketplaceError} from './management-access';
import {mlRequest,type SellerConnection} from './mercadolivre-management';
import {diagnoseMercadoLivrePrices,priceDiagnosticInput} from './mercadolivre-price-diagnostic';
import type {MLReadDiagnostic} from './mercadolivre-diagnostic-evidence';
const record=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const numericId=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0?String(v):typeof v==='string'&&/^[1-9]\d{0,23}$/.test(v)?v:null;
const scopes=(v:unknown)=>Array.isArray(v)?v.filter((s):s is string=>typeof s==='string'&&/^(?:read|write|offline_access|urn:[a-z0-9:/._-]{1,140})$/.test(s)).slice(0,60):[];
export function diagnosticPathAllowed(path:string,seller:string,appId:string|null){
 const u=new URL(path,'https://api.mercadolibre.com');if(u.origin!=='https://api.mercadolibre.com'||u.hash||path.startsWith('//')||!path.startsWith('/'))return false;
 const p=u.pathname,keys=[...u.searchParams.keys()];
 if(keys.some(k=>!['q','limit','site_id','status','product_identifier','seller_id'].includes(k)))return false;
 if(u.searchParams.has('limit')&&!['1','5','20'].includes(u.searchParams.get('limit')!))return false;
 if(p==='/users/me')return keys.length===0;
 if(p===`/users/${seller}/applications`)return keys.length===0;
 if(p===`/users/${seller}/items/search`)return keys.every(k=>k==='limit');
 if(appId&&p===`/applications/${appId}`)return keys.length===0;
 if(/^\/items\/MLB\d{3,20}$/.test(p)||/^\/products\/MLB\d{3,20}$/.test(p))return keys.length===0;
 if(/^\/products\/MLB\d{3,20}\/items$/.test(p))return keys.every(k=>k==='limit');
 if(p==='/products/search')return keys.every(k=>['q','limit','site_id','status','product_identifier'].includes(k))&&u.searchParams.get('site_id')==='MLB'&&u.searchParams.get('status')==='active';
 return p==='/sites/MLB/search'&&keys.every(k=>['q','limit','seller_id'].includes(k))&&(!u.searchParams.has('seller_id')||u.searchParams.get('seller_id')===seller);
}
/** Reutiliza a conexão autorizada; só GETs definidos no servidor, sem comandos comerciais. */
export async function diagnoseMercadoLivreAccess(db:SupabaseClient,connection:SellerConnection,input:ReturnType<typeof priceDiagnosticInput>,readOverride?:(path:string)=>Promise<unknown>){
 const seller=numericId(connection.seller_reference),appId=numericId(process.env.MERCADOLIVRE_CLIENT_ID);
 if(!seller)throw new MarketplaceError(409,'diagnostic_identity','A conta não possui uma identidade válida para o diagnóstico.');
 const signal=AbortSignal.timeout(45_000),responses:MLReadDiagnostic[]=[],cache=new Map<string,Promise<unknown>>();let reads=0,limited=false;
 const read=(path:string):Promise<unknown>=>{
  if(!diagnosticPathAllowed(path,seller,appId))throw new MarketplaceError(400,'diagnostic_path','Recurso fora do diagnóstico permitido.');
  const prior=cache.get(path);if(prior)return prior;
  signal.throwIfAborted();if(limited||++reads>16)throw new MarketplaceError(429,'diagnostic_limit','O diagnóstico atingiu seu limite de consultas.');
  const result=(readOverride?readOverride(path):mlRequest(db,connection,path,'GET',undefined,undefined,{signal,observe:e=>{responses.push(e);if(e.status===429)limited=true;}}));cache.set(path,result);return result;
 };
 const identity=record(await read('/users/me'));
 if(numericId(identity.id)!==seller||identity.site_id!=='MLB')throw new MarketplaceError(409,'diagnostic_identity','A API não confirmou a identidade desta conta no Brasil. Nenhuma consulta adicional foi executada.');
 const result=await diagnoseMercadoLivrePrices(input,read);
 const checks:Array<{operation:string;path:string;status:number;code?:string}>=[];
 const probe=async(operation:string,path:string)=>{try{const data=await read(path);checks.push({operation,path,status:responses.filter(r=>r.path===path).at(-1)?.status||200});return data;}catch(e){checks.push({operation,path,status:e instanceof MarketplaceError?e.status:503,code:e instanceof MarketplaceError&&/^provider_\d{3}$/.test(e.code)?e.code:'diagnostic_unavailable'});return null;}};
 const [ownRaw,appRaw,grantsRaw]=await Promise.all([
  probe('own_listings',`/users/${seller}/items/search?limit=1`),
  appId?probe('application',`/applications/${appId}`):Promise.resolve(null),
  appId?probe('authorization',`/users/${seller}/applications`):Promise.resolve(null),
 ]);
 await probe('seller_listing_search',`/sites/MLB/search?${new URLSearchParams({seller_id:seller,limit:'1'})}`);
 if(input.ean&&input.query)await probe('listing_search_ean',`/sites/MLB/search?${new URLSearchParams({q:input.ean,limit:'1'})}`);
 const own=record(ownRaw),ownItem=Array.isArray(own.results)?own.results.find(x=>typeof x==='string'&&/^MLB\d{3,20}$/.test(x)):null;
 const other=result.catalogs.flatMap(c=>c.sample.offers).find(o=>/^MLB\d{3,20}$/.test(o.id)&&o.sellerId&&String(o.sellerId)!==seller);
 if(ownItem)await probe('own_item',`/items/${ownItem}`);
 if(other)await probe('other_seller_item',`/items/${other.id}`);
 const app=record(appRaw),grant=Array.isArray(grantsRaw)?grantsRaw.map(record).find(g=>numericId(g.app_id)===appId&&numericId(g.user_id)===seller):null;
 const certified=['certified','not_certified','non_certified','silver','gold','platinum'].includes(String(app.certification_status))?String(app.certification_status):null;
 return {...result,accessAudit:{identityVerified:true,sellerReference:seller,application:appId?{id:appId,received:!!appRaw,active:typeof app.active==='boolean'?app.active:null,sandbox:typeof app.sandbox_mode==='boolean'?app.sandbox_mode:null,certificationStatus:certified,scopes:scopes(app.scopes)}:null,authorization:{configured:!!appId,received:Array.isArray(grantsRaw),grantFound:Array.isArray(grantsRaw)?!!grant:null,scopes:scopes(grant?.scopes)},checks,providerResponses:responses,distinctReads:reads,readOnly:true,advertisementsChanged:false,stockChanged:false,referenceSaved:false}};
}
