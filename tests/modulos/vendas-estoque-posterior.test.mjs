import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createPostgresCommercialStockRepository,createCommercialStockService} from '../../app/vendas/lib/server/commercial-stock-service.mjs';
import {createPostgresCommercialOperationRepository} from '../../app/vendas/lib/server/commercial-operation-repository.mjs';
import {createCommercialOperationService} from '../../app/vendas/lib/server/commercial-operation-service.mjs';
import {createPostgresCommercialSalesOrderLifecycleRepository,createCommercialSalesOrderLifecycleService} from '../../app/vendas/lib/server/commercial-sales-order-lifecycle.mjs';
import {createPostgresCommercialSalesOrderBillingRepository} from '../../app/vendas/lib/server/commercial-sales-order-billing.mjs';
import {createCommercialOrderWorkflow} from '../../app/vendas/lib/server/commercial-order-workflow.mjs';
import {createCommercialOrderWorkflowRequest,parseCommercialOrderWorkflowResponse,COMMERCIAL_ORDER_WORKFLOW_RESPONSE_TYPE} from '../../app/vendas/lib/commercial-order-bridge.mjs';
const companyId='11111111-1111-4111-8111-111111111111',actorId='22222222-2222-4222-8222-222222222222',customerId='33333333-3333-4333-8333-333333333333',catalogId='44444444-4444-4444-8444-444444444444',productId='55555555-5555-4555-8555-555555555555',localId='66666666-6666-4666-8666-666666666666';
const context={companyId,actorId,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'sales.create':true,'sales.view':true,'sales.edit':true,'stock.exit':true}};
async function fixture(work){const db=new PGlite();try{
 await db.exec(`create schema fiscal_private;create table fiscal_private.draft_deletions(company_id uuid,draft_id uuid);create table fiscal_private.emissions(company_id uuid,draft_id text,origin_id text,state text);create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key);create table empresas(id uuid primary key);create table custos_tabelas_preco(id uuid primary key,empresa_id uuid);create table vendas_mobile_catalogos(id uuid primary key,empresa_id uuid);create table vendas_mobile_catalogo_produtos(id uuid primary key,catalogo_id uuid);`);
 await db.exec(readFileSync('supabase/migrations/20260905152000_vendas_comercial.sql','utf8'));await db.exec(readFileSync('supabase/migrations/20261105150000_vendas_reserva_reabertura.sql','utf8'));
 await db.exec('create table vendas_fiscal_rascunho_cancelamentos(empresa_id uuid,rascunho_id uuid,operacao_id uuid,motivo text,chave_idempotencia text,criado_por uuid,unique(empresa_id,rascunho_id));');
 await db.query('insert into empresas values($1)',[companyId]);await db.query('insert into auth.users values($1)',[actorId]);await db.query('insert into vendas_mobile_catalogos values($1,$2)',[catalogId,companyId]);await db.query('insert into vendas_mobile_catalogo_produtos values($1,$2)',[productId,catalogId]);await db.query("insert into vendas_clientes(id,empresa_id,codigo,tipo_pessoa,documento_tipo,documento,razao_social,nome_exibicao) values($1,$2,1,'fisica','cpf','12345678901','Teste','Teste')",[customerId,companyId]);await db.query("insert into vendas_estoque_locais(id,empresa_id,codigo,nome,padrao) values($1,$2,'PRINCIPAL','Principal',true)",[localId,companyId]);await db.query('insert into vendas_estoque_saldos(empresa_id,local_id,produto_id,saldo_fisico) values($1,$2,$3,20)',[companyId,localId,productId]);
 const pool={query:(...a)=>db.query(...a),connect:async()=>({query:(...a)=>db.query(...a),release(){}})};
 const operationService=createCommercialOperationService({repository:createPostgresCommercialOperationRepository({pool}),customerResolver:async()=>({id:customerId,status:'ativo',document:'12345678901',displayName:'Teste',legalName:'Teste'}),catalogResolver:async()=>({items:[{id:productId,sku:'P1',name:'Produto teste',type:'produto',unit:'UN',salePrice:99,controlsStock:true,active:true,published:true,fiscalReady:true,fiscal:{ncm:'96032900',taxableUnit:'UN'}}]})});
 const life=createPostgresCommercialSalesOrderLifecycleRepository({pool}),billing=createPostgresCommercialSalesOrderBillingRepository({pool});
 const load=async id=>(await db.query('select * from vendas_operacoes where id=$1',[id])).rows[0];
 const command=async(id,key)=>({companyId,actorId,orderId:id,expectedVersion:Number((await load(id)).versao),idempotencyKey:key});
 const balance=async()=>{const b=(await db.query('select saldo_fisico,saldo_reservado from vendas_estoque_saldos')).rows[0];return [Number(b.saldo_fisico),Number(b.saldo_reservado)];};
 const create=async(key,quantities=[2],fiscalDocument='nenhum')=>{const r=await operationService.create({context,input:{type:'pedido',channel:'vendas',customerId,reserveStock:false,fiscalDocument,idempotencyKey:key,payment:{method:'pix',installments:1,firstDueDate:'2026-11-19'},items:quantities.map(quantity=>({catalogItemId:productId,quantity,unitPrice:99}))}});assert.equal(r.ok,true,JSON.stringify(r.errors));const id=r.operation.id;await life.confirm(await command(id,key+':confirm'));return id;};
 await work({db,pool,life,billing,load,command,balance,create,operationService});
 }finally{await db.close();}}
