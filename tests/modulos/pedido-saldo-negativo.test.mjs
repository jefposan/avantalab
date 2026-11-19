import test from 'node:test';
import assert from 'node:assert/strict';
import { applyStockMovement } from '../../app/vendas/lib/domain.mjs';
import { mapManagementCatalogItem } from '../../app/vendas/lib/management-catalog-bridge.mjs';

test('entrada parcial recupera déficit sem inventar saldo zero', () => {
 const partial=applyStockMovement({current:-3,reserved:0,quantity:1,direction:'entrada'});
 assert.equal(partial.valid,true);
 assert.equal(partial.nextCurrent,-2);
 assert.equal(partial.nextAvailable,-2);
 assert.equal(applyStockMovement({current:partial.nextCurrent,reserved:0,quantity:4,direction:'entrada'}).nextCurrent,2);
 const denied=applyStockMovement({current:0,reserved:0,quantity:3,direction:'saida'});
 assert.equal(denied.valid,false);
 const allowed=applyStockMovement({current:0,reserved:0,quantity:3,direction:'saida',allowNegativeStock:true});
 assert.equal(allowed.valid,true);
 assert.equal(allowed.nextCurrent,-3);
 assert.equal(applyStockMovement({current:4,reserved:3,quantity:2,direction:'saida',allowNegativeStock:true}).valid,false);
});
test('catálogo da Gestão exibe saldo negativo sem truncar físico/disponível', () => {
 const item=mapManagementCatalogItem({saldoFisico:-3,saldoReservado:2});
 assert.equal(item.current,-3);
 assert.equal(item.available,-5);
 assert.equal(item.reserved,2);
});
