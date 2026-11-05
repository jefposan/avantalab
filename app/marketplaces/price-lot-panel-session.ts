export class LotPanelTimeoutError extends Error {
  constructor() {
    super('Não foi possível confirmar a operação dentro do tempo limite. Atualize o lote antes de tentar novamente.');
    this.name = 'TimeoutError';
  }
}

/** Cancela a espera local mesmo quando o transporte (ex.: obter sessão) ignora o sinal. */
export function createLotPanelSession() {
  let open = true;
  const pending = new Set<AbortController>();
  const closed = () => new DOMException('Painel de lotes fechado.', 'AbortError');
  return {
    isOpen: () => open,
    close() {
      if (!open) return;
      open = false;
      for (const controller of pending) controller.abort(closed());
      pending.clear();
    },
    async run<T>(task: (signal: AbortSignal) => Promise<T>, timeoutMs = 20_000): Promise<T> {
      if (!open) throw closed();
      const controller = new AbortController();
      pending.add(controller);
      let rejectAbort: () => void = () => {};
      const aborted = new Promise<never>((_, reject) => {
        rejectAbort = () => reject(controller.signal.reason || closed());
        controller.signal.addEventListener('abort', rejectAbort, { once: true });
      });
      const timer = setTimeout(() => controller.abort(new LotPanelTimeoutError()), timeoutMs);
      try {
        return await Promise.race([
          aborted,
          Promise.resolve().then(() => {
            if (controller.signal.aborted || !open) throw controller.signal.reason || closed();
            return task(controller.signal);
          }),
        ]);
      } finally {
        clearTimeout(timer);
        controller.signal.removeEventListener('abort', rejectAbort);
        pending.delete(controller);
      }
    },
  };
}
