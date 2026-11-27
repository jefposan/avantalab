import test from 'node:test';import assert from 'node:assert/strict';
import {matchesCommercialListPeriod as matches} from '../../app/vendas/lib/commercial-list-period.mjs';
const period={start:'2026-11-02',end:'2026-11-05'};
test('período inclui ambos os limites e exclui dias anteriores e posteriores',()=>{
 for(const date of ['2026-11-02','2026-11-05'])assert.equal(matches(date,period),true);
 for(const date of ['2026-11-01','2026-11-06',''])assert.equal(matches(date,period),false);
});
test('notas usam o dia brasileiro do timestamp; datas de agendamento não mudam com fuso',()=>{
 assert.equal(matches('2026-11-06T02:59:59Z',period),true);
 assert.equal(matches('2026-11-06T03:00:00Z',period),false);
 assert.equal(matches('2026-11-02',period),true);
});
