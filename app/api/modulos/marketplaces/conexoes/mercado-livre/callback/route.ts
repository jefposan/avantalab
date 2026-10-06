import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exchangeMercadoLivreAuthorizationCode } from '@/app/modules/marketplaces/services/mercadolivre-oauth';
import { openMarketplaceSecret, sealMarketplaceSecret, type SealedMarketplaceSecret } from '@/app/modules/marketplaces/services/secret-vault';

export const runtime = 'nodejs';

function destination(request: Request, empresaId: string, status: 'connected' | 'error', message = '') {
  const url = new URL('/marketplaces', request.url);
  if (empresaId) url.searchParams.set('empresaId', empresaId);
  url.searchParams.set('marketplaceConnection', status);
  if (message) url.searchParams.set('message', message.slice(0, 180));
  const origin = new URL(request.url).origin;
  const payload = JSON.stringify({ type: 'avantalab-marketplace-oauth', provider: 'mercado_livre', empresaId, status, message: message.slice(0, 180) });
  const fallback = JSON.stringify(url.toString());
  // Quando a autorização nasce em uma janela, ela atualiza a aba original e fecha.
  // Sem opener (fluxos antigos, favoritos ou bloqueio de popup), preserva o redirecionamento seguro.
  const document = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Conexão Mercado Livre</title></head><body><p>Concluindo conexão…</p><script>const target=${JSON.stringify(origin)};const message=${payload};const fallback=${fallback};if(window.opener&&!window.opener.closed){window.opener.postMessage(message,target);window.close();}window.setTimeout(()=>window.location.replace(fallback),350);</script></body></html>`;
  return new NextResponse(document, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code') || '';
  if (!state || !code) return destination(request, '', 'error', 'A autorização do Mercado Livre foi cancelada ou ficou incompleta.');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRole) return destination(request, '', 'error', 'Servidor de integração indisponível.');
  const db = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: pending } = await db.from('marketplace_oauth_pending')
    .select('*').eq('state', state).eq('provider', 'mercado_livre').is('consumed_at', null).maybeSingle();
  if (!pending || new Date(pending.expires_at).getTime() < Date.now()) {
    return destination(request, pending?.empresa_id || '', 'error', 'A autorização expirou. Inicie a conexão novamente.');
  }

  const { data: claimed } = await db.from('marketplace_oauth_pending')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', pending.id).is('consumed_at', null)
    .select('id').maybeSingle();
  if (!claimed) return destination(request, pending.empresa_id, 'error', 'Esta autorização já foi utilizada. Inicie uma nova conexão.');

  let stage = 'abrir-verificador';
  try {
    const verifier = openMarketplaceSecret(pending.verifier_sealed as SealedMarketplaceSecret);
    stage = 'trocar-autorizacao';
    const credentials = await exchangeMercadoLivreAuthorizationCode(code, verifier);
    stage = 'gravar-conexao';
    const { data: existing } = await db.from('marketplace_connections')
      .select('id').eq('empresa_id', pending.empresa_id).eq('provider', 'mercado_livre').eq('seller_reference', credentials.sellerReference).maybeSingle();
    const connection = {
      empresa_id: pending.empresa_id,
      provider: 'mercado_livre',
      status: 'connected',
      seller_reference: credentials.sellerReference,
      token_sealed: sealMarketplaceSecret(JSON.stringify({ accessToken: credentials.accessToken, refreshToken: credentials.refreshToken })),
      token_key_version: 1,
      scopes: credentials.scopes,
      expires_at: credentials.expiresAt,
      connected_by: pending.started_by,
      connected_at: new Date().toISOString(),
      last_checked_at: new Date().toISOString(),
      last_error_code: null,
      updated_at: new Date().toISOString(),
    };
    const { error } = existing
      ? await db.from('marketplace_connections').update(connection).eq('id', existing.id)
      : await db.from('marketplace_connections').insert(connection);
    if (error) throw error;
    return destination(request, pending.empresa_id, 'connected');
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'erro-desconhecido';
    // Registra somente diagnóstico sem tokens/códigos OAuth e preserva uma orientação acionável para o usuário.
    console.error('[marketplaces] Falha no callback OAuth do Mercado Livre', {
      stage,
      message: detail,
      empresaId: pending.empresa_id,
    });
    const message = stage === 'abrir-verificador'
      ? 'Não foi possível validar a configuração segura desta conexão. Verifique a chave de criptografia do ambiente.'
      : stage === 'trocar-autorizacao' && detail.includes('invalid_client')
        ? 'O Mercado Livre recusou a configuração do aplicativo. Confirme o Client ID e a chave secreta cadastrados no ambiente.'
        : 'Não foi possível concluir a conexão. Verifique a autorização e tente novamente.';
    return destination(request, pending.empresa_id, 'error', message);
  }
}
