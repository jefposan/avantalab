import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createSimulationRequest, preparationFixture, SIMULATION_ACCOUNT, SIMULATION_COMPANY } from '../../app/marketplaces/simulacao-preparo/fixture.ts';
import { publicationErrors } from '../../app/modules/marketplaces/services/catalog-publication.ts';

// Cada arquivo roda isolado. Somente estes testes usam o ambiente de teste;
// o caso de produção abaixo continua exercitando e exigindo o bloqueio real.
const originalEnvironment = process.env.NODE_ENV;
beforeEach(() => { process.env.NODE_ENV = 'test'; });
afterEach(() => {
  if (originalEnvironment === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnvironment;
});

const input = () => ({ empresaId: SIMULATION_COMPANY, connectionId: SIMULATION_ACCOUNT, requestKey: 'tentativa-ficticia', form: preparationFixture().form });

test('exemplo fictício satisfaz as validações reais e não carrega fotos externas', () => {
  const { result, form } = preparationFixture();
  assert.deepEqual(publicationErrors(form, result), {});
  assert.equal(result.product.picture, '/images/simulacao-ventilador.svg');
  assert.deepEqual(result.product.pictures, []);
  form.price=1;assert.equal(preparationFixture().form.price,198.90);
});

test('simulador prepara, cota frete e confirma somente em memória, com idempotência', async () => {
  const request = createSimulationRequest('success');
  for(const path of ['preparar','produtos/preparar','preparar-copia']) assert.equal((await request(path,input())).result.product.id,'SIMULACAO-PRODUTO');
  const data=input();data.form.freeShipping=true;
  const {quote}=await request('publicar/frete',data);
  assert.equal(quote.sellerCost,24.90);assert.match(quote.notice,/fictícia/);
  assert.match(quote.token,/sem-validade-real/);
  const first=await request('publicar',data);
  assert.equal(first.status,'published');assert.equal(await request('publicar',data),first);
});

test('simulador recusa rotas, empresas, contas e métodos fora do teste sem fallback', async () => {
  const request=createSimulationRequest('success');
  await assert.rejects(request('conexoes',input()),/não prevista/);
  await assert.rejects(request('publicar',{...input(),empresaId:'real'}),/bloqueada/);
  await assert.rejects(request('publicar',{...input(),connectionId:'real'}),/bloqueada/);
  await assert.rejects(request('publicar',input(),undefined,'DELETE'),/bloqueada/);
  await assert.rejects(request('publicar',{...input(),requestKey:''}),/chave/);
  const controller=new AbortController();controller.abort();
  await assert.rejects(request('preparar',input(),controller.signal),{name:'AbortError'});
});

for(const [scenario,code] of [['rejected','invalid_fields'],['uncertain','publication_uncertain']]) test(`cenário ${scenario} mantém contrato de erro do formulário`,async()=>{
  await assert.rejects(createSimulationRequest(scenario)('publicar',input()),error=>{
    assert.equal(error.code,code);
    if(scenario==='rejected')assert.ok(error.fields.warrantyTime);
    return true;
  });
});

test('página só renderiza em desenvolvimento e adaptador recusa produção', async () => {
  const source=readFileSync('app/marketplaces/simulacao-preparo/page.tsx','utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  for(const environment of ['production','test','development']){
    const exported={};
    vm.runInNewContext(compiled,{exports:exported,process:{env:{NODE_ENV:environment}},require(name){
      if(name==='next/navigation')return{notFound(){throw new Error('404');}};
      if(name==='./preview')return{default:'preview'};
      if(name==='react/jsx-runtime')return{jsx:type=>type};
      throw new Error(name);
    }});
    if(environment==='development')assert.equal(exported.default(),'preview');
    else assert.throws(()=>exported.default(),/404/);
  }
  const environment=process.env.NODE_ENV;
  try{process.env.NODE_ENV='production';await assert.rejects(createSimulationRequest('success')('publicar',input()),/indisponível em produção/);}
  finally{if(environment===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=environment;}
});

test('adaptador não importa cliente real e todo request do formulário/frete é substituível',()=>{
  const fixture=readFileSync('app/marketplaces/simulacao-preparo/fixture.ts','utf8');
  assert.doesNotMatch(fixture,/\bfetch\s*\(|supabase|localStorage|sessionStorage/);
  assert.match(fixture,/import type \{ marketplaceClientRequest \}/);
  const form=readFileSync('app/marketplaces/NewListing.tsx','utf8');
  assert.doesNotMatch(form,/marketplaceClientRequest\(/);
  assert.match(form,/<PublicationShipping[^>]*request=\{request\}/);
  const shipping=readFileSync('app/marketplaces/PublicationShipping.tsx','utf8');
  assert.doesNotMatch(shipping,/marketplaceClientRequest\(/);
  assert.match(shipping,/request\('publicar\/frete'/);
});
