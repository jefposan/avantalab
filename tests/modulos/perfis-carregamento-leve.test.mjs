import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, deps = {}, globals = {}) {
  const exports = {};
  const process = { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://teste.invalid', SUPABASE_SERVICE_ROLE_KEY: 'service-ficticio' } };
  vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'), { compilerOptions: { module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX } }).outputText,
    { exports,process,Request,Response,URL,URLSearchParams,AbortSignal,console,require: id => { if (!(id in deps)) throw Error('Dependência não simulada: '+id); return deps[id]; },...globals });
  return exports;
}
const plain = value => JSON.parse(JSON.stringify(value));
const batch = load('app/lib/consultas-por-ids-servidor.ts');
const plans = load('app/lib/planos-comerciais.ts');
const billing = load('app/lib/cobranca.ts');
const flow = load('app/lib/cobranca-fluxo.ts');
const registry = load('app/lib/modulos-registro.ts', { './planos-comerciais':plans });
const access = load('app/lib/acessos-usuario.ts', { './modulos-registro':registry });
class NextResponse extends Response { static json(body,opts) { return new NextResponse(JSON.stringify(body),opts); } }

function database(rows, { fail = '', authError = null } = {}) {
  const calls = [];
  const db = { calls,rows,auth:{getUser:async token => ({data:{user:authError || !token ? null : {id:'u'}},error:authError || (!token ? {status:401}:null)})},from(table) {
    const filters = [], sorts = []; let columns = '', first = 0, last = Infinity;
    const run = single => {
      calls.push({table,columns,first,last});
      if (fail === table) return { data:null,error:{message:'indisponível'} };
      let result = (rows[table] || []).filter(row => filters.every(f => f(row)));
      if (sorts.length) result = [...result].sort((a,b) => { for (const key of sorts) { const cmp=String(a[key]).localeCompare(String(b[key])); if(cmp) return cmp; } return 0; });
      result = result.slice(first,last+1).map(row => Object.fromEntries(columns.split(',').map(k => [k.trim(),row[k.trim()]])));
      return {data:single ? result[0] || null : result,error:null};
    };
    const q = {select(c){columns=c;return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},neq(k,v){filters.push(r=>r[k]!==v);return q;},in(k,vs){filters.push(r=>vs.includes(r[k]));return q;},order(k){sorts.push(k);return q;},range(a,b){first=a;last=b;return q;},maybeSingle:async()=>run(true),then(resolve,reject){return Promise.resolve(run(false)).then(resolve,reject);}};
    return q;
  }};
  return db;
}
function resolver(db) {
  return load('app/lib/cobranca-servidor.ts', {
    '@supabase/supabase-js':{createClient:()=>db},'./sessao-perfil':{},'./cobranca':{...billing,DATA_LANCAMENTO:'2026-01-01'},
    './conta-revisao':{},'./cobranca-fluxo':flow,'./planos-comerciais':plans,'./perfis-quota':{},'./consultas-por-ids-servidor':batch,
  });
}
function api(rows, opts = {}) {
  const db = database(rows,opts);
  const server = resolver(db);
  const route = load('app/api/acessos-usuario/route.ts', {
    'next/server':{NextResponse},'@supabase/supabase-js':{createClient:()=>db},'@/app/lib/modulos-registro':registry,
    '@/app/lib/acessos-usuario':access,'@/app/lib/cobranca':{...billing,COBRANCA_ATIVA:opts.paid ?? true},
    '@/app/lib/cobranca-servidor':server,'@/app/lib/consultas-por-ids-servidor':batch,
  });
  return {db,get:(query='',token='token-ficticio')=>route.GET(new Request('https://teste/api/acessos-usuario'+query,{headers:token?{authorization:'Bearer '+token}:{}}))};
}
function fixture(n = 7) {
  const rows = {usuarios_empresa:[],empresas:[],configuracoes:[],empresa_modulos:[],assinaturas:[],assinaturas_perfis_adicionais:[],projetos_compartilhamentos:[]};
  for (let i=0;i<n;i++) {
    const id='e'+i;
    rows.usuarios_empresa.push({id:'v'+i,user_id:'u',empresa_id:id,nome:'Teste',perfil:'administrador',status:'ativo',dashboard_liberada:true,modulos_liberados:['custos','projetos']});
    rows.empresas.push({id,nome:id,tipo_perfil:'empresa',created_at:'2026-02-01',assinatura_origem_empresa_id:null});
    rows.configuracoes.push({empresa_id:id,cor_primaria:'#123456',dark_mode:true,logo_url:'data:image/png;base64,'+'A'.repeat(100_000)});
    rows.empresa_modulos.push({empresa_id:id,modulo_id:'custos',ativo:true,expira_em:null},{empresa_id:id,modulo_id:'projetos',ativo:false,expira_em:null});
    rows.assinaturas.push({empresa_id:id,tipo_perfil:'empresa',status:'ativa',valido_ate:null,trial_fim:null,plano:'business',ciclo:'mensal'});
  }
  return rows;
}

