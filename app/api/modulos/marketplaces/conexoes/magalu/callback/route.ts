import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getMagaluOAuthConfiguration, MAGALU_CALLBACK_PATH, magaluBrowserMatches, magaluCookieName, readMagaluIntent, exchangeMagaluAuthorizationCode } from '@/app/modules/marketplaces/services/magalu-oauth';
import { revalidateMagaluAccess } from '@/app/modules/marketplaces/services/magalu-connection';
import { openMarketplaceSecret, sealMarketplaceSecret } from '@/app/modules/marketplaces/services/secret-vault';

export const runtime = 'nodejs';
function result(message: string, state = '', secure = true) {
  const nonce = randomBytes(18).toString('base64url');
  const response = new NextResponse(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conexão Magalu · AvantaLab</title></head><body><main><h1>Conexão Magalu</h1><p role="status">${message}</p><p><a href="/marketplaces">Voltar ao AvantaLab</a></p></main><script nonce="${nonce}">history.replaceState(null,'',location.pathname);</script></body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'` },
  });
  if (/^[A-Za-z0-9_-]{43}$/.test(state)) response.cookies.set(magaluCookieName(state), '', { httpOnly: true, secure, sameSite: 'lax', path: MAGALU_CALLBACK_PATH, maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get('state') || '';
  const unavailable = 'A autorização expirou ou não pôde ser confirmada. Inicie a conexão novamente no AvantaLab.';
  if (!/^[A-Za-z0-9_-]{43}$/.test(state)) return result(unavailable);
  const secure = request.nextUrl.protocol === 'https:';
  try {
    if (process.env.MAGALU_OAUTH_ENABLED !== 'true') return result('A conexão Magalu está em preparação.', state, secure);
    const configuration = getMagaluOAuthConfiguration();
    if (request.nextUrl.origin !== new URL(configuration.redirectUri).origin) return result(unavailable, state, secure);
    const binding = request.cookies.get(magaluCookieName(state))?.value || '';
    if (!binding) return result(unavailable, state, secure);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !serviceRole) return result('Não foi possível consultar a conexão agora. Tente novamente.', state, secure);
    const db = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
    const pending = await db.from('marketplace_oauth_pending').select('*').eq('provider', 'magalu').eq('state', state).is('consumed_at', null).maybeSingle();
    const row = pending.data;
    if (pending.error || !row || !Number.isFinite(Date.parse(row.expires_at)) || Date.parse(row.expires_at) <= Date.now() || !magaluBrowserMatches(binding, row.browser_binding_hash)) return result(unavailable, state, secure);
    const intent = readMagaluIntent(openMarketplaceSecret(row.verifier_sealed), configuration);
    await revalidateMagaluAccess(db, row.empresa_id, row.started_by);
    const claim = await db.from('marketplace_oauth_pending').update({ consumed_at: new Date().toISOString() })
      .eq('id', row.id).eq('empresa_id', row.empresa_id).eq('started_by', row.started_by).eq('provider', 'magalu').is('consumed_at', null)
      .gt('expires_at', new Date().toISOString()).select('id').maybeSingle();
    if (claim.error || !claim.data) return result(unavailable, state, secure);
    const code = request.nextUrl.searchParams.get('code') || '';
    if (request.nextUrl.searchParams.has('error') || !code || code.length > 4096) return result('A autorização foi cancelada ou ficou incompleta. Nenhuma conta existente foi alterada.', state, secure);
    const credentials = await exchangeMagaluAuthorizationCode(code, intent, configuration);
    await revalidateMagaluAccess(db, row.empresa_id, row.started_by);
    const existing = await db.from('marketplace_connections').select('id,token_sealed,status').eq('empresa_id', row.empresa_id).eq('provider', 'magalu').eq('seller_reference', credentials.sellerReference).maybeSingle();
    if (existing.error) throw new Error('database');
    const values = { empresa_id: row.empresa_id, provider: 'magalu', seller_reference: credentials.sellerReference,
      status: 'attention', last_error_code: 'magalu_connector_pending',
      token_sealed: sealMarketplaceSecret(JSON.stringify({ accessToken: credentials.accessToken, refreshToken: credentials.refreshToken })), token_key_version: 1,
      scopes: credentials.scopes, expires_at: credentials.expiresAt, connected_by: row.started_by, connected_at: new Date().toISOString(), last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    let saved;
    if (existing.data) {
      // Não substituir uma desconexão/renovação concorrente.
      let update = db.from('marketplace_connections').update(values).eq('id', existing.data.id).eq('empresa_id', row.empresa_id).eq('provider', 'magalu').eq('status', existing.data.status);
      update = existing.data.token_sealed ? update.filter('token_sealed', 'eq', JSON.stringify(existing.data.token_sealed)) : update.is('token_sealed', null);
      saved = await update.select('id').maybeSingle();
    } else saved = await db.from('marketplace_connections').insert(values).select('id').maybeSingle();
    if (saved.error || !saved.data) throw new Error('database');
    return result('Autorização Magalu concluída. A sincronização de anúncios, vendas e estoque ainda está em preparação.', state, secure);
  } catch {
    // Nunca registrar código, cookie, resposta do provedor, tokens ou client secret.
    return result('Não foi possível concluir a conexão Magalu. Confira as permissões da loja e tente novamente. Nenhuma conexão do Mercado Livre foi alterada.', state, secure);
  }
}
