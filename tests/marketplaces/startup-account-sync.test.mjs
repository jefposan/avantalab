import test from 'node:test';
import assert from 'node:assert/strict';
import {createStartupAccountSync} from '../../app/marketplaces/startup-account-sync.ts';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const account=(id,provider='mercado_livre',status='connected')=>({id,provider,status});
test('abertura percorre todas as contas, pagina até concluir e atualiza vendas após cada uma; render/filtro não repete',async()=>{
 const calls=[],pages=new Map(),errors=[];
 const sync=createStartupAccountSync('company',async(path,body,signal)=>{assert.ok(signal instanceof AbortSignal);calls.push({path,body});if(body){assert.equal(body.empresaId,'company');const n=(pages.get(body.connectionId)||0)+1;pages.set(body.connectionId,n);return{complete:n===3};}return{sales:[]};},(...e)=>errors.push(e));
 sync.update([account('a'),account('b','magalu'),account('offline','mercado_livre','expired')]);await tick();
 assert.deepEqual(calls.map(c=>c.body?.connectionId||new URL('https://local/'+c.path).searchParams.get('connectionId')),['a','a','a','a','b','b','b','b']);assert.equal(errors.length,0);
 sync.update([account('b','magalu'),account('a')]);await tick();assert.equal(calls.length,8);
 sync.update([account('a'),account('new')]);await tick();assert.equal(pages.get('new'),3);
 pages.set('a',0);sync.update([{...account('a'),connected_at:'new-oauth'},account('new')]);await tick();assert.equal(pages.get('a'),3,'nova autorização da mesma conta sincroniza novamente');sync.stop();
});
test('falha isolada não impede próxima conta nem dispara vendas da conta sem anúncios confirmados',async()=>{
 const sales=[],errors=[];const sync=createStartupAccountSync('company',async(path,body)=>{if(body){if(body.connectionId==='a')throw Error('timeout');return{complete:true};}sales.push(path);return{};},(...e)=>errors.push(e));
 sync.update([account('a'),account('b')]);await tick();assert.equal(errors.length,1);assert.equal(errors[0][0],'a');assert.equal(sales.length,1);assert.match(sales[0],/connectionId=b/);sync.stop();
});
test('cleanup antes da microtask não inicia consultas; desconectar cancela conta e reconectar agenda novamente',async()=>{
 let calls=0;const discarded=createStartupAccountSync('old',async()=>{calls++;return{complete:true};},()=>{});discarded.update([account('a')]);discarded.stop();await tick();assert.equal(calls,0);
 let signal,release;const sync=createStartupAccountSync('new',async(path,body,s)=>{calls++;if(body&&calls===1){signal=s;await new Promise(r=>release=r);}return{complete:true};},()=>assert.fail('cancelamento não é erro'));
 sync.update([account('a')]);await tick();sync.update([]);assert.equal(signal.aborted,true);sync.update([account('a')]);release();await tick();assert.equal(calls,3,'tentativa cancelada + anúncio e vendas da reconexão');sync.stop();
});
test('falha nas vendas é visível e não impede sincronização das demais contas',async()=>{
 const ids=[],errors=[];const sync=createStartupAccountSync('c',async(path,body)=>{if(body){ids.push(body.connectionId);return{complete:true};}if(path.includes('connectionId=a'))throw Error('vendas indisponíveis');return{};},(...e)=>errors.push(e));sync.update([account('a'),account('b')]);await tick();assert.deepEqual(ids,['a','b']);assert.equal(errors[0][0],'a');sync.stop();
});

test('sync_busy aguarda em segundo plano sem aviso e sem impedir outras contas; depois conclui vendas',async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const calls=[],errors=[];let busy=true;
 const sync=createStartupAccountSync('c',async(path,body)=>{calls.push(body?.connectionId||'sales');if(body?.connectionId==='a'&&busy)throw Object.assign(Error('ocupada'),{code:'sync_busy'});return {complete:true};},(...e)=>errors.push(e));
 sync.update([account('a'),account('b')]);await tick();
 assert.deepEqual(calls,['a','b','sales']);assert.deepEqual(errors,[]);
 busy=false;t.mock.timers.tick(30_000);await tick();
 assert.deepEqual(calls,['a','b','sales','a','sales']);assert.deepEqual(errors,[]);sync.stop();
});
test('desmontar ou desconectar cancela retomada; autorização nova descarta temporizador antigo',async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const calls=[];const sync=createStartupAccountSync('c',async(path,body)=>{calls.push(body?.connectionId);throw Object.assign(Error('ocupada'),{code:'sync_busy'});},()=>assert.fail('ocupação transitória não é falha'));
 sync.update([account('a')]);await tick();sync.update([]);t.mock.timers.tick(30_000);await tick();assert.deepEqual(calls,['a']);
 sync.update([{...account('a'),connected_at:'nova'}]);await tick();sync.stop();t.mock.timers.tick(120_000);await tick();assert.deepEqual(calls,['a','a']);
});
test('ocupação persistente tem tentativas espaçadas e limitadas, sem anunciar sucesso falso',async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});let calls=0;const errors=[];
 const sync=createStartupAccountSync('c',async()=>{calls++;throw Object.assign(Error('ocupada'),{code:'sync_busy'});},(...e)=>errors.push(e));
 sync.update([account('a')]);await tick();
 for(let n=0;n<4;n++){t.mock.timers.tick(30_000);await tick();}
 assert.equal(calls,5);assert.equal(errors.length,1);assert.match(errors[0][1],/após aguardar outra sincronização/);
 t.mock.timers.tick(300_000);await tick();assert.equal(calls,5);sync.stop();
});
