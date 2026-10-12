import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { uuidIsValid } from '@/app/modules/marketplaces/services/listing-model';
import { validateAccountLabel } from '@/app/marketplaces/account-identification';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, 'connections');
    if (!uuidIsValid(body.connectionId)) throw new MarketplaceError(400, 'invalid_account', 'Selecione uma conta válida.');
    let label: string;
    try { label = validateAccountLabel(body.local_label); }
    catch { throw new MarketplaceError(400, 'invalid_label', 'Use até 80 caracteres, em uma única linha.'); }
    const { data: connection, error: connectionError } = await db.from('marketplace_connections').select('id').eq('id', body.connectionId).eq('empresa_id', empresaId).neq('status', 'disconnected').maybeSingle();
    if (connectionError) throw new MarketplaceError(503, 'database', 'Não foi possível conferir esta conta. Tente novamente.');
    if (!connection) throw new MarketplaceError(404, 'account_not_found', 'Esta conta não está disponível nesta empresa.');
    const { data, error } = await db.from('marketplace_connection_labels').upsert({ connection_id: connection.id, empresa_id: empresaId, local_label: label, updated_by: usuario.id, updated_at: new Date().toISOString() }, { onConflict: 'connection_id' }).select('connection_id,local_label,updated_at').single();
    if (error || !data) throw new MarketplaceError(503, 'label_unavailable', 'Não foi possível salvar a identificação. Verifique a ativação do cadastro ou tente novamente.');
    return NextResponse.json({ connectionId: data.connection_id, local_label: data.local_label, local_label_updated_at: data.updated_at }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
