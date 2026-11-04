import type { MarketplaceAccount } from './Anunciados';

export type MarketplaceAccountsResult = {
  accounts: MarketplaceAccount[];
  canConnect: boolean;
  canManage: boolean;
  labelsAvailable?: boolean;
  magaluCatalogAuthorizationEnabled?: boolean;
};

export function accountReadMessage(error: unknown) {
  const failure = error as { name?: string; code?: string; message?: string } | null;
  if (failure?.name === 'TimeoutError' || failure?.name === 'AbortError' || failure?.code === 'accounts_timeout' || failure?.message === 'signal timed out') {
    return 'A consulta das contas demorou mais que o esperado. Clique em Atualizar contas para tentar novamente.';
  }
  return failure?.message || 'Não foi possível consultar as contas. Clique em Atualizar contas para tentar novamente.';
}

/** Compartilha somente a leitura em andamento, sem cache de contas/permissões.
 * O prazo inclui a espera pela sessão, mesmo se essa etapa ignorar o signal. */
export function createAccountReader(action: (signal: AbortSignal) => Promise<MarketplaceAccountsResult>, timeoutMs = 30_000) {
  let pending: Promise<MarketplaceAccountsResult> | null = null;
  return () => {
    if (pending) return pending;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const failure = Object.assign(new Error(accountReadMessage({ code: 'accounts_timeout' })), { code: 'accounts_timeout' });
        reject(failure);
        controller.abort();
      }, timeoutMs);
    });
    pending = Promise.race([Promise.resolve().then(() => action(controller.signal)), deadline])
      .catch(error => {
        if (error?.name === 'TimeoutError' || error?.name === 'AbortError' || error?.message === 'signal timed out') {
          throw Object.assign(new Error(accountReadMessage(error)), { code: 'accounts_timeout' });
        }
        throw error;
      })
      .finally(() => { clearTimeout(timer); pending = null; });
    return pending;
  };
}
