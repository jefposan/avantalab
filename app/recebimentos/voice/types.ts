export const OPERACOES_VOZ_CAMPO = [
  'register_receipt',
  'schedule_service',
  'complete_service',
  'unsupported',
] as const;

export type OperacaoVozCampo = (typeof OPERACOES_VOZ_CAMPO)[number];
export type ModoVozCampo = 'recebimentos' | 'servicos';

export type RascunhoVozCampo = {
  intent: OperacaoVozCampo;
  replacePrevious: boolean;
  customerReference: string | null;
  amount: number | null;
  paymentMethod: 'boleto' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'pix' | null;
  scheduledDate: string | null;
  serviceType: 'interna' | 'revisao' | 'extra' | null;
  receiverName: string | null;
  evaluation: 'bom' | 'regular' | null;
  notes: string | null;
  unsupportedReason: string | null;
};

export type MetricasVozCampo = {
  interpretationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export type AcaoVozCampo = {
  intent: 'register_receipt' | 'schedule_service' | 'prepare_service_registration';
  companyId: string;
  subcompanyId: string | null;
  customerName: string;
  receiptId?: string | null;
  amount: number | null;
  paymentMethod: RascunhoVozCampo['paymentMethod'];
  scheduledDate: string | null;
  serviceType: RascunhoVozCampo['serviceType'];
  serviceId?: string | null;
  notes: string | null;
};

export type PreparacaoRegistroServicoVoz = {
  requestId: string;
  companyId: string;
  subcompanyId: string | null;
  serviceId: string;
};
