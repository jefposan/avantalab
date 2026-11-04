import test from 'node:test';import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';import {existsSync} from 'node:fs';import {resolve,dirname} from 'node:path';import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..'),data=code=>({url:'data:text/javascript,'+encodeURIComponent(code),shortCircuit:true});
const hook=registerHooks({resolve(s,c,next){
 if(s==='server-only')return data('export {}');if(s==='next/server')return data('export const NextResponse={json:(v,o)=>Response.json(v,o)}');
 if(s.endsWith('/management-access'))return data(`export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}};export function managementFailure(e){return Response.json({message:e.message,code:e.code},{status:e.status||503})};export async function authorizeMarketplace(req,id,p){if(p!=='manage'||id!=='company'||req.headers.get('authorization')!=='Bearer manager')throw new MarketplaceError(403,'forbidden','Negado');return {db:globalThis.aiDb,empresaId:id,usuario:{id:'actor'}}}`);
 if(s==='./local-products')return data(`export async function getLocalProduct(db,company,id){if(company!=='company'||id!=='product')throw Object.assign(Error('Produto não encontrado'),{status:404});return {id,name:'Escova Rotativa ER-10 Mondial Preto',ean:'7899882311471',description:'',attributes:[{id:'COLOR',name:'Cor',value:'Preto'}]}}`);
 if(s==='./product-common-content')return data(`export async function readCommonProductEditor(db,company,id,kind){if(company!=='company'||id!=='product')throw Error('escopo');return globalThis.aiEditors[kind]}`);
 const f=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;if(f&&existsSync(f+'.ts'))return next(pathToFileURL(f+'.ts').href,c);return next(s,c);
}});
const {POST}=await import('../../app/api/modulos/marketplaces/produtos/qualidade/ia/route.ts');hook.deregister();
const realFetch=globalThis.fetch,live=process.env.AVANTA_QUALITY_LIVE_TEST==='1';
if(live)process.loadEnvFile('/Users/JEFF/avantalab/.env.local');
const key=process.env.OPENAI_API_KEY;const rule={id:'COLOR',name:'Cor',value:'',valueId:null,editable:true,reason:'',type:'string',maxLength:100,options:[],units:[]};
function fixture(mode='ok'){
 process.env.OPENAI_API_KEY=live?key:'test-key';
 const base={id:'MLB123456',connectionId:'account',revision:'rev',reason:'',maxPictures:12,pictures:[{id:'photo-123',url:'https://http2.mlstatic.com/a.jpg'}],attributes:[rule]};
 globalThis.aiEditors={attributes:{editor:base,targets:[{id:base.id,content:base}]},details:{editor:{...base,attributes:[{...rule,id:'DESCRIPTION',maxLength:50000}]},targets:[{id:base.id,details:{values:{description:''}}}]},pictures:{editor:base,targets:[{content:base},{content:{...base,pictures:[...base.pictures,{id:'photo-456',url:'https://http2.mlstatic.com/b.jpg'}]}}]}};
 const calls=[],receipts=[];let count=0;
 globalThis.aiDb={rpc:async(name,args)=>{calls.push({name,args});if(name.endsWith('_claim'))return {data:{researchPricingVersion:1,...(mode==='limited'?{status:'limited'}:mode==='cached'?{status:'cached',result:{productId:'product',suggestions:[]}}:{status:'claimed',id:'job',usedMicrousd:100000})}};receipts.push(args);return {error:null};}};
 globalThis.fetch=async(url,options)=>{count++;assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);assert.equal(body.model,'gpt-5.4-mini');assert.equal(body.tools[0].type,'web_search');assert.equal(body.max_tool_calls,2);assert.equal(body.tool_choice,'required');assert.equal(body.store,false);assert.equal(body.max_output_tokens,3000);if(live)return realFetch(url,options);if(mode==='timeout')throw Error('timeout');return Response.json({status:'completed',usage:{input_tokens:6000,output_tokens:500},output:[{type:'web_search_call',action:{sources:[]}},{type:'message',content:[{type:'output_text',text:JSON.stringify({facts:[]})}]}]});};
 return {calls,receipts,count:()=>count};
}
const request=(body={},token='manager')=>new Request('http://local',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({empresaId:'company',productId:'product',requestKey:crypto.randomUUID(),...body})});
test('IA exige gestão/tenant, só prepara, uma chamada mini, fonte e fotos revisáveis, recibo de consumo',async()=>{
 const f=fixture();assert.equal((await POST(request({},'viewer'))).status,403);assert.equal((await POST(request({empresaId:'other'}))).status,403);assert.equal((await POST(request({productId:'other'}))).status,404);
 const response=await POST(request());assert.equal(response.status,200);const result=await response.json();assert.equal(result.suggestions[0].value,'Preto');assert.equal(result.pictures.length,2);assert.match(result.description,/Escova Rotativa ER-10 Mondial Preto/);assert.equal(f.count(),1);assert.equal(f.receipts[0].p_status,'completed');assert.ok(f.receipts[0].p_usage.inputTokens>0);assert.equal(f.calls.some(c=>/apply|save/.test(c.name)),false);
 if(live)console.log('Teste real mini: identificação/evidência e proposta aprovadas; tokens',f.receipts[0].p_usage);
});
test('limite e cache não chamam OpenAI; erro não aplica nada e conserva reserva sem recibo',async()=>{
 if(live)return;
 let f=fixture('limited');assert.equal((await POST(request())).status,429);assert.equal(f.count(),0);
 f=fixture('cached');assert.equal((await POST(request())).status,200);assert.equal(f.count(),0);
 f=fixture('timeout');assert.equal((await POST(request())).status,503);assert.equal(f.count(),1);assert.equal(f.receipts[0].p_status,'failed');assert.equal(f.receipts[0].p_usage,null);
});
test('IA prepara fotos na conta permitida apesar de outra conta de catálogo, sem escrita externa',async()=>{
 const f=fixture();const p=globalThis.aiEditors.pictures;const base=p.editor;
 p.targets=[{connectionId:'blocked',id:'MLB123456',affectedIds:['MLB123456'],content:{...base,reason:'Catálogo controlado',pictures:[...base.pictures,{id:'extra-1',url:'https://http2.mlstatic.com/extra1.jpg'},{id:'extra-2',url:'https://http2.mlstatic.com/extra2.jpg'}]}},{connectionId:'allowed',id:'MLB654321',affectedIds:['MLB654321'],content:{...base,pictures:[...base.pictures]}}];
 const response=await POST(request({perAccountPictures:true}));assert.equal(response.status,200);const result=await response.json();assert.equal(result.pictures.length,3);assert.equal(result.pictures[0].id,base.pictures[0].id);assert.equal(f.calls.some(c=>/apply|save/.test(c.name)),false);
});
test.after(()=>{globalThis.fetch=realFetch;if(key)process.env.OPENAI_API_KEY=key;else delete process.env.OPENAI_API_KEY;});