test('sete perfis usam seis consultas, sem ler/transferir logos na listagem leve',async()=>{
  const a=api(fixture()); const response=await a.get('?logos=adiadas');
  assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'no-store');
  const body=await response.json(); assert.equal(body.perfis.length,7);
  assert.equal(a.db.calls.length,6);
  for(const table of ['empresas','configuracoes','empresa_modulos','assinaturas']) assert.equal(a.db.calls.filter(c=>c.table===table).length,1,table);
  assert.ok(a.db.calls.filter(c=>c.table==='configuracoes').every(c=>!c.columns.includes('logo_url')));
  for(const p of body.perfis) {assert.equal(p.empresa.logoAdiada,true);assert.equal(p.empresa.logoUrl,undefined);assert.equal(p.empresa.created_at,undefined);assert.deepEqual(p.modulos.map(m=>m.id),['custos']);}
  assert.ok(JSON.stringify(body).length<10000);
});

test('contrato legado mantém imagens; selecionado busca somente sua imagem; Dashboard evita leitura duplicada',async()=>{
  const rows=fixture(); const a=api(rows);
  const old=await (await a.get()).json(); assert.ok(JSON.stringify(old).length>700000);
  const selected=await (await a.get('?empresaId=e0')).json(); assert.equal(selected.perfis.length,1);assert.equal(selected.perfis[0].empresa.logoUrl,rows.configuracoes[0].logo_url);
  const dashboard=await (await a.get('?empresaId=e0&logos=dashboard')).json();assert.equal(dashboard.perfis[0].empresa.logoAdiada,true);
  rows.usuarios_empresa[0].dashboard_liberada=false;
  const restricted=await (await a.get('?empresaId=e0&logos=dashboard')).json();assert.equal(restricted.perfis[0].empresa.logoUrl,rows.configuracoes[0].logo_url);assert.equal(restricted.perfis[0].dashboard,false);
});

test('agrupamento não herda concessão, papel, assinatura ou módulos de outra empresa e relê revogação',async()=>{
  const rows=fixture(5);
  rows.usuarios_empresa[0].dashboard_liberada=false;
  rows.usuarios_empresa[0].modulos_liberados=[];
  rows.usuarios_empresa[1].perfil='operador_simples';rows.usuarios_empresa[1].modulos_liberados=['ponto'];
  rows.empresa_modulos.push({empresa_id:'e1',modulo_id:'ponto',ativo:true,expira_em:null},{empresa_id:'e2',modulo_id:'projetos',ativo:true,expira_em:'2000-01-01'},{empresa_id:'e2',modulo_id:'vendas',ativo:true,expira_em:'inválida'});
  rows.assinaturas[2].status='expirada';
  rows.usuarios_empresa[3].status='bloqueado';rows.usuarios_empresa[4].perfil='funcionario_ponto';
  rows.usuarios_empresa.push({...rows.usuarios_empresa[0],user_id:'outro',empresa_id:'alheia'});
  const a=api(rows);let body=await (await a.get('?logos=adiadas')).json();
  assert.deepEqual(body.perfis.map(p=>p.empresa.id),['e0','e1','e2']);
  assert.equal(body.perfis[0].dashboard,false);assert.deepEqual(body.perfis[0].modulos,[]);assert.deepEqual(body.perfis[1].modulos,[]);assert.equal(body.perfis[2].planoAtivo,false);assert.deepEqual(body.perfis[2].modulos,[]);
  rows.usuarios_empresa[0].status='bloqueado';
  body=await (await a.get('?empresaId=e0')).json();assert.deepEqual(body.perfis,[]);
  assert.deepEqual((await (await a.get('?empresaId=alheia')).json()).perfis,[]);
});

