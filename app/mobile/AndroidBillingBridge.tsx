'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const ENTITLEMENT = 'pessoal_premium';

type AcaoAndroidBilling = 'status' | 'purchase' | 'restore' | 'manage';

type PedidoAndroidBilling = {
  action: AcaoAndroidBilling;
  userId: string;
  empresaId: string;
  accessToken: string;
  ciclo?: 'mensal' | 'anual';
};

type RespostaAndroidBilling = {
  ok: boolean;
  cancelado?: boolean;
  mensagem?: string;
  ativo?: boolean;
  produtoId?: string | null;
  validoAte?: string | null;
  precoMensal?: string;
  precoAnual?: string;
  managementUrl?: string | null;
};

declare global {
  interface Window {
    __avantalabAndroidBilling?: (pedido: PedidoAndroidBilling) => Promise<RespostaAndroidBilling>;
  }
}

let configurado = false;
let usuarioConfigurado = '';

function mensagemErro(erro: unknown) {
  if (erro instanceof Error) return erro.message;
  if (erro && typeof erro === 'object' && 'message' in erro) {
    return String((erro as { message?: unknown }).message || '');
  }
  return String(erro || 'Não foi possível concluir a operação no Google Play.');
}

function compraCancelada(erro: unknown) {
  if (!erro || typeof erro !== 'object') return false;
  const detalhe = erro as { userCancelled?: boolean; code?: string | number; message?: string };
  return Boolean(
    detalhe.userCancelled
    || String(detalhe.code || '') === '1'
    || /cancel/i.test(String(detalhe.message || '')),
  );
}

export default function AndroidBillingBridge({
  apiKey,
  produtoMensal,
  produtoAnual,
}: {
  apiKey: string;
  produtoMensal: string;
  produtoAnual: string;
}) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

    window.__avantalabAndroidBilling = async (pedido) => {
      if (!apiKey || !produtoMensal || !produtoAnual) {
        return { ok: false, mensagem: 'Compras do Google Play ainda não foram configuradas.' };
      }
      if (!pedido.userId || !pedido.empresaId || !pedido.accessToken) {
        return { ok: false, mensagem: 'Sessão inválida. Entre novamente e tente outra vez.' };
      }

      try {
        const [{ Purchases }, { Browser }] = await Promise.all([
          import('@revenuecat/purchases-capacitor'),
          import('@capacitor/browser'),
        ]);

        if (!configurado) {
          await Purchases.configure({
            apiKey,
            appUserID: pedido.userId,
            automaticDeviceIdentifierCollectionEnabled: false,
          });
          configurado = true;
          usuarioConfigurado = pedido.userId;
        } else if (usuarioConfigurado !== pedido.userId) {
          await Purchases.logIn({ appUserID: pedido.userId });
          usuarioConfigurado = pedido.userId;
        }

        const { products } = await Purchases.getProducts({
          productIdentifiers: [produtoMensal, produtoAnual],
        });
        const mensal = products.find((produto) => produto.identifier === produtoMensal);
        const anual = products.find((produto) => produto.identifier === produtoAnual);

        let customerInfo;
        if (pedido.action === 'purchase') {
          const produto = pedido.ciclo === 'anual' ? anual : mensal;
          if (!produto) throw new Error('Plano indisponível no Google Play neste momento.');
          customerInfo = (await Purchases.purchaseStoreProduct({ product: produto })).customerInfo;
        } else if (pedido.action === 'restore') {
          customerInfo = (await Purchases.restorePurchases()).customerInfo;
        } else {
          customerInfo = (await Purchases.getCustomerInfo()).customerInfo;
        }

        const entitlement = customerInfo.entitlements.all[ENTITLEMENT];
        const managementUrl = customerInfo.managementURL || null;
        if (pedido.action === 'manage') {
          await Browser.open({
            url: managementUrl || 'https://play.google.com/store/account/subscriptions',
            presentationStyle: 'popover',
          });
        }

        // A fonte de verdade é a RevenueCat consultada no servidor; o app não
        // libera recursos somente a partir da resposta nativa do Google Play.
        const sincronizacao = await fetch('/api/cobranca/loja/sincronizar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${pedido.accessToken}`,
          },
          body: JSON.stringify({ empresaId: pedido.empresaId, loja: 'google_play' }),
        });
        const sincronizado = await sincronizacao.json().catch(() => ({}));
        if (!sincronizacao.ok) {
          throw new Error(sincronizado.mensagem || 'Não foi possível validar a assinatura.');
        }

        return {
          ok: true,
          ativo: Boolean(entitlement?.isActive && sincronizado.estado?.ativo),
          produtoId: entitlement?.productIdentifier || null,
          validoAte: entitlement?.expirationDate || null,
          precoMensal: mensal?.priceString || 'R$ 9,90',
          precoAnual: anual?.priceString || 'R$ 99,90',
          managementUrl,
        };
      } catch (erro) {
        if (compraCancelada(erro)) return { ok: false, cancelado: true };
        console.error('Falha no fluxo de assinatura Google Play:', erro);
        return { ok: false, mensagem: mensagemErro(erro) };
      }
    };

    return () => {
      delete window.__avantalabAndroidBilling;
    };
  }, [apiKey, produtoAnual, produtoMensal]);

  return null;
}
