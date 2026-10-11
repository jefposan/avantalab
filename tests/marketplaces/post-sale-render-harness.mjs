import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const componentPath = resolve(import.meta.dirname, '../../app/marketplaces/SalePostSale.tsx');
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL === pathToFileURL(componentPath).href && specifier === './Anunciados') return { url: 'data:text/javascript,export async function marketplaceClientRequest(){throw new Error("Fixture sem rede");}', shortCircuit: true };
    if (specifier.endsWith('.module.css')) return { url: 'data:text/javascript,export default new Proxy({}, {get:(_,key)=>key});', shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === pathToFileURL(componentPath).href) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(componentPath, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext } }).outputText };
    return next(url, context);
  },
});
const { SalePostSaleView } = await import(pathToFileURL(componentPath).href);
hooks.deregister();

export const fixtureDetails = {
  checkedAt: '2026-10-11T14:45:00Z',
  cancellation: { reasonText: 'Cancelamento relacionado a reclamação ou mediação', requestedByText: 'Comprador', date: '2026-10-11T10:00:00Z' },
  refundText: 'Reembolso parcial informado pelo Mercado Livre', refundedAmount: 20.15, currency: 'BRL',
  claimsComplete: true, returnsComplete: true, warnings: [],
  claims: [{ id: '987', typeText: 'Devolução', statusText: 'Aberta', reasonText: 'Comprador desistiu da compra', resolutionText: null, actions: [{ text: 'Revisar o produto devolvido no Mercado Livre', dueAt: '2026-10-13T12:00:00Z' }], returnDetails: { id: '321', statusText: 'Devolução entregue ao destino', physicalReturn: true, moneyText: 'Dinheiro retido pelo Mercado Livre', refundRuleText: 'Regra do ML: reembolso previsto após recebimento e análise do retorno; não confirma pagamento.', shipments: [{ id: '222', statusText: 'Retorno entregue ao destino', destinationText: 'Depósito do Mercado Livre', tracking: 'TRACK-TEST' }] } }],
};

export function renderPostSale({ details = fixtureDetails, loading = false, error = '' } = {}) {
  return renderToStaticMarkup(React.createElement(SalePostSaleView, { details, loading, error, onRefresh() {} }));
}
