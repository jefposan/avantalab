import test from 'node:test';
import assert from 'node:assert/strict';
import {countPendingFiscalDrafts,mergeFiscalIndicatorStatuses} from '../../app/vendas/lib/fiscal-pending-indicator.mjs';
test('conta pendências, preparação, fila, rejeição, falha e estados ainda não concluídos',()=>{
 const states=['','draft','prepared','number_reserved','signed','submitted','processing','rejected','failed','desconhecido'];
 assert.equal(countPendingFiscalDrafts(states.map(remoteState=>({remoteState,status:'Com pendências'}))),states.length);
});
test('autorização concluída e cancelamento ficam fora, ainda que cadastro local tenha pendência',()=>{
 assert.equal(countPendingFiscalDrafts(['authorized','artifacts_stored','danfe_ready','canceled'].map(remoteState=>({remoteState,status:'Com pendências'}))),0);
 assert.equal(countPendingFiscalDrafts([{status:'Cancelado'},{status:'Pronto para homologação'}]),1);
 assert.equal(countPendingFiscalDrafts([]),0);
});
test('retorno fiscal atualiza a contagem sem gravação e ignora resposta antiga ou alheia',()=>{
 const drafts=[{emissionId:'a',remoteState:'processing',remoteVersion:3}];
 const completed=mergeFiscalIndicatorStatuses(drafts,{a:{id:'a',state:'danfe_ready',version:4}});
 assert.equal(countPendingFiscalDrafts(completed),0);assert.equal(drafts[0].remoteState,'processing');
 assert.equal(mergeFiscalIndicatorStatuses(completed,{a:{id:'a',state:'rejected',version:2}}),completed);
 assert.equal(mergeFiscalIndicatorStatuses(completed,{a:{id:'outro',state:'rejected',version:5}}),completed);
 assert.equal(mergeFiscalIndicatorStatuses(completed,{}),completed);
 assert.equal(countPendingFiscalDrafts(mergeFiscalIndicatorStatuses(completed,{a:{id:'a',state:'processing',version:5}})),1);
});
