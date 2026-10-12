import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { pendingSaleOperation, listingOperations, listingOperationalStatus } from '../../app/modules/marketplaces/listing-operations.ts';

const sale = patch => ({ connection_id: 'account', status: 'paid', shipment_status: 'ready_to_ship', shipment_substatus: null,
  snapshot: { inventoryLines: [{ listingId: 'MLB123456' }] }, ...patch });

test('zero com pedido em andamento é ativo local; fim confirmado retoma situação ML sem reativação', () => {
  assert.equal(pendingSaleOperation(sale()), 'Aguardando envio');
  assert.equal(listingOperationalStatus('paused', 0, { count: 1, labels: ['Aguardando envio'] }), 'active');
  assert.equal(listingOperationalStatus('paused', 0), 'paused');
  assert.equal(listingOperationalStatus('active', 0), 'inactive');
  assert.equal(listingOperationalStatus('active', null), 'active');
  assert.equal(pendingSaleOperation(sale({ shipment_status: 'delivered' })), null);
  assert.equal(listingOperationalStatus('closed', 0), 'closed');
  assert.equal(listingOperationalStatus('deleted', 0), 'deleted');
});
test('cancelamentos, devoluções e consultas incompletas não são finalizados por dedução', () => {
  assert.equal(pendingSaleOperation(sale({ status: 'pending_cancel' })), 'Cancelamento em processamento');
  for (const state of ['open', 'unknown', 'closed']) {
    const pending = pendingSaleOperation(sale({ status: 'cancelled', shipment_status: 'delivered', snapshot: { postSaleProgress: { state } } }));
    assert.equal(pending, state === 'closed' ? null : state === 'open' ? 'Pós-venda em andamento' : 'Pós-venda a confirmar');
  }
  assert.equal(pendingSaleOperation(sale({ status: 'cancelled' })), 'Pós-venda a confirmar');
  assert.equal(pendingSaleOperation(sale({ shipment_status: 'delivered', snapshot: { postSaleProgress: { state: 'open' } } })), 'Pós-venda em andamento');
  assert.equal(pendingSaleOperation(sale({status:'partially_refunded',snapshot:{postSaleProgress:{state:'closed'}}})), 'Aguardando envio');
  assert.equal(pendingSaleOperation(sale({status:'partially_paid',shipment_status:'delivered'})), 'Pagamento parcial');
});
test('vínculo das pendências usa conta e ID do item; não aproxima por nome nem soma unidades', () => {
  const result = listingOperations([sale(), sale({ snapshot: { inventoryLines: [{ listingId: 'MLB123456' }, { listingId: 'MLB123456' }] } }),
    sale({ connection_id: 'other' }), sale({ snapshot: { inventoryLines: [{ listingId: 'INVALID' }] } })], ['account']);
  assert.equal(result.size, 1); assert.deepEqual(result.get('account:MLB123456'), { count: 2, labels: ['Aguardando envio'] });
});
test('função SQL usada antes da paginação segue o contrato em todas as combinações de estados', async () => {
  const db = new PGlite(); try {
    const sql = readFileSync(new URL('../../supabase/migrations/20261012230000_marketplace_sales_history.sql', import.meta.url), 'utf8');
    await db.exec(sql.match(/create or replace function public\.marketplace_sale_operation[\s\S]*?\$\$;/)[0]);
    for (const status of ['paid', 'confirmed', 'payment_required', 'payment_in_process', 'partially_paid', 'pending_cancel', 'cancelled', 'refunded', 'partially_refunded', 'invalid']) {
      for (const shipment_status of [null, 'pending', 'handling', 'ready_to_ship', 'shipped', 'delivered', 'not_delivered', 'cancelled']) {
        for (const state of [null, 'open', 'unknown', 'closed']) {
          const snapshot = state ? { postSaleProgress: { state } } : {};
          const result = (await db.query('select marketplace_sale_operation($1,$2,$3) as label', [status, shipment_status, JSON.stringify(snapshot)])).rows[0].label;
          assert.equal(result, pendingSaleOperation(sale({ status, shipment_status, snapshot })));
        }
      }
    }
    assert.match(sql, /s\.empresa_id=l\.empresa_id and s\.connection_id=l\.connection_id/);
    assert.match(sql, /security_invoker=true/);
  } finally { await db.close(); }
});
