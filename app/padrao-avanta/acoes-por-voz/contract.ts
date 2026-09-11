export const AVANTA_VOICE_ACTIONS_STANDARD_VERSION = '1.3.1' as const;

export type AvantaVoiceActionOperation =
  | 'transcribe'
  | 'process'
  | 'execute'
  | 'catalog'
  | 'log';

export type AvantaVoiceAccount = {
  id: string;
  userId?: string | null;
  label?: string;
};

export type AvantaVoiceNotificationOptions = {
  tipo?: 'sucesso' | 'erro' | 'aviso';
  titulo?: string;
  duracao?: number;
  acao?: {
    rotulo: string;
    executar: () => void | Promise<void>;
  } | null;
};

export type AvantaVoiceActionsAdapter = {
  account: AvantaVoiceAccount;
  mount: HTMLElement;
  mountId?: string;
  autoStart?: boolean;
  pendingId?: string | null;
  storageNamespace?: string;
  allowSaveForLater?: boolean;
  compactShortLists?: boolean;
  request: (
    operation: AvantaVoiceActionOperation,
    payload: Record<string, unknown> | FormData,
  ) => Promise<unknown>;
  notify?: (message: string, options?: AvantaVoiceNotificationOptions) => void;
  afterExecute?: (result: unknown) => void | Promise<void>;
  onPendingChange?: () => void;
  shareReceipt?: (recordId: string, intent: string) => void | Promise<void>;
};

export type AvantaVoiceActionsPublicApi = {
  readonly version: typeof AVANTA_VOICE_ACTIONS_STANDARD_VERSION;
  open: (adapter: AvantaVoiceActionsAdapter) => void;
  close: () => void;
};

declare global {
  interface Window {
    AvantaVoiceActions?: AvantaVoiceActionsPublicApi;
    /** Compatibilidade temporária com integrações anteriores ao padrão oficial. */
    AvantaVoiceCommand?: AvantaVoiceActionsPublicApi;
  }
}

export {};
