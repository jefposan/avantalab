import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

export const REVENUECAT_ENTITLEMENT_PESSOAL = 'pessoal_premium';
export const REVENUECAT_PRODUTO_MENSAL = 'br.com.avantalab.app.pessoalpremium.monthly';
export const REVENUECAT_PRODUTO_ANUAL = 'br.com.avantalab.app.pessoalpremium.yearly';

type EntitlementRevenueCat = {
  expires_date?: string | null;
  product_identifier?: string | null;
};

type AssinaturaRevenueCat = {
  expires_date?: string | null;
  unsubscribe_detected_at?: string | null;
  billing_issues_detected_at?: string | null;
  store?: string | null;
};

type RespostaAssinanteRevenueCat = {
  subscriber?: {
    original_app_user_id?: string | null;
    entitlements?: Record<string, EntitlementRevenueCat>;
    subscriptions?: Record<string, AssinaturaRevenueCat>;
  };
};

export type EstadoRevenueCat = {
  ativo: boolean;
  status: 'ativa' | 'cancelada' | 'expirada' | 'inadimplente';
  produtoId: string | null;
  ciclo: 'mensal' | 'anual' | null;
  validoAte: string | null;
  ambiente: string | null;
  customerId: string;
};

export type LojaNativa = 'apple_app_store' | 'google_play';

function cicloDoProduto(produtoId: string | null): 'mensal' | 'anual' | null {
  if (produtoId === REVENUECAT_PRODUTO_MENSAL) return 'mensal';
  if (produtoId === REVENUECAT_PRODUTO_ANUAL) return 'anual';
  return null;
}

export async function consultarAssinanteRevenueCat(userId: string): Promise<EstadoRevenueCat> {
  const segredo = process.env.REVENUECAT_SECRET_API_KEY?.trim();
  if (!segredo) throw new Error('REVENUECAT_SECRET_API_KEY não configurada.');

  const resposta = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    {
      headers: {
        Authorization: `Bearer ${segredo}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    },
  );
  if (!resposta.ok) {
    throw new Error(`RevenueCat indisponível (${resposta.status}).`);
  }

  const json = await resposta.json() as RespostaAssinanteRevenueCat;
  const assinante = json.subscriber || {};
  const entitlement = assinante.entitlements?.[REVENUECAT_ENTITLEMENT_PESSOAL];
  const produtoId = entitlement?.product_identifier || null;
  const assinatura = produtoId ? assinante.subscriptions?.[produtoId] : null;
  const validoAte = entitlement?.expires_date || assinatura?.expires_date || null;
  const ativo = Boolean(validoAte && new Date(validoAte).getTime() > Date.now());
  const status = ativo
    ? (assinatura?.billing_issues_detected_at
      ? 'inadimplente'
      : (assinatura?.unsubscribe_detected_at ? 'cancelada' : 'ativa'))
    : 'expirada';

  return {
    ativo,
    status,
    produtoId,
    ciclo: cicloDoProduto(produtoId),
    validoAte,
    ambiente: assinatura?.store || null,
    customerId: assinante.original_app_user_id || userId,
  };
}

export function lojaDoEstadoRevenueCat(estado: EstadoRevenueCat): LojaNativa {
  return /play/i.test(String(estado.ambiente || ''))
    ? 'google_play'
    : 'apple_app_store';
}

export async function salvarEstadoRevenueCat(
  db: SupabaseClient,
  userId: string,
  estado: EstadoRevenueCat,
) {
  const loja = lojaDoEstadoRevenueCat(estado);
  const { error } = await db.from('assinaturas_loja').upsert({
    user_id: userId,
    loja,
    produto_id: estado.produtoId,
    entitlement_id: REVENUECAT_ENTITLEMENT_PESSOAL,
    status: estado.status,
    ciclo: estado.ciclo,
    valido_ate: estado.validoAte,
    gateway_customer_id: estado.customerId,
    ambiente: estado.ambiente,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: 'user_id,loja,entitlement_id' });
  if (error) throw error;
}
