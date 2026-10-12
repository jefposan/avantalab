/** Leituras automáticas atualizam avisos; só ações explícitas substituem a tela. */
export function createPassiveRefresh<T>(options: {
  read: (signal: AbortSignal) => Promise<T>;
  onLatest: (data: T) => void;
  onVisible: (data: T) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: unknown) => void;
}) {
  let stopped = false;
  let current: { controller: AbortController; manual: boolean } | null = null;
  let pending = false;
  async function run(manual: boolean): Promise<void> {
    if (stopped) return;
    if (current && !manual) { pending = true; return; }
    current?.controller.abort();
    const request = { controller: new AbortController(), manual };
    current = request;
    if (manual) options.onLoading(true);
    try {
      const data = await options.read(request.controller.signal);
      if (stopped || current !== request || request.controller.signal.aborted) return;
      options.onLatest(data);
      if (manual) options.onVisible(data);
    } catch (error) {
      if (!stopped && current === request && !request.controller.signal.aborted && manual) options.onError(error);
    } finally {
      if (!stopped && current === request) {
        current = null;
        if (manual) options.onLoading(false);
        if (pending) { pending = false; void run(false); }
      }
    }
  }
  return {
    manual: () => run(true),
    background: () => run(false),
    stop: () => { stopped = true; pending = false; current?.controller.abort(); current = null; },
  };
}

/** O horário da consulta muda mesmo sem alteração do anúncio. */
export function listingDisplaySignature(data: { listings: Array<{ snapshot: { syncedAt?: string | null } }>; total: number }) {
  return JSON.stringify({ total: data.total, listings: data.listings.map(row => ({ ...row, snapshot: { ...row.snapshot, syncedAt: undefined } })) });
}
