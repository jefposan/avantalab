import { MarketplaceError } from './management-access';
import { fiscalCode } from '../fiscal-state';
export class FiscalProviderError extends MarketplaceError {
  httpStatus: number;
  providerCode?: string;
  correlation?: string;
  constructor(httpStatus: number, providerCode?: string, correlation?: string) {
    super([401, 403, 429].includes(httpStatus) ? httpStatus : httpStatus >= 500 ? 503 : 409, `provider_${httpStatus}`,
      httpStatus === 403 ? 'O Mercado Livre negou o acesso fiscal desta conta. Confira a autorização de Faturamento e Vendas/envios.'
        : httpStatus === 404 ? 'O recurso fiscal não foi localizado no Mercado Livre. Isso não confirma ausência de emissão.'
        : httpStatus === 429 ? 'Limite de consultas fiscais atingido. Aguarde para consultar novamente.'
        : httpStatus >= 500 ? 'O serviço fiscal do Mercado Livre está indisponível. Consulte o pedido antes de repetir.'
        : `O Mercado Livre recusou a operação fiscal${providerCode ? ` (código ${providerCode})` : ''}. Confira os dados e consulte o pedido.`);
    this.httpStatus = httpStatus; this.providerCode = providerCode; this.correlation = correlation;
  }
}
export const isFiscalPath = (path: string) => /^\/(?:mlb\/order\/\d+\/dce\/|users\/\d+\/invoices(?:\/|$)|shipments\/\d+\/invoice_data|shipment_invoice\/\d+\/)/.test(path);
export function fiscalProviderProblem(status: number, body: unknown, requestId: string | null) {
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  return new FiscalProviderError(status, fiscalCode(data.error_code || data.code || data.error), fiscalCode(requestId));
}
