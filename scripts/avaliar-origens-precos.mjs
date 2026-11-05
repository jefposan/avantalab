import {registerHooks} from 'node:module';
import {resolve,dirname} from 'node:path';
import {existsSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const hooks=registerHooks({resolve(s,c,next){if(s==='server-only')return{url:'data:text/javascript,export {}',shortCircuit:true};const f=s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;if(f&&existsSync(f+'.ts'))return next(pathToFileURL(f+'.ts').href,c);return next(s,c);}});
const {readPublicPricePage}=await import('../app/modules/marketplaces/services/public-price-page.ts');
const {readOriginPriceEvidence}=await import('../app/modules/marketplaces/price-origin-evidence.ts');hooks.deregister();
const urls=[
 'https://produto.mercadolivre.com.br/MLB-2757241089-calculadora-de-mesa-elgin-com-bobina-14-digitos-mb7142-_JM',
 'https://www.utiland.com.br/calculadora-elgin-mb-7142',
 'https://www.papelariatoledo.com.br/calculadora-de-impressao-14-dig-mb7142-rel-calen-bivol-elgin-unidade',
];
const report=await Promise.all(urls.map(async url=>{const start=Date.now();try{const page=await readPublicPricePage(url,AbortSignal.timeout(12000));return{url,bytes:page?.html.length||0,elapsedMs:Date.now()-start,evidence:page?readOriginPriceEvidence(page.html,page.url,{ean:null,productName:'Calculadora Elgin MB7142'}):null,microdata:page?[...page.html.matchAll(/<[^>]*(?:itemprop|itemscope|property=["'](?:og:|product:))[^>]*>/gi)].map(m=>m[0]).slice(0,55):[],structured:page?[...page.html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m=>{try{return JSON.parse(m[1]);}catch{return null;}}):[]};}catch(error){return{url,error:error.message};}}));
const out=process.argv.find(a=>a.startsWith('--report='))?.slice(9);if(out){if(!out.startsWith('/private/tmp/'))throw Error('Relatório deve ficar em /private/tmp/');writeFileSync(out,JSON.stringify(report,null,2),{mode:0o600});}
console.log(JSON.stringify(report,null,2));
