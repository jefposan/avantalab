import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCommercialOverview,validOverviewPeriod} from '../../app/vendas/lib/server/commercial-overview.mjs';
import {calculateCommercialReport} from '../../app/vendas/lib/domain.mjs';
const permissions={'sales.view':true,'services.view':true,'receivables.view':true,'catalog.view_cost':true};
const ops=[{id:'sale',tipo:'pedido',situacao:'faturado',total:100,criado_em:'2026-11-01T10:00:00Z',entrega_retrato:{orderDate:'2026-11-02'}},{id:'service',tipo:'ordem_servico',situacao:'concluido',total:70,criado_em:'2026-11-03T10:00:00Z'},{id:'draft',tipo:'pedido',situacao:'salvo',total:500,criado_em:'2026-11-04T10:00:00Z'},{id:'cancel',tipo:'pedido',situacao:'cancelado',total:800,criado_em:'2026-11-04T10:00:00Z'},{id:'old',tipo:'pedido',situacao:'faturado',total:300,criado_em:'2026-10-03T10:00:00Z'}];
const receivables=[{operacao_id:'sale',valor_original:100,valor_recebido:60,valor_estornado:10,situacao:'parcial',vencimento:'2026-11-10'},{operacao_id:'cancel',valor_original:800,valor_recebido:0,valor_estornado:0,situacao:'cancelado',vencimento:'2026-11-10'},{operacao_id:'old',valor_original:300,valor_recebido:0,valor_estornado:0,situacao:'aberto',vencimento:'2026-11-10'}];
const input={operations:ops,receivables,items:[{operacao_id:'sale',quantidade:2.5,custo_unitario_retrato:8}],services:[{operacao_id:'service',custo_real_total:23}],start:'2026-11-01',end:'2026-11-30',today:'2026-11-26',permissions};
test('resumos equivalem ao cálculo financeiro existente, sem rascunhos/cancelamentos/fora do período',()=>{
 const actual=buildCommercialOverview(input),expected=calculateCommercialReport({operations:[{status:'Faturado',total:100,order:{lines:[{quantity:2.5,cost:8}]}},{status:'Concluído',total:70,serviceOrder:{actualCostTotal:23}}],receivables:[{value:100,received:60,refunded:10,dueDate:'2026-11-10'},{value:800,reversed:800,dueDate:'2026-11-10'}],todayIso:'2026-11-26'});
 for(const key of ['revenue','cost','openReceivables','receivedNet','overdueReceivables'])assert.equal(actual[key],expected[key],key);
 assert.deepEqual(actual.counts,{quotes:0,orders:3,services:1,invoiced:1});
});
test('troca de período não mistura históricos e seleção usa data comercial do pedido',()=>{
 assert.equal(buildCommercialOverview({...input,start:'2026-10-01',end:'2026-10-31'}).revenue,300);
 assert.equal(buildCommercialOverview({...input,start:'2026-11-01',end:'2026-11-01'}).revenue,0);
});
test('custos são removidos da resposta; permissões de financeiro e canais independentes',()=>{
 const result=buildCommercialOverview({...input,permissions:{...permissions,'catalog.view_cost':false,'receivables.view':false,'sales.view':false}});
 assert.equal('cost' in result,false);assert.equal(result.revenue,70);assert.equal(result.openReceivables,0);assert.equal(result.receivedNet,0);assert.equal(result.counts.orders,0);
 assert.equal(JSON.stringify(result).includes('custo_unitario'),false);
});
test('datas inválidas, inversas e bissextos; ausência de movimento é zero legítimo',()=>{
 assert.equal(validOverviewPeriod('2026-02-30','2026-03-01'),false);assert.equal(validOverviewPeriod('2026-12-01','2026-11-01'),false);assert.equal(validOverviewPeriod('2024-02-29','2024-02-29'),true);
 assert.throws(()=>buildCommercialOverview({...input,start:'injection'}));assert.equal(buildCommercialOverview({...input,operations:[],items:[],receivables:[]}).revenue,0);
});
