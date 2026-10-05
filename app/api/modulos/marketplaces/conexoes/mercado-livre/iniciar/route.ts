import { NextResponse } from 'next/server';
import { autenticarPerfilCobranca } from '@/app/lib/cobranca-servidor';
import {
  createMercadoLivreAuthorizationUrl,
  createMercadoLivreOAuthState,
  createPkceChallenge,
  createPkceVerifier,
  getMercadoLivreOAuthConfiguration,
} from '@/app/modules/marketplaces/services/mercadolivre-oauth';
import { sealMarketplaceSecret } from '@/app/modules/marketplaces/services/secret-vault';

export const runtime = 'nodejs';

function failure(message: string, status = 400) {
  return NextResponse.json({ error: true, message }, { status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const empresaId = typeof body?.empresaId === 'string' ? body.empresaId.trim() : '';
  if (!empresaId) return failure('Empresa inválida.');

  const access = await autenticarPerfilCobranca(request, empresaId);
  if (!access || !['gestor_master', 'administrador'].includes(access.vinculo.perfil || '')) {
    return failure('Somente Gestor Master ou Administrador pode conectar uma conta.', 403);
  }
  const { data: installation } = await access.db.from('empresa_modulos')
    .select('ativo, expira_em').eq('empresa_id', empresaId).eq('modulo_id', 'marketplaces').maybeSingle();
  const active = installation?.ativo === true && (!installation.expira_em || installation.expira_em > new Date().toISOString());
  if (!active) return failure('O módulo Anúncios em marketplaces não está instalado nesta empresa.', 403);

  try {
    const configuration = getMercadoLivreOAuthConfiguration();
    const state = createMercadoLivreOAuthState();
    const verifier = createPkceVerifier();
    await access.db.from('marketplace_oauth_pending')
      .delete().eq('empresa_id', empresaId).eq('provider', 'mercado_livre').eq('started_by', access.usuario.id).is('consumed_at', null);
    const { error } = await access.db.from('marketplace_oauth_pending').insert({
      empresa_id: empresaId,
      provider: 'mercado_livre',
      state,
      verifier_sealed: sealMarketplaceSecret(verifier),
      started_by: access.usuario.id,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    if (error) throw error;

    return NextResponse.json({
      error: false,
      authorizationUrl: createMercadoLivreAuthorizationUrl({
        clientId: configuration.clientId,
        redirectUri: configuration.redirectUri,
        state,
        codeChallenge: createPkceChallenge(verifier),
      }),
    });
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Não foi possível iniciar a conexão com o Mercado Livre.', 503);
  }
}
