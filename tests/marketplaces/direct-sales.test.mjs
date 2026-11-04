import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {saleToday,validSoldOn} from '../../app/modules/marketplaces/direct-sales.ts';
import {salesByMarketplaces,saleMarketplace,salesByView} from '../../app/modules/marketplaces/sales-marketplace-filter.ts';
import {salesInPeriod,saleGroup} from '../../app/modules/marketplaces/sales-status.ts';
const require=createRequire(import.meta.url),read=p=>readFileSync(p,'utf8');
test('Online e Saldão são históricos separados, sem confundir uma venda manual no estoque Online com pedido importado',()=>{
 const ml={id:'ml',provider:'mercado_livre'},magalu={id:'magalu',provider:'magalu'},manual={id:'manual',provider:'direct',directSale:{warehouseId:'saldao'}},manualOnline={id:'manual-online',provider:'direct',directSale:{warehouseId:'online'}};
 const all=[ml,magalu,manual,manualOnline];
 assert.deepEqual(salesByView(all,'online'),[ml,magalu]);
 assert.deepEqual(salesByView(all,'direct'),[manual,manualOnline]);
 assert.deepEqual(salesByMarketplaces(salesByView(all,'direct'),['warehouse:saldao']),[manual]);
 const client=read('app/marketplaces/MarketplacesClient.tsx');
 assert.match(client,/useState<SalesView>\('online'\)/);
 assert.match(client,/salesByView\(periodSales, salesView\)/);
 assert.match(client,/salesByView\(salesInPeriod\(salesSnapshot, salesPeriod\), salesView\)/);
 const change=client.match(/function selectSalesView\(view: SalesView\) \{([^}]+)\}/)?.[1];
 for(const action of ["setSalesAccount('')",'setSalesMarketplaces([])',"setSalesGroup('')"])assert.ok(change?.includes(action));
});
test('vendas diretas: canal não vira ML, mês usa data da venda e cancelamento fica fora das confirmadas',()=>{
 const s={provider:'direct',directSale:{warehouseId:'stock'},connectionId:'warehouse:stock',orderId:'sale',soldAt:'2026-09-30T12:00:00-03:00',createdAt:'2026-10-19T10:00:00Z',status:'paid',shipmentStatus:null,shipmentSubstatus:null,labelStatus:'unavailable'};
 assert.equal(saleMarketplace(s),'warehouse:stock');assert.equal(salesByMarketplaces([s],['mercado_livre']).length,0);assert.equal(salesByMarketplaces([s],['warehouse:stock']).length,1);
 assert.equal(salesInPeriod([s],{start:'2026-09-01',end:'2026-09-30'}).length,1);assert.equal(salesInPeriod([s],{start:'2026-10-01',end:'2026-10-31'}).length,0);
 assert.equal(saleGroup(s),'confirmed');assert.equal(saleGroup({...s,status:'cancelled'}),'cancelled');
 assert.ok(validSoldOn(saleToday()));for(const d of ['2026-02-30','2999-01-01','1999-01-01','20/10/26',''])assert.equal(validSoldOn(d),false);
});
test('recibo durável sobrevive fechar/reabrir e rede sem resposta; rejeição explícita permite corrigir sem duplicar',async()=>{
 const store=new Map(),writes=new Map(),sent=[],events=[];
 const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 let lose=true,reject=false,denyStorage=false;
 const request=async(path,o)=>{const body=JSON.parse(o.body);sent.push(body);if(reject)return{rejected:true,message:'Saldo atualizado. Confira.'};if(!writes.has(body.requestKey))writes.set(body.requestKey,body);if(lose){lose=false;throw new Error('Resposta perdida');}return{result:{saleId:'saved'}};};
 function mount(){
  let cursor=0;const states=[],refs=[],cleanups=[];let rc=0;
  const hooks={useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return[states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];},useRef(initial){const i=rc++;return refs[i]??= {current:initial};},useEffect(fn){if(!cleanups.length)cleanups.push(fn());}};
  const exports={};vm.runInNewContext(ts.transpileModule(read('app/marketplaces/useDirectSaleCommand.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Error,AbortSignal,crypto,window:{},localStorage:{...storage,setItem(k,v){if(denyStorage)throw new Error('blocked');storage.setItem(k,v);}},require(name){if(name==='react')return hooks;if(name.includes('direct-sales'))return{DIRECT_SALES_PATH:'/direct',notifyDirectSalesChanged:id=>events.push(id)};if(name.includes('product-stock-events'))return{notifyProductStockChanged(){}};return require(name);}});
  return{render(){cursor=0;rc=0;return exports.default('company','actor','product',request);},close(){cleanups.forEach(fn=>fn?.());}};
 }
 let m=mount(),h=m.render();const payload={action:'sell',quantity:2,productId:'product'};
 assert.equal(await h.run(payload),false);h=m.render();assert.ok(h.pending);assert.equal(writes.size,1);m.close();
 m=mount();h=m.render();assert.equal(h.pending.payload.quantity,2);assert.equal(await h.run({action:'sell',quantity:99}),true);
 assert.equal(writes.size,1);assert.equal(sent[0].requestKey,sent[1].requestKey);assert.equal(sent[1].quantity,2);assert.equal(store.size,0);assert.equal(events.length,1);
 reject=true;h=m.render();assert.equal(await h.run(payload),false);h=m.render();assert.equal(h.pending,null);assert.match(h.error,/Saldo atualizado/);assert.equal(writes.size,1);
 denyStorage=true;reject=false;const count=sent.length;assert.equal(await h.run(payload),false);assert.equal(sent.length,count,'sem recibo durável não envia');m.close();
});
test('contratos: autorização separada, saída sem faturamento, modal reutilizado e nenhuma integração financeira nesta etapa',()=>{
 const migration=read('supabase/migrations/20261020010000_marketplace_direct_sales.sql');
 assert.match(migration,/can_register_sales boolean not null default false/);assert.match(migration,/for share/);assert.match(migration,/pg_advisory_xact_lock/);
 assert.match(migration,/where empresa_id=p_empresa_id and request_key=p_request_key/);assert.match(migration,/saved.actor_id<>p_actor_id/);
 assert.match(migration,/if p_action='sell' then\s+insert into marketplace_direct_sales/);assert.match(migration,/p_action='withdraw'/);
 assert.doesNotMatch(migration,/insert into (?:public\.)?(?:lancamentos|receitas|contas_receber|financeiro)/i);
 const ui=read('app/marketplaces/DirectSaleActions.tsx');assert.match(ui,/CardExpandidoModal/);assert.match(ui,/CampoData anoCurto/);assert.match(ui,/formatarMoedaDigitada/);assert.match(ui,/Outras saídas/);
 const users=read('app/api/modulos/marketplaces/precos/usuarios/route.ts');assert.match(users,/typeof body.can_register_sales !== 'boolean'/);assert.match(users,/can_register_sales: values.can_register_sales === true/);assert.match(users,/\.eq\('id', id\)\.eq\('empresa_id', empresaId\)/);
 const api=read('app/api/modulos/marketplaces/vendas-diretas/route.ts');assert.match(api,/authorizePriceConsultation/);assert.match(api,/a.usuario.id/);assert.match(api,/canSell/);
 const sandbox=read('app/api/modulos/marketplaces/validacao-vendas-diretas/route.ts');assert.match(sandbox,/NODE_ENV==='production'/);assert.match(sandbox,/localhost/);assert.doesNotMatch(sandbox,/createClient|SUPABASE|fetch\(/);
});
