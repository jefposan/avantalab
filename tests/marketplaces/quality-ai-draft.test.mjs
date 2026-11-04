import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const data=code=>({url:'data:text/javascript,'+encodeURIComponent(code),shortCircuit:true});
const hook=registerHooks({resolve(s,c,next){
 if(s==='server-only')return data('export {}');
 if(s==='./local-products')return data(`export async function getLocalProduct(){return {id:'product',name:'Produto',ean:'',description:'Descrição confirmada',attributes:[{id:'POWER',name:'Potência',value:'1500 W'}]}}`);
 if(s==='./product-common-content')return data(`export async function readCommonProductEditor(db,company,id,kind,conn,item,draft){if(draft!==true)throw Error('Preparação deve ser local');db.reads.push(kind);const rule={id:'POWER',name:'Potência',type:'number_unit',value:'',valueId:null,editable:true,reason:'',maxLength:100,options:[],units:['W']};return {editor:{id:'MLB123456',connectionId:'account',revision:kind+'-rev',attributes:kind==='details'?[{...rule,id:'DESCRIPTION',maxLength:5000}]:[rule],maxPictures:6,pictures:[],restrictions:[{connectionId:'account',id:'MLB123456',message:'Catálogo controlado pelo ML'}]},targets:[{id:'MLB123456',content:{attributes:[rule],pictures:[]},details:{values:{description:''}}}]}}`);
 if(s==='./management-access')return data(`export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}`);
 const file=s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,c);return next(s,c);
}});
const {prepareQualityAI}=await import('../../app/modules/marketplaces/services/quality-ai.ts');hook.deregister();
test('IA prepara evidência mesmo com envio restrito, mantém cota e não escreve anúncio',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='fake-test-key';let calls=0;const db={reads:[],receipts:[],async rpc(name,input){this.receipts.push({name,input});return name.endsWith('_claim')?{data:{status:'claimed',id:'job',usedMicrousd:100000,researchPricingVersion:1}}:{data:null};}};
 globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);assert.equal(body.model,'gpt-5.4-mini');assert.equal(body.tools[0].type,'web_search');assert.equal(body.max_tool_calls,2);return Response.json({status:'completed',usage:{input_tokens:100,output_tokens:20},output:[{type:'web_search_call',action:{sources:[]}},{content:[{type:'output_text',text:JSON.stringify({facts:[]})}]}]});};
 try{const result=await prepareQualityAI(db,'company','actor',{productId:'product',requestKey:crypto.randomUUID()});assert.equal(calls,1);assert.deepEqual(db.reads,['attributes','details','pictures']);assert.equal(result.suggestions[0].value,'1500 W');assert.equal(result.restrictions.length,1);assert.match(result.restrictions[0].message,/Catálogo/);assert.equal(result.budget,undefined);assert.equal(db.receipts.length,2);assert.equal(db.receipts[1].input.p_status,'completed');assert.equal(db.receipts[1].name,'marketplace_quality_ai_finish');}
 finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;}
});
