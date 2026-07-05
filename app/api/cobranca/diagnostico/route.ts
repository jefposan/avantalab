import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Diagnóstico TEMPORÁRIO da configuração de cobrança neste deploy.
// Não expõe segredos — apenas tamanhos e sim/não. Remover antes da produção.
export async function GET() {
  const tokenWebhook = (process.env.ASAAS_WEBHOOK_TOKEN || '').trim();
  const asaasKey = (process.env.ASAAS_API_KEY || '').trim();

  return NextResponse.json({
    cobrancaAtiva: process.env.NEXT_PUBLIC_COBRANCA_ATIVA === 'true',
    dataLancamento: process.env.NEXT_PUBLIC_COBRANCA_LANCAMENTO || '(padrão 2099)',
    asaasWebhookTokenLen: tokenWebhook.length, // deve bater com o token do webhook no Asaas (ex.: 32)
    temServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    asaasApiKeyPrefixOk: asaasKey.startsWith('$aact_'), // true = chave começa com $aact_ (correta)
    asaasApiKeyLen: asaasKey.length,
  });
}