test('faturado: baixa posterior preserva financeiro/fiscal, bloqueia duplicidade e estorna em cancelamento',()=>fixture(async({db,life,billing,load,command,balance,create})=>{
 const id=await create('late:invoiced',[2],'nfe');await life.startSeparation(await command(id,'late:separate'));await billing.invoice({...await command(id,'late:invoice'),issuerSnapshot:{},moveStock:false});
 const before=await load(id),finBefore=(await db.query('select * from vendas_contas_receber')).rows;
 const fiscalBefore=(await db.query('select * from vendas_fiscal_rascunhos')).rows;
 await db.query('update vendas_estoque_saldos set saldo_reservado=4');
 const input=await command(id,'late:stock');const result=await life.postStock(input);assert.equal(result.physicalDebit,true);assert.deepEqual(await balance(),[18,4]);
 const after=await load(id);for(const k of ['situacao','situacao_fiscal','pagamento_retrato','total','conteudo_hash','faturado_em'])assert.deepEqual(after[k],before[k],k);assert.deepEqual((await db.query('select * from vendas_contas_receber')).rows,finBefore);
 assert.deepEqual((await db.query('select * from vendas_fiscal_rascunhos')).rows,fiscalBefore);
 assert.equal((await life.postStock(input)).reused,true);assert.deepEqual(await balance(),[18,4]);await assert.rejects(async()=>life.postStock({...await command(id,'late:other')}),e=>e.code==='AV-SALES-ORDER-STOCK-DONE');
 await life.cancelInvoiced(await command(id,'late:cancel'));assert.deepEqual(await balance(),[20,4]);assert.equal((await load(id)).situacao,'cancelado');
}));
test('confirmado: reserva posterior usa retratos originais e fatura sem segunda reserva ou perda de quantidade',()=>fixture(async({db,life,billing,load,command,balance,create})=>{
 const id=await create('late:confirmed',[2,3]);const itemsBefore=(await db.query('select * from vendas_operacao_itens where operacao_id=$1 order by id',[id])).rows;
 const posted=await life.postStock(await command(id,'late:reserve'));assert.equal(posted.physicalDebit,false);assert.deepEqual(await balance(),[20,5]);assert.equal((await load(id)).situacao,'confirmado');assert.deepEqual((await db.query('select * from vendas_operacao_itens where operacao_id=$1 order by id',[id])).rows,itemsBefore);
 await life.startSeparation(await command(id,'late:sep'));await billing.invoice({...await command(id,'late:bill'),issuerSnapshot:{}});assert.deepEqual(await balance(),[15,0]);
 await life.returnInvoiced(await command(id,'late:return'));assert.deepEqual(await balance(),[20,0]);
}));
test('saldo insuficiente e falha na auditoria revertem integralmente; outra empresa e versão antiga não gravam',()=>fixture(async({db,life,command,balance,create})=>{
 const id=await create('late:rollback');const input=await command(id,'late:try');
 await assert.rejects(()=>life.postStock({...input,companyId:actorId}),e=>e.code==='AV-SALES-ORDER-NOT-FOUND');await assert.rejects(()=>life.postStock({...input,expectedVersion:999}),e=>e.code==='AV-SALES-ORDER-CONFLICT');
 await db.query('update vendas_estoque_saldos set saldo_reservado=19');await assert.rejects(()=>life.postStock(input),e=>e.code==='AV-SALES-ORDER-STOCK-BALANCE');assert.deepEqual(await balance(),[20,19]);
 await db.query('update vendas_estoque_saldos set saldo_reservado=0');await db.exec("alter table vendas_eventos add constraint fail_late check(evento<>'pedido_estoque_posterior') not valid");await assert.rejects(()=>life.postStock(input));assert.deepEqual(await balance(),[20,0]);assert.equal((await db.query('select count(*)::int n from vendas_estoque_reservas')).rows[0].n,0);
}));
test('cancelar reserva posterior libera saldo e serviço protege sessão/permissões',()=>fixture(async({life,command,balance,create})=>{
 const id=await create('late:cancelreserve'),service=createCommercialSalesOrderLifecycleService({repository:life}),input=await command(id,'late:post-service');
 assert.equal((await service.postStock({...input,context:{...context,effectivePermissions:{'sales.view':true}}})).ok,false);assert.equal((await service.postStock({...input,context:{...context,active:false}})).ok,false);
 assert.equal((await service.postStock({...input,context})).ok,true);assert.deepEqual(await balance(),[20,2]);await life.cancel(await command(id,'late:release'));assert.deepEqual(await balance(),[20,0]);
}));
test('workflow de estoque exige pedido persistido, versão explícita e não fatura nem recria itens',()=>fixture(async({life,command,create,operationService})=>{
 const id=await create('late:workflow'),input=await command(id,'late:workflow-stock');
 const workflow=createCommercialOrderWorkflow({customerRepository:{findByDocument:()=>assert.fail('não criar')},customerService:{create:()=>assert.fail('não criar')},operationService,lifecycleService:createCommercialSalesOrderLifecycleService({repository:life}),billingService:{invoice:()=>assert.fail('não faturar')}});
 assert.equal((await workflow.advance({context,target:'estoque',persistenceKey:'workflow:key',order:{expectedVersion:input.expectedVersion}})).ok,false);
 const result=await workflow.advance({context,target:'estoque',operationId:id,persistenceKey:'workflow:key',order:{expectedVersion:input.expectedVersion}});assert.equal(result.ok,true,JSON.stringify(result.errors));assert.equal(result.order.stockStatus,'reservado');assert.equal(result.order.status,'confirmado');
 const request=createCommercialOrderWorkflowRequest({requestId:'workflow:request',persistenceKey:'workflow:key',target:'estoque',operationId:id,order:{expectedVersion:input.expectedVersion}});assert.ok(request);assert.ok(parseCommercialOrderWorkflowResponse({type:COMMERCIAL_ORDER_WORKFLOW_RESPONSE_TYPE,requestId:'workflow:request',...result}));
}));
test('reserva liberada ao faturar sem baixa pode ser lançada depois, inclusive com produto em duas linhas',()=>fixture(async({life,billing,command,balance,create})=>{
 const id=await create('late:released',[2,3]);await life.postStock(await command(id,'late:initial'));await life.startSeparation(await command(id,'late:separate-released'));
 await billing.invoice({...await command(id,'late:no-debit'),moveStock:false,issuerSnapshot:{}});assert.deepEqual(await balance(),[20,0]);
 await life.postStock(await command(id,'late:after-release'));assert.deepEqual(await balance(),[15,0]);await life.cancelInvoiced(await command(id,'late:cancel-released'));assert.deepEqual(await balance(),[20,0]);
 const next=await create('late:release-duplicates',[2,3]);await life.postStock(await command(next,'late:reserve-duplicates'));await life.cancel(await command(next,'late:cancel-duplicates'));assert.deepEqual(await balance(),[20,0]);
}));
test('local principal inativo não gera movimentos',()=>fixture(async({db,life,command,balance,create})=>{
 const id=await create('late:no-location');await db.query('update vendas_estoque_locais set ativo=false');await assert.rejects(async()=>life.postStock({...await command(id,'late:missing-location')}),e=>e.code==='AV-SALES-ORDER-STOCK-LOCATION');assert.deepEqual(await balance(),[20,0]);
}));
test('quantidades fracionadas respeitam a precisão de três casas do estoque',()=>fixture(async({db,life,command,balance,create})=>{
 const id=await create('late:fraction',[0.1]);await db.query('update vendas_estoque_saldos set saldo_fisico=0.3,saldo_reservado=0.2');await life.postStock(await command(id,'late:decimal'));assert.deepEqual(await balance(),[0.3,0.3]);
}));

