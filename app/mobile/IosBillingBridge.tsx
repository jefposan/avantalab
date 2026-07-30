'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const PRODUTO_MENSAL = 'br.com.avantalab.app.pessoalpremium.monthly';
const PRODUTO_ANUAL = 'br.com.avantalab.app.pessoalpremium.yearly';
const ENTITLEMENT = 'pessoal_premium';

type AcaoIosBilling = 'status' | 'purchase' | 'restore' | 'manage';

type PedidoIosBilling = {
  action: AcaoIosBilling;
  userId: string;
  empresaId: string;
  accessToken: string;
  ciclo?: 'mensal' | 'anual';
};

type RespostaIosBilling = {
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
    __avantalabIosBilling?: (pedido: PedidoIosBilling) => Promise<RespostaIosBilling>;
  }
}

let configurado = false;
let usuarioConfigurado = '';

function mensagemErro(erro: unknown) {
  if (erro instanceof Error) return erro.message;
  if (erro && typeof erro === 'object' && 'message' in erro) {
    return String((erro as { message?: unknown }).message || '');
  }
  return String(erro || 'Não foi possível concluir a operação na App Store.');
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

export default function IosBillingBridge({ apiKey }: { apiKey: string }) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') return;

    window.__avantalabIosBilling = async (pedido) => {
      if (!apiKey) {
        return { ok: false, mensagem: 'Compras da App Store ainda não foram configuradas.' };
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
          productIdentifiers: [PRODUTO_MENSAL, PRODUTO_ANUAL],
        });
        const mensal = products.find((produto) => produto.identifier === PRODUTO_MENSAL);
        const anual = products.find((produto) => produto.identifier === PRODUTO_ANUAL);

        let customerInfo;
        if (pedido.action === 'purchase') {
          const produto = pedido.ciclo === 'anual' ? anual : mensal;
          if (!produto) throw new Error('Plano indisponível na App Store neste momento.');
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
            url: managementUrl || 'https://apps.apple.com/account/subscriptions',
            presentationStyle: 'popover',
          });
        }

        // O servidor consulta a RevenueCat novamente. O cliente jamais concede
        // acesso com base apenas no recibo recebido pelo WebView.
        const sincronizacao = await fetch('/api/cobranca/apple/sincronizar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${pedido.accessToken}`,
          },
          body: JSON.stringify({ empresaId: pedido.empresaId }),
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
        console.error('Falha no fluxo de assinatura Apple:', erro);
        return { ok: false, mensagem: mensagemErro(erro) };
      }
    };

    return () => {
      delete window.__avantalabIosBilling;
    };
  }, [apiKey]);

  return null;
}
