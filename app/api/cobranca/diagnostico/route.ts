import { NextResponse } from 'next/server';
import { resolverEstadoAcesso } from '../../../lib/cobranca-servidor';

export const runtime = 'nodejs';

// Diagnóstico TEMPORÁRIO da configuração de cobrança neste deploy.
// Não expõe segredos — apenas tamanhos e sim/não. Remover antes da produção.
// Com ?empresaId=... também resolve o estado daquele perfil (o que o servidor "vê").
export async function GET(request: Request) {
  const tokenWebhook = (process.env.ASAAS_WEBHOOK_TOKEN || '').trim();
  const asaasKey = (process.env.ASAAS_API_KEY || '').trim();

  const empresaId = new URL(request.url).searchParams.get('empresaId');
  let estadoResolvido: unknown = '(passe ?empresaId=... para ver)';
  if (empresaId) {
    try {
      estadoResolvido = await resolverEstadoAcesso(empresaId);
    } catch (e) {
      estadoResolvido = { erro: e instanceof Error ? e.message : 'falha' };
    }
  }

  return NextResponse.json({
    estadoResolvido,
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7), // qual versão está no ar
    cobrancaAtiva: process.env.NEXT_PUBLIC_COBRANCA_ATIVA === 'true',
    dataLancamento: process.env.NEXT_PUBLIC_COBRANCA_LANCAMENTO || '(padrão 2099)',
    asaasWebhookTokenLen: tokenWebhook.length, // deve bater com o token do webhook no Asaas (ex.: 32)
    temServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    asaasApiKeyPrefixOk: asaasKey.startsWith('$aact_'), // true = chave começa com $aact_ (correta)
    asaasApiKeyLen: asaasKey.length,
  });
}