test('falha e sessão inválida nunca viram lista autorizada; compartilhamento de projetos conserva regra anterior',async()=>{
  for(const table of ['usuarios_empresa','empresas','configuracoes','empresa_modulos','assinaturas','projetos_compartilhamentos']) assert.equal((await api(fixture(),{fail:table}).get()).status,503,table);
  assert.equal((await api(fixture()).get('','')).status,401);
  assert.equal((await api(fixture(),{authError:{name:'AuthRetryableFetchError',status:503}}).get()).status,503);
  const rows=fixture(1);rows.assinaturas[0].status='expirada';
  rows.projetos_compartilhamentos.push({user_id:'u',empresa_id:'origem',situacao:'ativo'});
  rows.empresa_modulos.push({empresa_id:'origem',modulo_id:'projetos',ativo:true,expira_em:null});
  let body=await (await api(rows).get('?logos=adiadas')).json();assert.deepEqual(body.perfis[0].modulos.map(m=>m.id),['projetos']);
  rows.usuarios_empresa[0].modulos_liberados=['custos'];body=await (await api(rows).get()).json();assert.deepEqual(body.perfis[0].modulos,[]);
});

test('resolvedor em lote produz exatamente os estados do resolvedor individual, inclusive origens e adicionais',async()=>{
  const rows=fixture(10);
  const statuses=['ativa','trial','trial','cortesia','cancelada','inadimplente','expirada'];
  rows.assinaturas.forEach((s,i)=>{s.status=statuses[i%statuses.length];s.trial_fim=i===1?'2999-01-01':'2000-01-01';s.valido_ate=i===5?'2999-01-01':null;});
  rows.empresas[7].tipo_perfil='pessoal';rows.empresas[7].assinatura_origem_empresa_id='e0';
  rows.empresas[8].assinatura_origem_empresa_id='e0';rows.assinaturas_perfis_adicionais.push({empresa_id:'e8',status:'pendente',valido_ate:null});
  rows.empresas[9].assinatura_origem_empresa_id='sem-assinatura';
  rows.empresas.push({id:'legado',tipo_perfil:'empresa',created_at:'2020-01-01',assinatura_origem_empresa_id:null},{id:'novo',tipo_perfil:'empresa',created_at:'2026-02-01',assinatura_origem_empresa_id:null});
  const db=database(rows);const server=resolver(db);const grouped=await server.resolverEstadosAcessoEmLote(db,rows.empresas);
  assert.equal(db.calls.length,2);
  for(const e of rows.empresas) assert.deepEqual(plain(grouped.get(e.id)),plain(await server.resolverEstadoAcesso(e.id)),e.id);
  assert.equal(grouped.get('e7').plano,'pessoal_premium');assert.equal(grouped.get('e8').status,'expirada');
  rows.assinaturas[0].status='expirada';const fresh=await server.resolverEstadosAcessoEmLote(db,rows.empresas);assert.equal(fresh.get('e0').status,'expirada');
});

test('cobrança desligada não lê assinaturas; duplicidade não escolhe uma concessão por acaso',async()=>{
  const a=api(fixture(),{paid:false,fail:'assinaturas'});const body=await (await a.get('?logos=adiadas')).json();
  assert.ok(body.perfis.every(p=>p.planoAtivo));assert.equal(a.db.calls.some(c=>c.table==='assinaturas'),false);
  for(const table of ['assinaturas','configuracoes']) {
    const rows=fixture(1);rows[table].push({...rows[table][0]});assert.equal((await api(rows).get()).status,503,table);
  }
});

