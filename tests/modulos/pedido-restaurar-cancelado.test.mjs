import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
import {createCommercialOperationService} from '../../app/vendas/lib/server/commercial-operation-service.mjs';
import {createPostgresCommercialOperationRepository} from '../../app/vendas/lib/server/commercial-operation-repository.mjs';
import {createPostgresCommercialSalesOrderLifecycleRepository,createCommercialSalesOrderLifecycleService} from '../../app/vendas/lib/server/commercial-sales-order-lifecycle.mjs';
import {createPostgresCommercialSalesOrderBillingRepository,createCommercialSalesOrderBillingService} from '../../app/vendas/lib/server/commercial-sales-order-billing.mjs';
import {createCommercialOrderWorkflow} from '../../app/vendas/lib/server/commercial-order-workflow.mjs';
const companyId='11111111-1111-4111-8111-111111111111',actorId='22222222-2222-4222-8222-222222222222',customerId='33333333-3333-4333-8333-333333333333',productId='55555555-5555-4555-8555-555555555555',catalogId='66666666-6666-4666-8666-666666666666',localId='77777777-7777-4777-8777-777777777777';
const context={companyId,actorId,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:Object.fromEntries(['sales.view','sales.create','sales.edit','sales.invoice','sales.cancel','stock.exit','stock.adjust','fiscal.prepare'].map(p=>[p,true]))};
async function fixture(){
 const db=new PGlite();
 await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key);create table empresas(id uuid primary key);create table custos_tabelas_preco(id uuid primary key,empresa_id uuid);create table vendas_mobile_catalogos(id uuid primary key,empresa_id uuid);create table vendas_mobile_catalogo_produtos(id uuid primary key,catalogo_id uuid);create schema fiscal_private;create table fiscal_private.draft_deletions(company_id uuid,draft_id uuid);create table fiscal_private.emissions(company_id uuid,draft_id text,origin_id text,state text);`);
 for(const path of ['20260905152000_vendas_comercial.sql','20261105150000_vendas_reserva_reabertura.sql','20261124190000_vendas_pedido_restauracao.sql'])await db.exec(readFileSync('supabase/migrations/'+path,'utf8'));
 await db.exec('create table vendas_fiscal_rascunho_cancelamentos(empresa_id uuid,rascunho_id uuid,operacao_id uuid,motivo text,chave_idempotencia text,criado_por uuid,unique(empresa_id,rascunho_id));');
 await db.query('insert into empresas values($1)',[companyId]);await db.query('insert into auth.users values($1)',[actorId]);
 await db.query('insert into vendas_mobile_catalogos values($1,$2)',[catalogId,companyId]);await db.query('insert into vendas_mobile_catalogo_produtos values($1,$2)',[productId,catalogId]);
 await db.query(`insert into vendas_clientes(id,empresa_id,codigo,tipo_pessoa,documento_tipo,documento,razao_social,nome_exibicao) values($1,$2,1,'fisica','cpf','12345678901','Cliente','Cliente')`,[customerId,companyId]);
 await db.query(`insert into vendas_estoque_locais(id,empresa_id,codigo,nome) values($1,$2,'PRINCIPAL','Principal')`,[localId,companyId]);
 await db.query('insert into vendas_estoque_saldos(empresa_id,local_id,produto_id,saldo_fisico,saldo_reservado) values($1,$2,$3,10,0)',[companyId,localId,productId]);
 const pool={query:(...a)=>db.query(...a),connect:async()=>({query:(...a)=>db.query(...a),release(){}})};
 const customer={id:customerId,status:'ativo',document:'12345678901',legalName:'Cliente',displayName:'Cliente'};
 const product={id:productId,sku:'P1',name:'Produto',type:'produto',unit:'UN',salePrice:99,controlsStock:true,active:true,published:true,fiscalReady:true,fiscal:{ncm:'96032900',taxableUnit:'UN'}};
 const operations=createCommercialOperationService({repository:createPostgresCommercialOperationRepository({pool}),customerResolver:async()=>customer,catalogResolver:async()=>({items:[product]})});
 const repository=createPostgresCommercialSalesOrderLifecycleRepository({pool});
 const lifecycle=createCommercialSalesOrderLifecycleService({repository});
 const billing=createCommercialSalesOrderBillingService({repository:createPostgresCommercialSalesOrderBillingRepository({pool}),issuerResolver:async()=>({})});
 const order={type:'pedido',channel:'vendas',customerId,fiscalDocument:'nenhum',reserveStock:true,payment:{method:'pix',installments:2,firstDueDate:'2026-11-24'},items:[{catalogItemId:productId,quantity:2,unitPrice:99}],idempotencyKey:'restaurar:pedido:1'};
 const saved=await operations.create({context,input:order});assert.equal(saved.ok,true,JSON.stringify(saved.errors));const orderId=saved.operation.id;
 const load=async()=>(await db.query('select * from vendas_operacoes where id=$1',[orderId])).rows[0];
 const workflow=createCommercialOrderWorkflow({customerRepository:{findByDocument:async()=>customer},customerService:{create:async()=>({ok:false})},operationService:operations,lifecycleService:lifecycle,billingService:billing});
 const advance=async(target,extra={})=>workflow.advance({context,target,operationId:orderId,persistenceKey:'restaurar:pedido:1',order:{stockLocationId:localId,expectedVersion:(await load()).versao,...extra}});
 const command=async(key)=>({companyId,actorId,orderId,expectedVersion:(await load()).versao,idempotencyKey:key});
 return {db,operations,repository,lifecycle,workflow,orderId,order,load,advance,command};
}
test('ciclo faturar/cancelar/restaurar/editar/refaturar preserva histórico, saldos e parcelas antigas',async()=>{
 const f=await fixture();try{
  const firstBill=await f.advance('faturado');assert.equal(firstBill.ok,true,JSON.stringify(firstBill.errors));
  assert.equal((await f.advance('cancelado')).ok,true);
  const oldRows=(await f.db.query('select * from vendas_contas_receber order by parcela')).rows;assert.equal(oldRows.length,2);assert.ok(oldRows.every(r=>r.situacao==='cancelado'));
  const beforeBalance=(await f.db.query('select * from vendas_estoque_saldos')).rows;
  const restoreInput={context,target:'restaurar',operationId:f.orderId,persistenceKey:'restaurar:pedido:1',order:{expectedVersion:(await f.load()).versao}};
  const restored=await f.workflow.advance(restoreInput);assert.equal(restored.ok,true,JSON.stringify(restored.errors));assert.equal(restored.order.status,'salvo');
  assert.deepEqual((await f.db.query('select * from vendas_estoque_saldos')).rows,beforeBalance);
  assert.deepEqual((await f.db.query('select * from vendas_contas_receber order by parcela')).rows,oldRows);
  const restoredVersion=(await f.load()).versao;assert.equal((await f.workflow.advance(restoreInput)).ok,true);assert.equal((await f.load()).versao,restoredVersion);
  const reserves=(await f.db.query('select * from vendas_estoque_reservas')).rows;assert.equal(reserves.length,1);assert.equal(reserves[0].operacao_item_id,null);assert.equal(reserves[0].item_origem_retrato.nome,'Produto');
  const edited=await f.operations.update({context,operationId:f.orderId,expectedVersion:restoredVersion,input:{...f.order,idempotencyKey:'restaurar:editar:2',items:[{catalogItemId:productId,quantity:3,unitPrice:99}]}});assert.equal(edited.ok,true,JSON.stringify(edited.errors));
  const billed=await f.advance('faturado');assert.equal(billed.ok,true,JSON.stringify(billed.errors));
  const rows=(await f.db.query('select * from vendas_contas_receber')).rows;assert.equal(rows.length,4);assert.equal(rows.filter(r=>r.situacao==='cancelado').length,2);assert.equal(rows.filter(r=>r.situacao!=='cancelado').length,2);
  const balance=(await f.db.query('select saldo_fisico,saldo_reservado from vendas_estoque_saldos')).rows[0];assert.equal(Number(balance.saldo_fisico),7);assert.equal(Number(balance.saldo_reservado),0);
  assert.equal((await f.workflow.advance(restoreInput)).ok,false,'retry antigo não reabre um pedido que já avançou');assert.equal((await f.load()).situacao,'faturado');
  assert.equal((await f.advance('cancelado')).ok,true,'segundo cancelamento tem chave de ciclo própria');
  const events=(await f.db.query('select evento from vendas_eventos')).rows;assert.equal(events.filter(e=>e.evento==='pedido_restaurado_rascunho').length,1);assert.equal(events.filter(e=>e.evento==='pedido_faturado').length,2);
 }finally{await f.db.close();}
});
test('restauração exige Cancelado, versão atual, empresa correta e sales.edit; não inicia confirmação nem estoque',async()=>{
 const f=await fixture();try{
  await assert.rejects(f.repository.restoreCanceled(await f.command('restaurar:invalido:1')),e=>e.code==='AV-SALES-ORDER-STATE');
  await f.advance('confirmado');await f.advance('cancelado');const input=await f.command('restaurar:acesso:1');
  assert.equal((await f.lifecycle.restoreCanceled({context:{...context,effectivePermissions:{}},orderId:f.orderId,expectedVersion:input.expectedVersion,idempotencyKey:input.idempotencyKey})).ok,false);
  await assert.rejects(f.repository.restoreCanceled({...input,expectedVersion:999}),e=>e.code==='AV-SALES-ORDER-CONFLICT');
  await assert.rejects(f.repository.restoreCanceled({...input,companyId:productId}),e=>e.code==='AV-SALES-ORDER-NOT-FOUND');
  const saved=await f.advance('restaurar');assert.equal(saved.ok,true,JSON.stringify(saved.errors));assert.equal((await f.load()).situacao,'salvo');
  assert.equal((await f.db.query('select count(*)::int n from vendas_contas_receber')).rows[0].n,0);
  assert.equal((await f.advance('restaurar')).ok,false);
 }finally{await f.db.close();}
});
test('menu real cancelado contém somente restauração; Rascunho recupera as opções normais',()=>{
 const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8'),start=source.indexOf('function CommercialRecordActions('),end=source.indexOf('\nfunction NewServiceOrderView',start);
 const sandbox={exports:{},require:()=>({jsx:(_c,props)=>props}),RecordActionsDialog:()=>null,documentLabel:()=> 'NF-e'};
 vm.runInNewContext(ts.transpileModule(source.slice(start,end)+'\nexports.menu=CommercialRecordActions;',{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,sandbox);
 let called=0;const record=status=>({id:'2026/1',type:'Pedido',status,fiscal:'Não aplicável',localRecord:{type:'pedido',status,order:{fiscalDocument:'nenhum',stockState:'Sem movimentação',lines:[]}}});
 const props=sandbox.exports.menu({record:record('Cancelado'),onRestore:async()=>{called++;return {ok:true};}});
 assert.deepEqual(Array.from(props.actions,a=>a.label),['Restaurar como rascunho']);assert.equal(props.singleAction,true);props.actions[0].onSelect();assert.equal(called,1);
 const normal=sandbox.exports.menu({record:record('Rascunho')});assert.ok(normal.actions.some(a=>a.label==='Continuar pedido'));assert.ok(normal.actions.some(a=>a.label==='Copiar pedido'));assert.equal(normal.singleAction,false);
});

test('popup espera confirmação, impede clique duplicado e permanece aberto em falha',async()=>{
 const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
 const extract=name=>{const ast=ts.createSourceFile('ui.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);return ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name).getText(ast);};
 const React=await import('react/jsx-runtime');const states=[],refs=[];let cursor=0,refCursor=0,calls=0,resolve,ok=false;
 const sandbox={exports:{},require:n=>React,useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],v=>states[i]=v];},useRef(initial){const i=refCursor++;return refs[i]||=( {current:initial} );},useContext:()=>({can:()=>true}),PermissionContext:{},Dialog:()=>null,Badge:()=>null,Icon:()=>null,BotaoAcaoCompacto:()=>null,AvisoFormulario:()=>null};
 vm.runInNewContext(ts.transpileModule(extract('groupCommercialRecordActions')+'\n'+extract('RecordActionsDialog')+'\nexports.component=RecordActionsDialog;',{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,sandbox);
 const action={label:'Restaurar como rascunho',description:'Rascunho',icon:'back',onSelect:async()=>{calls++;await new Promise(r=>resolve=r);return {ok,message:'Falha controlada'};}};
 const render=()=>{cursor=0;refCursor=0;return sandbox.exports.component({title:'Pedido',description:'Cliente',actions:[action],triggerLabel:'Ações',singleAction:true});};
 const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
 const dialog=()=>nodes(render()).find(n=>n.type===sandbox.Dialog);
 const button=()=>nodes(render()).find(n=>n.type==='button'&&n.props.children?.[0]?.props?.className==='record-action-icon');
 nodes(render()).find(n=>n.type==='button').props.onClick();assert.equal(dialog().props.open,true);
 const send=button().props.onClick;send();send();assert.equal(calls,1);assert.equal(button().props.disabled,true);dialog().props.onClose();assert.equal(dialog().props.open,true);
 resolve();await new Promise(setImmediate);assert.equal(dialog().props.open,true);assert.equal(button().props.disabled,false);assert.ok(nodes(render()).some(n=>n.type===sandbox.AvisoFormulario));
 ok=true;button().props.onClick();resolve();await new Promise(setImmediate);assert.equal(dialog().props.open,false);
});
