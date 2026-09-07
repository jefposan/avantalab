export type QuotePdfInput = {
  number: string;
  validUntil?: string;
  company?: {
    name: string;
    legalName?: string;
    document?: string;
    city?: string;
    logoInitials?: string;
  };
  client: string;
  clientDocument?: string;
  clientCity?: string;
  items: Array<{ sku?: string; name: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  discount: number;
  freight: number;
  total: number;
  notes?: string;
};

export function quotePdfFileName(number: string): string;
export function buildQuotePdf(quote: QuotePdfInput): Uint8Array;