test('pedido faturado sai de zero para -3 e entrada posterior de 5 resulta em 2, sem repetir baixa',()=>fixture(async({db,life,billing,command,balance,create})=>{
 const id=await create('negative:late',[3]);
 await life.startSeparation(await command(id,'negative:separate'));
 await billing.invoice({...await command(id,'negative:invoice'),moveStock:false,issuerSnapshot:{}});
 await db.query('update vendas_estoque_saldos set saldo_fisico=0');
 const input={...await command(id,'negative:debit'),allowNegativeStock:true};
 await life.postStock(input);assert.deepEqual(await balance(),[-3,0]);
 assert.equal((await life.postStock(input)).reused,true);assert.deepEqual(await balance(),[-3,0]);
 await db.exec("alter table vendas_mobile_catalogo_produtos add column sku text default 'P1',add column nome text default 'Produto teste';alter table vendas_estoque_movimentos add column data_movimentacao date default current_date;");
 const pool={query:(...a)=>db.query(...a),connect:async()=>({query:(...a)=>db.query(...a),release(){}})};
 const stock=createCommercialStockService({repository:createPostgresCommercialStockRepository({pool})});
 const date=(await db.query("select to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM-DD') data")).rows[0].data;
 const entry=await stock.move({context:{...context,effectivePermissions:{...context.effectivePermissions,'stock.entry':true}},productId,localId,idempotencyKey:'negative:entry-five',mode:'entrada',amount:5,date,document:'Entrada teste'});
 assert.equal(entry.ok,true,JSON.stringify(entry.errors));assert.deepEqual(await balance(),[2,0]);
 assert.equal(entry.balance.current,2);
}));
test('sem saldo inicial, reserva negativa usa local principal e faturamento/cancelamento recompõem saldo',()=>fixture(async({db,life,billing,command,balance,operationService})=>{
 const r=await operationService.create({context,input:{type:'pedido',channel:'vendas',customerId,reserveStock:true,fiscalDocument:'nenhum',idempotencyKey:'negative:new-zero',payment:{method:'pix',installments:1,firstDueDate:'2026-11-19'},items:[{catalogItemId:productId,quantity:3,unitPrice:99}]}});
 assert.equal(r.ok,true,JSON.stringify(r.errors));const id=r.operation.id;
 await db.query('delete from vendas_estoque_saldos');
 await life.confirm({...await command(id,'negative:reserve-zero'),allowNegativeStock:true});assert.deepEqual(await balance(),[0,3]);
 await life.startSeparation(await command(id,'negative:separate-zero'));
 await billing.invoice({...await command(id,'negative:invoice-zero'),issuerSnapshot:{}});assert.deepEqual(await balance(),[-3,0]);
 await life.cancelInvoiced(await command(id,'negative:cancel-zero'));assert.deepEqual(await balance(),[0,0]);
}));
test('falha tardia reverte também autorização de negativo e falta de permissão continua bloqueada',()=>fixture(async({db,life,command,balance,create})=>{
 const id=await create('negative:rollback',[3]);await db.query('update vendas_estoque_saldos set saldo_fisico=0');
 const service=createCommercialSalesOrderLifecycleService({repository:life});
 const input={...await command(id,'negative:rollback-entry'),allowNegativeStock:true};
 assert.equal((await service.postStock({...input,context:{...context,effectivePermissions:{'sales.view':true,'sales.edit':true}}})).ok,false);
 await db.exec("alter table vendas_eventos add constraint fail_negative_event check(evento<>'pedido_estoque_posterior') not valid");
 await assert.rejects(()=>life.postStock(input));assert.deepEqual(await balance(),[0,0]);
 assert.equal((await db.query('select permite_negativo from vendas_estoque_saldos')).rows[0].permite_negativo,false);
}));
test('estorno de baixa devolve estoque uma vez, preserva financeiro/fiscal e permite novo lançamento',()=>fixture(async({db,life,billing,load,command,balance,create})=>{
 const id=await create('stock:reverse',[2,3],'nfe');await life.startSeparation(await command(id,'stock:separate'));await billing.invoice({...await command(id,'stock:invoice'),issuerSnapshot:{},moveStock:false});await life.postStock(await command(id,'stock:post'));
 assert.deepEqual(await balance(),[15,0]);
 const before=await load(id),accounts=(await db.query('select * from vendas_contas_receber')).rows,fiscal=(await db.query('select * from vendas_fiscal_rascunhos')).rows;
 const input=await command(id,'stock:reverse:once');await life.reverseStock(input);assert.deepEqual(await balance(),[20,0]);await life.reverseStock(input);assert.deepEqual(await balance(),[20,0]);
 const after=await load(id);assert.equal(after.situacao,before.situacao);assert.deepEqual(after.faturado_em,before.faturado_em);assert.equal(after.situacao_fiscal,before.situacao_fiscal);assert.equal(after.situacao_estoque,'sem_movimentacao');
 assert.deepEqual((await db.query('select * from vendas_contas_receber')).rows,accounts);assert.deepEqual((await db.query('select * from vendas_fiscal_rascunhos')).rows,fiscal);
 await assert.rejects(()=>life.reverseStock({...input,idempotencyKey:'stock:stale'}),/CONFLICT/);
 await life.postStock(await command(id,'stock:post:again'));assert.deepEqual(await balance(),[15,0]);
}));
test('estorno de estoque valida permissão, empresa, etapa e permite editar após estornar faturamento',()=>fixture(async({db,life,billing,load,command,balance,create,operationService})=>{
 const id=await create('stock:edit',[2]);await life.startSeparation(await command(id,'stock:edit:sep'));await billing.invoice({...await command(id,'stock:edit:bill'),issuerSnapshot:{},moveStock:false});await life.postStock(await command(id,'stock:edit:post'));await life.reverseBilling(await command(id,'stock:edit:unbill'));
 const input=await command(id,'stock:edit:reverse'),service=createCommercialSalesOrderLifecycleService({repository:life});
 assert.equal((await service.reverseStock({...input,context})).ok,false);assert.deepEqual(await balance(),[18,0]);
 await assert.rejects(()=>life.reverseStock({...input,companyId:'99999999-9999-4999-8999-999999999999'}),/NOT-FOUND/);
 const allowed={...context,effectivePermissions:{...context.effectivePermissions,'stock.adjust':true}};
 const workflow=createCommercialOrderWorkflow({customerRepository:{findByDocument:()=>assert.fail()},customerService:{create:()=>assert.fail()},operationService,lifecycleService:service,billingService:{invoice:()=>assert.fail()}});
 const result=await workflow.advance({context:allowed,target:'estornar_estoque',operationId:id,persistenceKey:'stock:workflow',order:{expectedVersion:input.expectedVersion}});assert.equal(result.ok,true,JSON.stringify(result.errors));assert.equal(result.order.status,'em_separacao');assert.equal(result.order.stockStatus,'sem_movimentacao');assert.deepEqual(await balance(),[20,0]);
 await life.reopen(await command(id,'stock:edit:reopen'));assert.equal((await load(id)).situacao,'salvo');
 await assert.rejects(async()=>life.reverseStock(await command(id,'stock:edit:bad')),/STATE/);
 assert.ok(createCommercialOrderWorkflowRequest({requestId:'stock:request',persistenceKey:'stock:workflow',target:'estornar_estoque',operationId:id,order:{expectedVersion:input.expectedVersion}}));
}));
test('falha no histórico do estorno reverte saldos e reservas integralmente',()=>fixture(async({db,pool,life,billing,command,balance,create})=>{
 const id=await create('stock:rollback');await life.startSeparation(await command(id,'stock:rollback:sep'));await billing.invoice({...await command(id,'stock:rollback:bill'),issuerSnapshot:{},moveStock:false});await life.postStock(await command(id,'stock:rollback:post'));
 const input=await command(id,'stock:rollback:reverse');
 const failPool={connect:async()=>{const client=await pool.connect();return {release:()=>client.release(),query:(sql,args)=>{if(/insert into public.vendas_eventos/i.test(sql))throw Error('audit-failure');return client.query(sql,args);}};}};
 const failing=createPostgresCommercialSalesOrderLifecycleRepository({pool:failPool});await assert.rejects(()=>failing.reverseStock(input),/audit-failure/);
 assert.deepEqual(await balance(),[18,0]);assert.equal((await db.query('select situacao from vendas_estoque_reservas where operacao_id=$1',[id])).rows[0].situacao,'consumida');
 await life.reverseStock(input);assert.deepEqual(await balance(),[20,0]);
}));
