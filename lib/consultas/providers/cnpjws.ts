export type CnpjWsProviderErrorCode =
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'PROVIDER_UNAVAILABLE';

export class CnpjWsProviderError extends Error {
  readonly code: CnpjWsProviderErrorCode;

  constructor(code: CnpjWsProviderErrorCode, message: string) {
    super(message);
    this.name = 'CnpjWsProviderError';
    this.code = code;
  }
}

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type ConsultarCnpjWsOptions = {
  fetcher?: FetchLike;
  timeoutMs?: number;
};

const CNPJ_WS_BASE_URL = 'https://publica.cnpj.ws/cnpj';
const TIMEOUT_PADRAO_MS = 8_000;

export async function consultarCnpjWs(
  documento: string,
  options: ConsultarCnpjWsOptions = {},
): Promise<unknown> {
  const fetcher = options.fetcher ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? TIMEOUT_PADRAO_MS,
  );

  try {
    const response = await fetcher(
      `${CNPJ_WS_BASE_URL}/${encodeURIComponent(documento)}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'AvantaLab-Central-Consultas/1.0',
        },
        cache: 'no-store',
        signal: controller.signal,
      },
    );

    if (response.status === 404) {
      throw new CnpjWsProviderError(
        'NOT_FOUND',
        'Empresa não encontrada no provedor.',
      );
    }

    if (response.status === 429) {
      throw new CnpjWsProviderError(
        'RATE_LIMITED',
        'Limite temporário do provedor atingido.',
      );
    }

    if (!response.ok) {
      throw new CnpjWsProviderError(
        'PROVIDER_UNAVAILABLE',
        'O provedor não respondeu com sucesso.',
      );
    }

    try {
      return await response.json();
    } catch {
      throw new CnpjWsProviderError(
        'PROVIDER_UNAVAILABLE',
        'O provedor retornou uma resposta inválida.',
      );
    }
  } catch (error) {
    if (error instanceof CnpjWsProviderError) throw error;

    if (
      controller.signal.aborted ||
      (error instanceof DOMException && error.name === 'AbortError')
    ) {
      throw new CnpjWsProviderError(
        'TIMEOUT',
        'O provedor excedeu o tempo de resposta.',
      );
    }

    throw new CnpjWsProviderError(
      'PROVIDER_UNAVAILABLE',
      'Não foi possível acessar o provedor.',
    );
  } finally {
    clearTimeout(timeout);
  }
}
