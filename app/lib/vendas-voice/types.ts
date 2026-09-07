export const VOICE_INTENTS = [
  'create_order',
  'create_consignment',
  'register_payment',
  'create_appointment',
  'query_customer_history',
  'query_sales',
  'unsupported',
] as const;

export type VoiceIntent = (typeof VOICE_INTENTS)[number];

export type VoiceIntentItem = {
  productReference: string;
  quantity: number;
};

export type VoiceIntentPayload = {
  intent: VoiceIntent;
  customerReference: string | null;
  items: VoiceIntentItem[];
  amount: number | null;
  paymentMethod: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  appointmentType: 'Visita' | 'Entrega' | 'Recebimento' | 'Cobrar' | 'Outro' | null;
  appointmentNotes: string | null;
  period: 'today' | 'this_month' | 'last_month' | 'all' | null;
  unsupportedReason: string | null;
};

export type VoiceEntityCandidate = {
  id: string;
  label: string;
  detail: string;
};

export type VoiceEntitySelection = {
  type: 'customer' | 'product';
  reference: string;
  id: string;
};

export type VoiceResolvedItem = {
  productId: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type VoiceConfirmationAction = {
  operationId: string;
  intent: 'create_order' | 'create_consignment' | 'register_payment' | 'create_appointment';
  accountId: string;
  customerId: string;
  customerName: string;
  items: VoiceResolvedItem[];
  amount: number | null;
  expectedTotal: number | null;
  expectedBalance: number | null;
  paymentMethod: string;
  paymentDate: string | null;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  appointmentType?: 'Visita' | 'Entrega' | 'Recebimento' | 'Cobrar' | 'Outro' | null;
  appointmentNotes?: string | null;
};

export type VoiceProcessResponse =
  | {
      kind: 'clarification';
      question: string;
      candidates: VoiceEntityCandidate[];
      entity: Omit<VoiceEntitySelection, 'id'> | null;
      selections: VoiceEntitySelection[];
      draft: VoiceIntentPayload;
      transcription: string;
      metrics: VoiceMetrics;
    }
  | {
      kind: 'confirmation';
      title: string;
      message: string;
      action: VoiceConfirmationAction;
      selections: VoiceEntitySelection[];
      draft: VoiceIntentPayload;
      transcription: string;
      metrics: VoiceMetrics;
    }
  | {
      kind: 'answer' | 'unsupported';
      title: string;
      message: string;
      selections: VoiceEntitySelection[];
      draft: VoiceIntentPayload;
      transcription: string;
      metrics: VoiceMetrics;
    };

export type VoiceMetrics = {
  interpretationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export const EMPTY_VOICE_INTENT: VoiceIntentPayload = {
  intent: 'unsupported',
  customerReference: null,
  items: [],
  amount: null,
  paymentMethod: null,
  scheduledDate: null,
  scheduledTime: null,
  appointmentType: null,
  appointmentNotes: null,
  period: null,
  unsupportedReason: null,
};
