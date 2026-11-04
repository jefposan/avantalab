// Avaliação paga somente com autorização explícita --live; no máximo três consultas.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { registerHooks } from 'node:module';
const root=resolve(import.meta.dirname,'..');
if(!process.argv.includes('--live'))throw Error('Use --live somente com autorização para até três pesquisas pagas.');
const destination=process.argv.find(a=>a.startsWith('--report='))?.slice(9);
if(destination&&!destination.startsWith('/private/tmp/'))throw Error('Relatório de avaliação deve ficar em /private/tmp/.');
const env=existsSync(resolve(root,'.env.local'))?readFileSync(resolve(root,'.env.local'),'utf8'):'';
for(const name of ['OPENAI_API_KEY','OPENAI_API_KEY_AVA']){const line=env.split('\n').find(l=>l.startsWith(name+'='));if(!process.env[name]&&line)process.env[name]=line.slice(name.length+1).trim().replace(/^(["'])(.*)\1$/,'$2');}
const hooks=registerHooks({resolve(s,c,next){
 if(s==='server-only')return{url:'data:text/javascript,export {}',shortCircuit:true};
 if(s==='./management-access')return{url:'data:text/javascript,export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}',shortCircuit:true};
 const file=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
 if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,c);
 return next(s,c);
}});
const {consultOpenAIWebPrices}=await import('../app/modules/marketplaces/services/openai-web-price-search.ts');hooks.deregister();
const nativeFetch=globalThis.fetch;
let metrics;
globalThis.fetch=async(url,options)=>{
 if(String(url)!=='https://api.openai.com/v1/responses')throw Error('Destino não permitido');
 const request=JSON.parse(options.body);
 if(request.model!=='gpt-5.4-mini'||request.max_tool_calls!==2||request.max_output_tokens>2500)throw Error('Limites da avaliação inválidos');
 const response=await nativeFetch(url,options),body=await response.clone().json().catch(()=>({}));
 let candidateOffers=[];try{candidateOffers=JSON.parse((body.output||[]).flatMap(o=>o.content||[]).find(c=>c.type==='output_text')?.text||'{}').offers||[];}catch{/* Resposta incompleta fica no relatório. */}
 metrics={model:request.model,status:response.status,usage:body.usage,webCalls:(body.output||[]).filter(o=>o.type==='web_search_call').length,webActions:(body.output||[]).filter(o=>o.type==='web_search_call').map(o=>o.action?.type),responseStatus:body.status,errorCode:body.error?.code,candidateOffers};
 return response;
};
const cases=[
 {name:'Calculadora Elgin MB7142',ean:null},
 {name:'Chaleira Elétrica Oster Inox 2L Ultra Preto',ean:'7898742840274'},
 {name:'Calculadora Elgin MB7142 voltagem 999V',ean:null,expectNoOffers:true},
];
const report={model:'gpt-5.4-mini',startedAt:new Date().toISOString(),cases:[],published:false,productWrites:0};
try{
 for(const entry of cases){
  const started=Date.now();
  try{const result=await consultOpenAIWebPrices({productName:entry.name,ean:entry.ean});report.cases.push({...entry,metrics,durationMs:Date.now()-started,result});}
  catch(error){report.cases.push({...entry,metrics,durationMs:Date.now()-started,error:{code:error.code,message:error.message}});break;}
 }
}finally{globalThis.fetch=nativeFetch;if(destination)writeFileSync(destination,JSON.stringify(report,null,2),{mode:0o600});}
console.log(JSON.stringify(report,null,2));
