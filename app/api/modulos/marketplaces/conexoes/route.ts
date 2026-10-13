import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { magaluCatalogScopesGranted } from '@/app/modules/marketplaces/services/magalu-oauth';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { db, empresaId, podeGerenciar, vinculo } = await authorizeMarketplace(request, new URL(request.url).searchParams.get('empresaId'));
    const { data, error } = await db.from('marketplace_connections')
      .select('id,provider,seller_reference,seller_name,status,connected_at,expires_at,last_synced_at,last_error_code,scopes')
      .eq('empresa_id', empresaId).in('provider', ['mercado_livre', 'magalu']).neq('status', 'disconnected').order('connected_at', { ascending: false });
    if (error) throw new MarketplaceError(503, 'database', 'Não foi possível consultar as contas. Verifique se a migração de gestão de anúncios foi aplicada neste ambiente.');
    const { data: labels, error: labelsError } = await db.from('marketplace_connection_labels').select('connection_id,local_label,updated_at').eq('empresa_id', empresaId);
    const byId = new Map((labelsError ? [] : labels || []).map(label => [label.connection_id, label]));
    const accounts = (data || []).map(({ scopes, ...account }) => ({ ...account,
      magalu_catalog_authorized: account.provider === 'magalu' ? magaluCatalogScopesGranted(scopes) : false,
      local_label: byId.get(account.id)?.local_label ?? null, local_label_updated_at: byId.get(account.id)?.updated_at ?? null,
    }));
    return NextResponse.json({ accounts, labelsAvailable: !labelsError, canConnect: podeGerenciar, canManage: ['gestor_master', 'administrador', 'operador_completo'].includes(vinculo.perfil || '') }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId } = await authorizeMarketplace(request, body.empresaId, 'connections');
    if (typeof body.connectionId !== 'string' || body.confirmation !== body.connectionId) throw new Error('Invalid confirmation');
    const { data, error } = await db.from('marketplace_connections').update({ status: 'disconnected', token_sealed: null,
      expires_at: null, refresh_lock_owner: null, refresh_lock_until: null, sync_lock_owner: null, sync_lock_until: null, sync_cursor: null, sync_phase: 'scan', sync_pending_ids: [],
      updated_at: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', body.connectionId).in('provider', ['mercado_livre', 'magalu']).select('id').single();
    if (error || !data) throw new Error('Disconnect failed');
    return NextResponse.json({ success: true });
  } catch (error) { return managementFailure(error); }
}
