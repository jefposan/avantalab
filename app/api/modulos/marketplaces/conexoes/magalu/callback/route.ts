import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getMagaluOAuthConfiguration, MAGALU_CALLBACK_PATH, magaluBrowserMatches, magaluCookieName, readMagaluIntent, exchangeMagaluAuthorizationCode } from '@/app/modules/marketplaces/services/magalu-oauth';
import { revalidateMagaluAccess } from '@/app/modules/marketplaces/services/magalu-connection';
import { openMarketplaceSecret, sealMarketplaceSecret } from '@/app/modules/marketplaces/services/secret-vault';
import { MagaluConnectionError, magaluDatabaseFailure, magaluProviderRejection, reportMagaluFailure, type MagaluFailureStage } from '@/app/modules/marketplaces/services/magalu-diagnostics';

export const runtime = 'nodejs';
function result(message: string, state = '', secure = true, context?: { empresaId: string; status: 'connected' | 'error'; connectionId?: string }) {
  const nonce = randomBytes(18).toString('base64url');
  const fallback = new URL('/marketplaces', secure ? 'https://avantalab.com.br' : 'http://localhost:3000');
  if (context) {
    fallback.searchParams.set('empresaId', context.empresaId);
    fallback.searchParams.set('marketplaceConnection', context.status);
    fallback.searchParams.set('message', message);
    if (context.connectionId && context.status === 'connected') fallback.searchParams.set('connectionId', context.connectionId);
  }
  const serialize = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
  const payload = context ? { type: 'avantalab-marketplace-oauth', provider: 'magalu', ...context, message } : null;
  const response = new NextResponse(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conexão Magalu · AvantaLab</title></head><body><main><h1>Conexão Magalu</h1><p role="status">${message}</p><p><a href="/marketplaces">Voltar ao AvantaLab</a></p></main><script nonce="${nonce}">history.replaceState(null,'',location.pathname);const payload=${serialize(payload)};const fallback=${serialize(fallback.toString())};if(payload){if(window.opener&&!window.opener.closed){window.opener.postMessage(payload,location.origin);window.close();}window.setTimeout(()=>window.location.replace(fallback),350);}</script></body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'` },
  });
  if (/^[A-Za-z0-9_-]{43}$/.test(state)) response.cookies.set(magaluCookieName(state), '', { httpOnly: true, secure, sameSite: 'lax', path: MAGALU_CALLBACK_PATH, maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get('state') || '';
  const secure = request.nextUrl.protocol === 'https:';
  let empresaId = '';
  let stage: MagaluFailureStage = 'configuration';
  const failure = (error: unknown) => {
    const diagnostic = reportMagaluFailure(error, stage);
    return result(diagnostic.message, state, secure, empresaId ? { empresaId, status: 'error' } : undefined);
  };
  if (!/^[A-Za-z0-9_-]{43}$/.test(state)) return failure(new MagaluConnectionError('invalid_return'));
  try {
    if (process.env.MAGALU_OAUTH_ENABLED !== 'true') throw new MagaluConnectionError('disabled');
    const configuration = getMagaluOAuthConfiguration();
    stage = 'browser_validation';
    if (request.nextUrl.origin !== new URL(configuration.redirectUri).origin) throw new MagaluConnectionError('invalid_return');
    const binding = request.cookies.get(magaluCookieName(state))?.value || '';
    if (!binding) throw new MagaluConnectionError('browser_confirmation');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !serviceRole) throw new MagaluConnectionError('configuration');
    const db = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
    stage = 'pending_lookup';
    const pending = await db.from('marketplace_oauth_pending').select('*').eq('provider', 'magalu').eq('state', state).is('consumed_at', null).maybeSingle();
    const row = pending.data;
    if (pending.error) throw magaluDatabaseFailure(pending.error, 'pending_database');
    if (!row) throw new MagaluConnectionError('attempt_used');
    stage = 'browser_validation';
    if (!magaluBrowserMatches(binding, row.browser_binding_hash)) throw new MagaluConnectionError('browser_confirmation');
    empresaId = row.empresa_id;
    if (!Number.isFinite(Date.parse(row.expires_at)) || Date.parse(row.expires_at) <= Date.now()) throw new MagaluConnectionError('expired');
    stage = 'intent_validation';
    let intentValue: string;
    try { intentValue = openMarketplaceSecret(row.verifier_sealed); }
    catch { throw new MagaluConnectionError('vault_unavailable'); }
    const intent = readMagaluIntent(intentValue, configuration);
    stage = 'access_check';
    await revalidateMagaluAccess(db, row.empresa_id, row.started_by);
    stage = 'consume';
    const claim = await db.from('marketplace_oauth_pending').update({ consumed_at: new Date().toISOString() })
      .eq('id', row.id).eq('empresa_id', row.empresa_id).eq('started_by', row.started_by).eq('provider', 'magalu').is('consumed_at', null)
      .gt('expires_at', new Date().toISOString()).select('id').maybeSingle();
    if (claim.error) throw magaluDatabaseFailure(claim.error, 'pending_database');
    if (!claim.data) throw new MagaluConnectionError('attempt_used');
    const code = request.nextUrl.searchParams.get('code') || '';
    if (request.nextUrl.searchParams.has('error')) {
      const providerError = request.nextUrl.searchParams.get('error');
      if (providerError === 'invalid_scope' || providerError === 'unauthorized_client') throw magaluProviderRejection(400, { error: providerError });
      throw new MagaluConnectionError('cancelled');
    }
    if (!code || code.length > 4096) throw new MagaluConnectionError('invalid_return');
    stage = 'exchange';
    const credentials = await exchangeMagaluAuthorizationCode(code, intent, configuration);
    stage = 'access_recheck';
    await revalidateMagaluAccess(db, row.empresa_id, row.started_by);
    stage = 'connection_lookup';
    const existing = await db.from('marketplace_connections').select('id,token_sealed,status').eq('empresa_id', row.empresa_id).eq('provider', 'magalu').eq('seller_reference', credentials.sellerReference).maybeSingle();
    if (existing.error) throw magaluDatabaseFailure(existing.error, 'connection_database');
    stage = 'save';
    let tokenSealed: ReturnType<typeof sealMarketplaceSecret>;
    try { tokenSealed = sealMarketplaceSecret(JSON.stringify({ accessToken: credentials.accessToken, refreshToken: credentials.refreshToken })); }
    catch { throw new MagaluConnectionError('vault_unavailable'); }
    const values = { empresa_id: row.empresa_id, provider: 'magalu', seller_reference: credentials.sellerReference,
      status: 'attention', last_error_code: 'magalu_connector_pending',
      token_sealed: tokenSealed, token_key_version: 1,
      scopes: credentials.scopes, expires_at: credentials.expiresAt, connected_by: row.started_by, connected_at: new Date().toISOString(), last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    let saved;
    if (existing.data) {
      // Não substituir uma desconexão/renovação concorrente.
      let update = db.from('marketplace_connections').update(values).eq('id', existing.data.id).eq('empresa_id', row.empresa_id).eq('provider', 'magalu').eq('status', existing.data.status);
      update = existing.data.token_sealed ? update.filter('token_sealed', 'eq', JSON.stringify(existing.data.token_sealed)) : update.is('token_sealed', null);
      saved = await update.select('id').maybeSingle();
    } else saved = await db.from('marketplace_connections').insert(values).select('id').maybeSingle();
    if (saved.error) throw magaluDatabaseFailure(saved.error, 'connection_database');
    if (!saved.data) throw new MagaluConnectionError(existing.data ? 'connection_changed' : 'connection_database');
    return result('Autorização Magalu concluída. A sincronização de anúncios, vendas e estoque ainda está em preparação.', state, secure, { empresaId, status: 'connected', connectionId: saved.data.id });
  } catch (error) { return failure(error); }
}
