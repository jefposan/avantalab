import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const sql = readFileSync('supabase/migrations/20261005140000_marketplace_listing_management.sql', 'utf8');
test('migração de Anunciados é aditiva, transacional e limita espera por bloqueios', () => {
  assert.match(sql, /begin;/i);
  assert.match(sql, /commit;\s*$/i);
  assert.match(sql, /set local lock_timeout = '5s'/i);
  assert.match(sql, /set local statement_timeout = '30s'/i);
  assert.doesNotMatch(sql, /\b(?:drop|truncate)\s+(?:table|column|schema)\b/i);
  assert.doesNotMatch(sql, /(?:update|delete from)\s+public\.marketplace_connections\b/i);
  for (const column of ['seller_name', 'last_synced_at', 'refresh_lock_owner', 'refresh_lock_until', 'sync_lock_owner', 'sync_lock_until', 'sync_cursor', 'sync_cursor_at', 'sync_phase', 'sync_pending_ids', 'sync_scan_in_flight']) {
    assert.match(sql, new RegExp(`add column if not exists ${column}\\b`, 'i'));
  }
});
test('cache, auditoria e notificações são inacessíveis diretamente pelo navegador', () => {
  for (const table of ['marketplace_listings', 'marketplace_listing_actions', 'marketplace_notifications']) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from anon, authenticated`, 'i'));
    assert.match(sql, new RegExp(`grant select, insert, update, delete on public\\.${table} to service_role`, 'i'));
  }
  assert.match(sql, /unique \(connection_id, provider_listing_id\)/);
  assert.match(sql, /unique \(empresa_id, request_key\)/);
});

test('vendas de marketplaces ficam em fila privada e separadas por conta', () => {
  const salesSql = readFileSync('supabase/migrations/20261007230000_marketplace_sales_notifications.sql', 'utf8');
  for (const table of ['marketplace_sale_notifications', 'marketplace_sales']) {
    assert.match(salesSql, new RegExp(`create table if not exists public\\.${table}`, 'i'));
    assert.match(salesSql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(salesSql, new RegExp(`revoke all on public\\.${table} from anon, authenticated`, 'i'));
  }
  assert.match(salesSql, /unique \(connection_id, provider_order_id\)/);
  assert.match(salesSql, /topic in \('orders_v2', 'orders', 'shipments'\)/);
});
