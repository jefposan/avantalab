export const ACCOUNT_LABEL_LIMIT = 80;

/** O retorno OAuth apenas indica o ID; a conta deve vir da consulta autenticada da empresa. */
export function connectedAccountForIdentification<T extends { id: string; status: string; provider?: string; last_error_code?: string | null }>(accounts: T[], connectionId: unknown): T | undefined {
  if (typeof connectionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(connectionId)) return;
  return accounts.find(account => account.id === connectionId && (account.status === 'connected'
    || (account.provider === 'magalu' && account.status === 'attention' && account.last_error_code === 'magalu_connector_pending')));
}
type NamedAccount = { id?: string; local_label?: string | null; local_label_updated_at?: string | null; seller_name?: string | null; seller_reference: string };

export function accountDisplayName(account: NamedAccount | undefined, fallback = 'Mercado Livre'): string {
  if (!account) return fallback;
  return account.local_label?.trim() || account.seller_name || `Vendedor ${account.seller_reference}`;
}

export function accountReferenceDetail(account: NamedAccount): string {
  return account.local_label ? `${account.seller_name || `Vendedor ${account.seller_reference}`} · ID ${account.seller_reference}` : `ID ${account.seller_reference}`;
}

export function validateAccountLabel(value: unknown): string {
  if (typeof value !== 'string' || value.length > ACCOUNT_LABEL_LIMIT || /[\u0000-\u001f\u007f]/.test(value)) throw new Error('Use até 80 caracteres, em uma única linha.');
  return value.trim();
}

/** Respostas iniciadas antes de um salvamento não apagam a identificação confirmada. */
export function preserveNewerAccountLabel<T extends NamedAccount>(previous: T | undefined, incoming: T): T {
  if (previous?.local_label_updated_at && (!incoming.local_label_updated_at || Date.parse(previous.local_label_updated_at) > Date.parse(incoming.local_label_updated_at))) {
    return { ...incoming, local_label: previous.local_label, local_label_updated_at: previous.local_label_updated_at };
  }
  return incoming;
}
