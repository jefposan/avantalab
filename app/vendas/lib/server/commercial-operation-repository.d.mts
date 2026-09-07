export const COMMERCIAL_OPERATION_REPOSITORY_REFERENCE: string;
export type CommercialOperationRecord = {
  id: string; companyId: string; type: 'orcamento' | 'pedido'; channel: 'vendas' | 'servicos';
  year: number | null; number: number | null; customerId: string; customerSnapshot: Record<string, any>;
  priceTableId: string; priceTableSnapshot: Record<string, any>; sellerId: string; sellerName: string;
  status: string; validityDate: string; convertedFromId: string; subtotalGross: number;
  itemDiscount: number; generalDiscount: number; freight: number; insurance: number;
  otherExpenses: number; total: number; currency: 'BRL'; paymentSnapshot: Record<string, any>;
  deliverySnapshot: Record<string, any>; fiscalDocument: string; fiscalStatus: string;
  stockStatus: string; customerNotes: string; internalNotes: string; contentHash: string;
  version: number; createdBy: string; updatedBy: string; createdAt: string; updatedAt: string;
  items: Array<Record<string, any>>;
};
export function createPostgresCommercialOperationRepository(options?: { pool?: any }): {
  id: string; configured: true;
  create(operation: Record<string, any>): Promise<{ operation: CommercialOperationRecord; reused: boolean }>;
  update(input: Record<string, any>): Promise<CommercialOperationRecord>;
  convertQuoteToOrder(input: Record<string, any>): Promise<{ operation: CommercialOperationRecord; reused: boolean }>;
  get(input: { companyId: string; operationId: string; channel?: string }): Promise<CommercialOperationRecord | null>;
  list(input: Record<string, any>): Promise<CommercialOperationRecord[]>;
};
