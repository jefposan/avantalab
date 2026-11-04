import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
const hooks = registerHooks({ resolve(specifier, context, next) {
  let file;
  if (specifier.startsWith('@/')) file = resolve(specifier.slice(2));
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) file = resolve(dirname(new URL(context.parentURL).pathname), specifier);
  if (file && existsSync(`${file}.ts`)) return next(pathToFileURL(`${file}.ts`).href, context);
  return next(specifier, context);
} });
const { consultLotPrice } = await import('../../app/marketplaces/price-lot-consultation.ts');
hooks.deregister();
const companyId = '00000000-0000-4000-8000-000000000001', code = '7891129598607';
const signal = () => new AbortController().signal;

test('leitor web reaproveita referência salva da mesma empresa sem pesquisa externa', async () => {
  const calls = [];
  const result = await consultLotPrice({ companyId, code, signal:signal(), request: async (path, options) => {
    calls.push({path,options}); return { result:{historyId:'saved-price',localProductId:'same-product',localProductRevision:1,product:{name:'Produto salvo'},prices:{market:100,minimum:50,medium:70,ideal:90}} };
  }});
  assert.equal(result.historyId,'saved-price'); assert.equal(result.prices.minimum,50);
  assert.equal(calls.length,1); assert.equal(calls[0].path,'/api/modulos/marketplaces/precos/produto'); assert.equal(calls[0].options.method,'POST');assert.deepEqual(JSON.parse(calls[0].options.body),{empresaId:companyId,ean:code});assert.equal(result.localProductId,'same-product');
});
test('leitor web continua a mesma tarefa; candidatos não criam nova leitura', async () => {
  const bodies = []; let posts = 0;
  const result = await consultLotPrice({companyId,code,signal:signal(),pause:async()=>{},request:async(path,options)=>{
    if (path.endsWith('/produto')) return {result:null};
    bodies.push(JSON.parse(options.body));posts++;
    return posts===1 ? {result:{status:'found'},continuation:{opaque:'same-task'}} : {result:{status:'found',historyId:'new-price',product:{name:'Produto'},prices:{market:100,minimum:50,medium:70,ideal:90}}};
  }});
  assert.equal(result.historyId,'new-price');assert.equal(bodies.length,2);
  assert.deepEqual(bodies[0],{empresaId:companyId,ean:code});assert.deepEqual(bodies[1],{continuation:{opaque:'same-task'}});
  const chosen = [];
  const choice = await consultLotPrice({companyId,code,productId:'MLB123',signal:signal(),request:async(path,options)=>{chosen.push(JSON.parse(options.body));return{result:{status:'choose',candidates:[{id:'MLB456',name:'Candidato'}]}}}});
  assert.equal(choice.result.status,'choose');assert.equal(chosen.length,1);assert.equal(chosen[0].productId,'MLB123');
});
test('leitor web trata não encontrado, falha, cancelamento e tempo limite sem preço zero fictício', async () => {
  const notFound = await consultLotPrice({companyId,code,signal:signal(),request:async(path)=>path.endsWith('/produto')?{result:null}:{result:{status:'not_found'}}});
  assert.equal(notFound.result.status,'not_found');assert.equal(notFound.prices,undefined);
  await assert.rejects(consultLotPrice({companyId,code,signal:signal(),request:async()=>{throw new Error('Rede indisponível')}}),/Rede/);
  const abort = new AbortController();abort.abort();let called=false;
  await assert.rejects(consultLotPrice({companyId,code,signal:abort.signal,request:async()=>{called=true}}));assert.equal(called,false);
  let clock=0;
  await assert.rejects(consultLotPrice({companyId,code,signal:signal(),now:()=>clock,pause:async()=>{clock=180001},request:async(path)=>path.endsWith('/produto')?{result:null}:{result:{status:'found'},continuation:'same'}}),/permanece salva sem preço/);
});
test('web e PWA usam os mesmos lotes, autorização, histórico e conferência', () => {
  const web = readFileSync('app/marketplaces/MarketplacesClient.tsx','utf8'), pwa = readFileSync('app/marketplaces/consulta/MarketplaceMobileApp.tsx','utf8'), reader = readFileSync('app/marketplaces/PriceLotWebReader.tsx','utf8');
  for (const source of [web,pwa]) { assert.match(source,/usePriceLotCapture\(/);assert.match(source,/<PriceLotsPanel/);assert.match(source,/onActivate=/); }
  const tools=readFileSync('app/marketplaces/PriceToolsActions.tsx','utf8');
  const create=tools.indexOf('>Criar Lote</BotaoAcaoCompacto>'),edit=tools.indexOf('>Editar Lotes</BotaoAcaoCompacto>'),settings=tools.indexOf('aria-label="Configurações do AvantaPreços"');
  assert.ok(create>0&&create<edit&&edit<settings);
  assert.match(web,/onCreate=\{\(\) => setPriceLotsPanel\(\{ create: true \}\)\}/);assert.match(web,/onEdit=\{\(\) => setPriceLotsPanel\(\{\}\)\}/);
  assert.match(web,/signal \|\| undefined/);assert.match(web,/initialId=\{priceLotsPanel.id\}/);
  assert.match(reader,/Ler EAN por aparelho/);assert.match(reader,/type="submit"/);assert.match(reader,/pending.current.code === value/);
  assert.ok(!reader.includes('Leitor ativo. Bipe'));
  assert.match(reader,/aria-pressed=\{armed\}/);
  assert.match(reader,/await resolve\(pending.current!.read, next.historyId\)/);
  assert.ok(!reader.includes("addEventListener('keydown'"),'o leitor não intercepta campos globais de outras áreas');
});
