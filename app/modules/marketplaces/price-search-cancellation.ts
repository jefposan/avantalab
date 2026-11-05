/** Interrompe também o intervalo entre consultas, sem deixar timers pendentes. */
export function waitForPriceSearch(milliseconds: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const finish = () => { signal.removeEventListener('abort', cancel); resolve(); };
    const timer = setTimeout(finish, milliseconds);
    const cancel = () => { clearTimeout(timer); signal.removeEventListener('abort', cancel); reject(signal.reason); };
    signal.addEventListener('abort', cancel, { once: true });
  });
}

/** Cobre sessão, fetch e corpo, mesmo se uma etapa ignorar o sinal de aborto. */
export async function boundedPriceRequest<T>(operation: (signal: AbortSignal) => Promise<T>, external?: AbortSignal | null, milliseconds = 65_000): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(external?.reason);
  if (external?.aborted) abort(); else external?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error('A operação demorou mais que o esperado. Confira os dados antes de repetir.')), milliseconds);
  let release: (() => void) | undefined;
  try {
    controller.signal.throwIfAborted();
    const interrupted = new Promise<never>((_, reject) => {
      const cancel = () => reject(controller.signal.reason);
      controller.signal.addEventListener('abort', cancel, { once: true });
      release = () => controller.signal.removeEventListener('abort', cancel);
    });
    return await Promise.race([interrupted, operation(controller.signal)]);
  } finally { clearTimeout(timer); release?.(); external?.removeEventListener('abort', abort); }
}
