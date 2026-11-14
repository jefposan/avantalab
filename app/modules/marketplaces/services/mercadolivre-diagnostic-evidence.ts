/** Recibo técnico por lista permitida. Nunca retorna corpo/headers brutos do ML. */
export type MLReadDiagnostic = {path:string;status:number;requestId:string|null;correlationId:string|null;providerCode:string|null;providerError:string|null;blockedBy:string|null;message:string|null;causeCodes:string[];body:'not_read'|'json'|'omitted'};
const codes=new Set(['PA_UNAUTHORIZED_RESULT_FROM_POLICIES','FORBIDDEN','UNAUTHORIZED','forbidden','access_denied','unauthorized','invalid_scope','invalid_scopes','Invalid scopes','invalid_token','not_found','item_not_found','bad_request','too_many_requests','to_many_requests','rate_limit_exceeded','invalid_request','invalid_grant']);
const messages=new Map([
 ['at least one policy returned unauthorized.','At least one policy returned UNAUTHORIZED.'],
 ['access to the requested resource is forbidden','access to the requested resource is forbidden'],
 ['invalid scopes','Invalid scopes'],['invalid token','Invalid token'],
]);
const record=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const code=(v:unknown)=>typeof v==='string'&&codes.has(v)?v:null;
function trace(v:string|null,secret:string){return v&&(!secret||!v.includes(secret))&&!/^(?:APP_USR|TEST|Bearer|eyJ|sb_)/i.test(v)&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{7,127}$/.test(v)?v:null;}
async function smallJson(response:Response){
 const copy=response.clone(),reader=copy.body?.getReader();if(!reader)return null;
 let size=0;const chunks:Uint8Array[]=[];
 try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>16_384){void reader.cancel().catch(()=>{});return null;}chunks.push(part.value);}
  const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}return record(JSON.parse(new TextDecoder().decode(bytes)));
 }catch{return null;}finally{reader.releaseLock();}
}
export async function readMLDiagnosticEvidence(response:Response,path:string,secret:string):Promise<MLReadDiagnostic>{
 const evidence:MLReadDiagnostic={path:secret?path.replaceAll(secret,'[redacted]'):path,status:response.status,requestId:trace(response.headers.get('x-request-id')||response.headers.get('x-meli-trace-id'),secret),correlationId:trace(response.headers.get('x-correlation-id'),secret),providerCode:null,providerError:null,blockedBy:null,message:null,causeCodes:[],body:'not_read'};
 if(response.ok)return evidence;
 const data=await smallJson(response);evidence.body=data?'json':'omitted';if(!data)return evidence;
 evidence.providerCode=code(data.code);evidence.providerError=code(data.error);evidence.blockedBy=data.blocked_by==='PolicyAgent'?'PolicyAgent':null;
 evidence.message=typeof data.message==='string'?messages.get(data.message.trim().toLowerCase())||null:null;
 evidence.causeCodes=Array.isArray(data.cause)?[...new Set(data.cause.slice(0,10).map(c=>code(record(c).code)).filter((v):v is string=>!!v))]:[];
 for(const key of ['requestId','correlationId','providerCode','providerError','blockedBy','message'] as const)if(secret&&evidence[key]?.includes(secret))evidence[key]=null;
 evidence.causeCodes=evidence.causeCodes.filter(v=>!secret||!v.includes(secret));
 return evidence;
}
