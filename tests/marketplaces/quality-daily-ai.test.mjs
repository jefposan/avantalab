import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
const root=resolve(import.meta.dirname,'../..');
const hook=registerHooks({resolve(s,c,next){const f=s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;if(f&&existsSync(f+'.ts'))return next(pathToFileURL(f+'.ts').href,c);return next(s,c);}});
const {groundedQualitySuggestions,qualityUsageCost}=await import('../../app/modules/marketplaces/quality-ai.ts');
const {qualitySummary}=await import('../../app/modules/marketplaces/quality-summary.ts');hook.deregister();
test('menor nota real, limiar estrito 70, desconhecido/stale e identidades de conta',()=>{
 const rows=[{connection_id:'a',listing_id:'MLB1',score:91,checked_at:new Date().toISOString()},{connection_id:'b',listing_id:'MLB1',score:69,checked_at:new Date().toISOString()}];
 assert.deepEqual(qualitySummary(rows,['a:MLB1','b:MLB1','c:MLB1']),{score:69,low:1,unknown:1,stale:false});
 rows[1].score=70;assert.equal(qualitySummary(rows,['b:MLB1']).low,0);rows[1].issue='temporário';assert.equal(qualitySummary(rows,['b:MLB1']).stale,true);
 assert.equal(qualitySummary(rows,['other:MLB1']).score,null);assert.equal(qualityUsageCost(6000,1500),11250);assert.equal(qualityUsageCost(-1,10),100000);
});
test('IA seleciona evidência, não inventa valores nem sobrescreve, rejeita conflito e unidade inválida',()=>{
 const rule=(id,extra={})=>({id,name:id,type:'string',value:'',valueId:null,editable:true,reason:'',required:false,maxLength:100,options:[],units:[],...extra});
 const editor={attributes:[rule('COLOR'),rule('GTIN',{editable:false}),rule('OLD',{value:'Salvar'}),rule('POWER',{type:'number_unit',units:['W']}),rule('SIZE'),rule('LIST',{type:'list',options:[{id:'red',name:'Vermelho'}]})]};
 const facts=[['COLOR','Azul'],['GTIN','123'],['OLD','Outro'],['POWER','1000 kg'],['SIZE','2 cm'],['SIZE','3 cm'],['LIST','Vermelho']].map(([field,value],i)=>({key:`f${i}`,field,name:field,value,source:'MLB123456'}));
 const result=groundedQualitySuggestions(editor,facts,['f0','f1','f2','f3','f4','f5','f6','forged']);assert.deepEqual(result.map(r=>[r.field,r.value]),[['COLOR','Azul'],['LIST','red']]);
 assert.throws(()=>groundedQualitySuggestions(editor,facts,{}));
});
async function setup(){const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;
create table empresas(id uuid primary key);create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text,status text);
create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);
create table usuarios_empresa(empresa_id uuid,user_id uuid,status text,perfil text);
create table marketplace_products(id uuid primary key,empresa_id uuid,archived_at timestamptz);
create table marketplace_listings(empresa_id uuid,connection_id uuid,provider_listing_id text,status text);`);await db.exec(readFileSync('supabase/migrations/20261024060000_marketplace_quality_daily_ai.sql','utf8'));await db.exec(readFileSync('supabase/migrations/20261024062000_marketplace_quality_numeric_receipt.sql','utf8'));return db;}
test('orçamento mensal atômico por empresa, idempotência/cache, recibo e reserva incerta',async()=>{
 const db=await setup();try{
 await db.exec(readFileSync('tests/fixtures/sql-historico/20261025170000_marketplace_quality_web_usage.sql','utf8'));
 const company=crypto.randomUUID(),actor=crypto.randomUUID(),product=crypto.randomUUID(),hash='a'.repeat(64),key=crypto.randomUUID();
 await db.query('insert into empresas values($1)',[company]);await db.query('insert into marketplace_products values($1,$2,null)',[product,company]);await db.query("insert into empresa_modulos values($1,'marketplaces',true,null)",[company]);await db.query("insert into usuarios_empresa values($1,$2,'ativo','operador_completo')",[company,actor]);
 const claim=async(h=hash,k=crypto.randomUUID(),who=actor)=>(await db.query('select marketplace_quality_ai_claim($1,$2,$3,$4,$5)r',[company,who,product,h,k])).rows[0].r;
 await assert.rejects(claim(hash,crypto.randomUUID(),crypto.randomUUID()),/permissão/);
 await assert.rejects(db.query('select marketplace_quality_ai_research_claim($1,$2,$3,$4,$5)',[company,crypto.randomUUID(),product,hash,crypto.randomUUID()]),/permissão/);
 assert.equal((await db.query("select has_function_privilege('authenticated','marketplace_quality_ai_research_claim(uuid,uuid,uuid,text,uuid)','execute')r")).rows[0].r,false);
 const webGate=(await db.query('select marketplace_quality_ai_research_claim($1,$2,$3,$4,$5)r',[company,actor,product,'f'.repeat(64),crypto.randomUUID()])).rows[0].r;assert.equal(webGate.researchPricingVersion,1);await db.query("select marketplace_quality_ai_finish($1,$2,$3,'completed','{}',$4)",[company,actor,webGate.id,JSON.stringify({inputTokens:0,outputTokens:0,webCalls:0})]);
 const first=await claim(hash,key);assert.equal(first.status,'claimed');assert.equal((await claim(hash,key)).status,'busy');
 await db.query("select marketplace_quality_ai_finish($1,$2,$3,'completed',$4,$5)",[company,actor,first.id,JSON.stringify({suggestions:[]}),JSON.stringify({inputTokens:6000,outputTokens:1500})]);
 assert.equal((await claim()).status,'cached');assert.equal((await db.query('select cost_microusd from marketplace_quality_ai_jobs where id=$1',[first.id])).rows[0].cost_microusd,11250);
 const web=await claim('d'.repeat(64));await db.query("select marketplace_quality_ai_finish($1,$2,$3,'completed',$4,$5)",[company,actor,web.id,'{}',JSON.stringify({inputTokens:6000,outputTokens:1500,webCalls:2})]);assert.equal(Number((await db.query('select cost_microusd from marketplace_quality_ai_jobs where id=$1',[web.id])).rows[0].cost_microusd),31250);
 const bad=await claim('e'.repeat(64));await db.query("select marketplace_quality_ai_finish($1,$2,$3,'failed',null,$4)",[company,actor,bad.id,JSON.stringify({inputTokens:1,outputTokens:1,webCalls:3})]);assert.equal(Number((await db.query('select cost_microusd from marketplace_quality_ai_jobs where id=$1',[bad.id])).rows[0].cost_microusd),100000);
 const next=await claim('b'.repeat(64));assert.equal(next.status,'claimed');await db.query("select marketplace_quality_ai_finish($1,$2,$3,'failed',null,null)",[company,actor,next.id]);
 assert.equal(Number((await db.query('select cost_microusd from marketplace_quality_ai_jobs where id=$1',[next.id])).rows[0].cost_microusd),100000);
 // Outra empresa e meses anteriores não gastam o orçamento atual.
 await db.exec("update marketplace_quality_ai_jobs set month=month-interval '1 month'");
 for(let n=0;n<50;n++){const job=await claim(n.toString(16).padStart(64,'0'));assert.equal(job.status,'claimed');await db.query("select marketplace_quality_ai_finish($1,$2,$3,'failed',null,null)",[company,actor,job.id]);}
 assert.equal((await claim('c'.repeat(64))).status,'limited');
 assert.equal((await db.query("select has_function_privilege('authenticated','marketplace_quality_ai_claim(uuid,uuid,uuid,text,uuid)','execute')r")).rows[0].r,false);
 }finally{await db.close();}
});
test('fila diária, leases, tenant e última nota preservada em falha, leitura antiga não sobrescreve',async()=>{
 const db=await setup();try{
 const c=crypto.randomUUID(),a=crypto.randomUUID(),owner=crypto.randomUUID();await db.query('insert into empresas values($1)',[c]);await db.query("insert into marketplace_connections values($1,$2,'mercado_livre','connected')",[a,c]);await db.query("insert into empresa_modulos values($1,'marketplaces',true,null)",[c]);await db.query("insert into marketplace_listings values($1,$2,'MLB123456','active')",[c,a]);
 const claim=async()=>(await db.query('select marketplace_quality_claim($1)r',[owner])).rows[0].r;
 assert.equal((await claim()).length,1);assert.equal((await claim()).length,0);
 const save=async(quality,checkedAt=new Date().toISOString(),issue=null)=>db.query('select marketplace_quality_save($1,$2,$3,$4,$5)',[c,a,'MLB123456',JSON.stringify({quality,checkedAt}),issue]);
 await save([{entityType:'ITEM',score:65}]);await save([{entityType:'ITEM',score:null}],new Date(Date.now()+1).toISOString(),'Indisponível');
 let row=(await db.query('select * from marketplace_listing_quality')).rows[0];assert.equal(row.score,'65');assert.ok(row.result);assert.equal(row.issue,'Indisponível');assert.equal((await claim()).length,0);
 await save([{entityType:'ITEM',score:10}],'2020-01-01T00:00:00Z');row=(await db.query('select * from marketplace_listing_quality')).rows[0];assert.equal(row.score,'65');
 await assert.rejects(db.query('select marketplace_quality_save($1,$2,$3,$4,null)',[crypto.randomUUID(),a,'MLB123456',JSON.stringify({quality:[],checkedAt:new Date().toISOString()})]),/Conta inválida/);
 }finally{await db.close();}
});
test('abertura não aciona IA: revisão explícita e aplicação pelos validadores existentes',()=>{
 const ui=readFileSync('app/marketplaces/QualityAIReview.tsx','utf8');assert.doesNotMatch(ui,/useEffect/);assert.match(ui,/!reviewed/);assert.match(ui,/onlyMissing:true/);
 const service=readFileSync('app/modules/marketplaces/services/quality-ai.ts','utf8');assert.match(service,/researchQualityFacts/);assert.doesNotMatch(service,/gpt-5\.5|saveListingContent|saveCommonMercadoLivreEditor/);
 const research=readFileSync('app/modules/marketplaces/services/quality-web-research.ts','utf8');assert.match(research,/model:'gpt-5\.4-mini'/);assert.match(research,/max_tool_calls:2/);assert.match(research,/type:'web_search'/);
 const crons=JSON.parse(readFileSync('vercel.json','utf8')).crons;assert.equal(crons.filter(c=>c.path==='/api/cron/marketplace-quality').length,1);
});
test('confirmação da IA sem custos internos e preparação separada das restrições de envio',()=>{
 const ui=readFileSync('app/marketplaces/QualityAIReview.tsx','utf8');assert.match(ui,/Completar com IA\?/);assert.match(ui,/Será utilizada uma pequena parte da sua cota mensal/);assert.doesNotMatch(ui,/US\$|GPT|reservedUsd|Orçamento mensal/);assert.match(ui,/common_partial/);assert.match(ui,/Restrições de envio ao Mercado Livre/);
 const service=readFileSync('app/modules/marketplaces/services/quality-ai.ts','utf8');assert.doesNotMatch(service,/quality_locked/);assert.match(service,/'attributes',input.sourceConnectionId,input.sourceId,true/);assert.match(service,/restrictions/);assert.match(service,/marketplace_quality_ai_research_claim/);assert.match(service,/marketplace_quality_ai_finish/);
 const send=readFileSync('app/modules/marketplaces/services/listing-content.ts','utf8');assert.match(send,/if\(editor.reason\)throw new MarketplaceError/);assert.match(send,/contentAttributes\(result.schema,result.item.attributes\)/);
});
