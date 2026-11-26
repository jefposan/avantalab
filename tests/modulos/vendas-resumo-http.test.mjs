import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import ts from 'typescript';import {readFileSync} from 'node:fs';
import {resolveModuleEffectivePermissions} from '../../app/vendas/lib/server/avantalab-module-access.mjs';
import {buildCommercialOverview,validOverviewPeriod} from '../../app/vendas/lib/server/commercial-overview.mjs';
const source=readFileSync('app/api/modulos/vendas/commercial/overview/route.ts','utf8');
const company='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
function harness({authenticated=true,active=true,roles=[],users=[],operations=[]}={}){
 const reads=[];
 const rows={empresas:[{id:company,tipo_perfil:'empresa'}],empresa_modulos:[{empresa_id:company,modulo_id:'vendas',ativo:active,expira_em:null}],module_role_permission_overrides:roles,module_user_permission_overrides:users,vendas_operacoes:operations,vendas_contas_receber:[],vendas_operacao_itens:[],vendas_ordens_servico:[]};
 const db={from(table){const filters=[];const query={select(){return query},eq(key,value){filters.push([key,value]);return query},in(key,values){filters.push([key,values]);return query},order(){return query},maybeSingle(){return Promise.resolve({data:result()[0]||null,error:null})},range(from,to){reads.push({table,filters:[...filters],from,to});return Promise.resolve({data:result().slice(from,to+1),error:null})},then(resolve,reject){return Promise.resolve({data:result(),error:null}).then(resolve,reject)}};
  function result(){return (rows[table]||[]).filter(row=>filters.every(([key,value])=>row[key]===undefined?true:Array.isArray(value)?value.includes(row[key]):row[key]===value));}return query;}};
 const env={exports:{},Response,URL,Date,Intl,Error,Promise,process:{env:{}},require(name){if(name==='next/server')return {NextResponse:{json:(body,options)=>Response.json(body,options)}};if(name.includes('cobranca-servidor'))return {autenticarPerfilCobranca:async(_req,id)=>authenticated&&id===company?{db,usuario:{id:'actor'},vinculo:{perfil:'gestor_master'}}:null,resolverEstadoAcesso:async()=>({})};if(name.endsWith('/cobranca'))return {COBRANCA_ATIVA:false,assinaturaVigente:()=>true};if(name.includes('modulos-disponibilidade'))return {moduloDisponivelParaEmpresa:()=>true};if(name.includes('avantalab-module-access'))return {resolveModuleEffectivePermissions};if(name.includes('commercial-overview'))return {buildCommercialOverview,validOverviewPeriod};throw Error(name);}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,env);
 return {reads,get:(id=company,start='2026-11-01',end='2026-11-30')=>env.exports.GET(new Request(`http://localhost:3000/api/modulos/vendas/commercial/overview?companyId=${id}&start=${start}&end=${end}`))};
}
test('HTTP nega sessão, empresa diferente, módulo inativo e override, antes de consultar valores',async()=>{
 for(const options of [{authenticated:false},{active:false},{roles:[{permission_code:'dashboard.view',decision:'deny'}]}]){const h=harness(options),response=await h.get();assert.equal(response.status,403);assert.equal(h.reads.length,0);}
 const h=harness();assert.equal((await h.get(other)).status,403);assert.equal(h.reads.length,0);assert.equal((await h.get(company,'2026-02-30')).status,400);
});
test('HTTP pagina a projeção mínima, isola empresa e retira custos negados no servidor',async()=>{
 const operations=Array.from({length:1001},(_,i)=>({id:`op-${i}`,empresa_id:company,tipo:'pedido',situacao:'faturado',total:1,criado_em:'2026-11-02T12:00:00Z'}));
 operations.push({id:'foreign',empresa_id:other,tipo:'pedido',situacao:'faturado',total:999999,criado_em:'2026-11-02T12:00:00Z'});
 const h=harness({operations,users:[{permission_code:'catalog.view_cost',decision:'deny'}]}),response=await h.get(),data=await response.json();
 assert.equal(response.status,200);assert.equal(data.summary.revenue,1001);assert.equal(data.summary.counts.orders,1001);assert.equal('cost' in data.summary,false);assert.equal(JSON.stringify(data).includes('op-'),false);
 const pages=h.reads.filter(row=>row.table==='vendas_operacoes');assert.deepEqual(pages.map(row=>row.from),[0,1000]);for(const read of h.reads)assert.ok(read.filters.some(([key,value])=>key==='empresa_id'&&value===company));
 assert.equal(h.reads.some(row=>row.table==='vendas_operacao_itens'),false);
});
