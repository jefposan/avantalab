/** Limita a espera da interface, inclusive se a busca de sessão não resolver.
 * Timeout de publicação nunca equivale a recusa: manter a chave para evitar duplicação. */
export async function publicationRequest<T>(action: (signal: AbortSignal) => Promise<T>, kind: 'prepare' | 'publish', timeoutMs = kind === 'publish' ? 75_000 : 60_000): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error(kind === 'publish'
        ? 'A resposta demorou mais que o esperado. A publicação pode ter sido recebida. Confira Anunciados e o Mercado Livre antes de repetir; seus dados foram mantidos.'
        : 'A preparação demorou mais que o esperado. Seus dados foram mantidos. Tente validar novamente, sem recarregar a página.'), { code: kind === 'publish' ? 'publication_uncertain' : 'preparation_timeout' }));
      controller.abort();
    }, timeoutMs);
  });
  try { return await Promise.race([Promise.resolve().then(() => action(controller.signal)), expired]); }
  finally { clearTimeout(timer); }
}
