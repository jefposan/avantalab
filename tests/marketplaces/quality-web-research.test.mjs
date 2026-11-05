import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const hook=registerHooks({resolve(s,c,next){
 if(s==='server-only')return {url:'data:text/javascript,export {}',shortCircuit:true};
 if(s==='./public-price-page')return {url:'data:text/javascript,'+encodeURIComponent('export async function readPublicPricePage(url){return globalThis.qualityTestPages.get(url)||null}'),shortCircuit:true};
 const file=s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,c);return next(s,c);
}});
const {verifyQualityWebFacts}=await import('../../app/modules/marketplaces/quality-web-evidence.ts');
const {researchQualityFacts}=await import('../../app/modules/marketplaces/services/quality-web-research.ts');
const {qualityUsageCost}=await import('../../app/modules/marketplaces/quality-ai.ts');hook.deregister();
const url='https://fabricante.example/produto/aq-100',identity={name:'Aquecedor Kian AQ-100 1500W',ean:'7899710028120',brand:'Kian',model:'AQ-100'};
const page=(ean=identity.ean,name=identity.name)=>`<html><h1>${name}</h1><p>Potência: 1500 W. EAN ${ean}</p><script type="application/ld+json">${JSON.stringify({'@type':'Product',name,gtin13:ean,model:'AQ-100',brand:{name:'Kian'}})}</script></html>`;
const candidate={field:'POWER',value:'1500 W',evidence:'Potência: 1500 W.',source_url:url};
test('fonte exata, trecho literal e variante confirmados; rejeita EAN/modelo incorreto e prova inventada',()=>{
 const facts=verifyQualityWebFacts(page(),identity,[candidate],url);assert.equal(facts.length,1);assert.equal(facts[0].sourceUrl,url);assert.equal(facts[0].value,'1500 W');
 assert.equal(verifyQualityWebFacts(page('7899882311471'),identity,[candidate],url).length,0);
 assert.equal(verifyQualityWebFacts(page(identity.ean,'Kian AQ-200 1500W'),identity,[candidate],url).length,0);
 assert.equal(verifyQualityWebFacts(page(),identity,[{...candidate,evidence:'Potência: 2000 W.',value:'2000 W'}],url).length,0);
 assert.equal(verifyQualityWebFacts(page(),identity,[{...candidate,evidence:'Potência: 1500 W.',value:'220 V'}],url).length,0);
 assert.equal(verifyQualityWebFacts(page()+page(),identity,[candidate],url).length,0);
 assert.equal(verifyQualityWebFacts(`<h1>Fogão de cozinha</h1><p>Produtos recomendados: EAN ${identity.ean}. Potência: 1500 W.</p>`,{name:'Geladeira Brastemp',ean:identity.ean},[candidate],url).length,0);
});
test('pesquisa uma vez, mini com limite de ferramentas, só usa fonte citada/lida e contabiliza chamadas',async()=>{
 const previous=globalThis.fetch;let calls=0,usage;globalThis.qualityTestPages=new Map([[url,{url,html:page()}]]);
 globalThis.fetch=async(target,options)=>{calls++;assert.equal(target,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);assert.equal(body.model,'gpt-5.4-mini');assert.equal(body.max_tool_calls,2);assert.equal(body.tool_choice,'required');return Response.json({status:'completed',usage:{input_tokens:1000,output_tokens:100},output:[{type:'web_search_call',action:{sources:[{url}]}},{type:'message',content:[{type:'output_text',text:JSON.stringify({facts:[candidate,{...candidate,source_url:'https://inventada.example/p/aq100'}]})}]}]});};
 try{const field={id:'POWER',name:'Potência',type:'number_unit',options:[],units:['W']};const result=await researchQualityFacts('fake',identity,[field],u=>usage=u);assert.equal(result.length,1);assert.equal(calls,1);assert.deepEqual(usage,{inputTokens:1000,outputTokens:100,webCalls:1});assert.equal(qualityUsageCost(1000,100,1),11200);assert.equal(qualityUsageCost(60000,3000,2),78500);assert.equal(qualityUsageCost(1,1,3),100000);
 globalThis.qualityTestPages.clear();assert.deepEqual(await researchQualityFacts('fake',identity,[field],()=>{}),[]);assert.equal(calls,2);}
 finally{globalThis.fetch=previous;delete globalThis.qualityTestPages;}
});
test('preenchimento complementar é definido no cadastro; contas adicionais só permitem preço',()=>{
 assert.match(readFileSync('app/marketplaces/NewListing.tsx','utf8'),/PublicationOptionalAttributes fields=/);
 const multi=readFileSync('app/marketplaces/MultiAccountPublication.tsx','utf8');assert.doesNotMatch(multi,/PublicationOptionalAttributes fields=/);assert.match(multi,/Preço nesta conta/);assert.match(multi,/somente o preço pode variar/i);
 const ui=readFileSync('app/marketplaces/QualityAIReview.tsx','utf8');assert.match(ui,/Preencher ficha técnica/);assert.match(ui,/data.suggestions.length>0/);assert.match(ui,/href=\{s.sourceUrl\}/);
 const service=readFileSync('app/modules/marketplaces/services/mercadolivre-publication.ts','utf8');assert.match(service,/prepared.optionalAttributes/);assert.match(service,/if\(!value\)continue/);
});