test('lotes limitam IDs e paginam sem truncar instalações acima de mil linhas',async()=>{
  const ids=Array.from({length:205},(_,i)=>'e'+i);const rows={empresa_modulos:ids.flatMap(empresa_id=>Array.from({length:11},(_,i)=>({empresa_id,modulo_id:'m'+i})))};
  const db=database(rows);const result=await batch.consultarPorIds(db,'empresa_modulos','empresa_id,modulo_id','empresa_id',[...ids,ids[0]],'modulo_id');
  assert.equal(result.length,2255);assert.equal(db.calls.length,5);assert.ok(db.calls.every(c=>c.last-c.first===999));
});

function client({selected=null,fetcher}={}) {
  const states=[[],selected,false,'',''];let cursor=0,stored=0;const effects=[];
  const React={useState(initial){const i=cursor++;if(states[i]===undefined)states[i]=initial;return[states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useEffect(fn){effects.push(fn);},useSyncExternalStore(){return null;}};
  const mod=load('app/modulos/MeusModulos.tsx',{
    react:React,'react/jsx-runtime':{jsx:()=>null,jsxs:()=>null},'next/navigation':{useRouter:()=>({})},'@/app/lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session:{access_token:'ficticio',user:{id:'u'}}}})}}},
    '@/app/lib/acessos-usuario':{},'@/app/lib/sessao-acesso-cliente':{},'@/app/lib/retorno-modulos':{guardarPreviaModulos:()=>stored++},'@/app/lib/navegacao-modulos':{},'@/app/lib/modulos-registro':registry,'@/app/components/TelaCarregandoAcesso':{},'@/app/components/SelecaoModulos':{},
  },{fetch:fetcher});
  return {mod,states,effects,stored:()=>stored};
}
const profile=()=>({empresa:{id:'e0',nome:'Teste',corPrimaria:'#123456',temaEscuro:false,logoAdiada:true},nomeUsuario:'Teste',perfil:'administrador',dashboard:true,planoAtivo:true,modulos:[{id:'custos'}]});

test('cliente pede listas leves e nunca recupera concessões antigas ao preservar somente uma logo',async()=>{
  const urls=[];const c=client({fetcher:async url=>{urls.push(url);return Response.json({perfis:[]});}});
  await c.mod.buscarAcessosUsuario();await c.mod.buscarAcessosUsuario('e0');await c.mod.buscarAcessosUsuario('e0',{logoAposDashboard:true});
  assert.equal(new URL(urls[0],'https://teste').searchParams.get('logos'),'adiadas');assert.equal(new URL(urls[1],'https://teste').searchParams.get('empresaId'),'e0');assert.equal(new URL(urls[1],'https://teste').searchParams.has('logos'),false);assert.equal(new URL(urls[2],'https://teste').searchParams.get('logos'),'dashboard');
  const old=profile();old.empresa={...old.empresa,logoUrl:'imagem',logoAdiada:false};
  const fresh={...profile(),dashboard:false,planoAtivo:false,modulos:[]};
  const merged=c.mod.preservarLogoPerfil(fresh,old);assert.equal(merged.empresa.logoUrl,'imagem');assert.equal(merged.dashboard,false);assert.equal(merged.planoAtivo,false);assert.equal(merged.modulos.length,0);
  assert.equal(c.mod.preservarLogoPerfil({...fresh,empresa:{...fresh.empresa,id:'outra'}},old).empresa.logoUrl,undefined);
});

test('imagem atrasada não restaura permissões nem grava prévia após troca de perfil',async()=>{
  for(const cancel of [false,true]) {
    let finish;const pending=new Promise(resolve=>{finish=resolve;});
    const c=client({selected:profile(),fetcher:()=>pending});c.mod.default();const cleanup=c.effects[0]();
    c.states[1]=cancel?{...profile(),empresa:{...profile().empresa,id:'outra'}}:{...profile(),dashboard:false,modulos:[]};
    if(cancel)cleanup();
    finish(Response.json({perfis:[{...profile(),empresa:{...profile().empresa,logoUrl:'imagem',logoAdiada:false}}]}));
    await new Promise(setImmediate);
    assert.equal(c.stored(),0);
    if(cancel){assert.equal(c.states[1].empresa.id,'outra');assert.equal(c.states[1].empresa.logoUrl,undefined);}
    else{assert.equal(c.states[1].dashboard,false);assert.equal(c.states[1].modulos.length,0);assert.equal(c.states[1].empresa.logoUrl,'imagem');}
  }
});
