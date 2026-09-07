export type ServiceOrderPdfInput = {
  number: string;
  status: string;
  company?: { name: string; legalName?: string; document?: string; city?: string; logoInitials?: string };
  client: string;
  clientDocument?: string;
  scheduled: string;
  technician: string;
  location: string;
  services: Array<{ sku?: string; name: string; quantity: number; unit: string; unitPrice: number }>;
  actualDuration: string;
  startedAt?: string;
  completionNotes?: string;
  materials: Array<{ name: string; quantity: number; unit: string; source?: string }>;
  checklist: Array<{ label: string; complete: boolean }>;
  attachments: Array<{ name: string }>;
  acceptanceStatus: 'Pendente' | 'Aceito' | 'Recusado';
  acceptedBy?: string;
  acceptedAt?: string;
  acceptanceNotes?: string;
};

export function serviceOrderPdfFileName(number: string): string;
export function buildServiceOrderPdf(order: ServiceOrderPdfInput): Uint8Array;
