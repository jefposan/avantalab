// ─────────────────────────────────────────────────────────────
// Adaptador da Asaas (SÓ servidor — nunca importar no cliente).
//
// A chave da API vem de variável de ambiente (ASAAS_API_KEY), igual à
// chave de service role do Supabase. Nunca fica no código.
//
// O endereço da API é escolhido pelo prefixo da chave:
//   $aact_prod_...  → produção
//   $aact_hmlg_...  → sandbox (testes)
// ─────────────────────────────────────────────────────────────

const API_KEY = normalizarSecret(process.env.ASAAS_API_KEY);

function baseUrl(): string {
  if (process.env.ASAAS_BASE_URL) return process.env.ASAAS_BASE_URL.replace(/\/$/, '');
  return API_KEY.startsWith('$aact_prod_')
    ? 'https://api.asaas.com/v3'
    : 'https://api-sandbox.asaas.com/v3';
}

type AsaasResposta<T> = { ok: boolean; status: number; data: T | null; erro?: string };

function normalizarSecret(valor: string | undefined) {
  return (valor || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\s/g, '')
    .replace(/[^\x21-\x7E]/g, '');
}

async function asaasFetch<T = unknown>(caminho: string, init?: RequestInit): Promise<AsaasResposta<T>> {
  if (!API_KEY) return { ok: false, status: 0, data: null, erro: 'ASAAS_API_KEY não configurada' };
  try {
    const resp = await fetch(`${baseUrl()}${caminho}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        // User-Agent é obrigatório para contas novas da Asaas.
        'User-Agent': 'AvantaLab',
        access_token: API_KEY,
        ...(init?.headers || {}),
      },
    });
    const texto = await resp.text();
    const data = texto ? JSON.parse(texto) : null;
    const erro = resp.ok
      ? undefined
      : ((data as { errors?: { description?: string }[] })?.errors?.[0]?.description || `erro Asaas ${resp.status}`);
    return { ok: resp.ok, status: resp.status, data: data as T, erro };
  } catch (e) {
    return { ok: false, status: 0, data: null, erro: e instanceof Error ? e.message : 'falha de rede' };
  }
}

// Cria um cliente na Asaas (guardamos o empresa_id em externalReference).
export function criarClienteAsaas(dados: {
  name: string;
  cpfCnpj?: string;
  email?: string;
  externalReference?: string;
}) {
  return asaasFetch<{ id: string }>('/customers', { method: 'POST', body: JSON.stringify(dados) });
}

// Cria uma assinatura recorrente (mensal/anual).
export function criarAssinaturaAsaas(dados: {
  customer: string;                                  // id do cliente na Asaas
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'UNDEFINED';
  value: number;                                     // valor por ciclo (R$)
  nextDueDate: string;                               // 'AAAA-MM-DD'
  cycle: 'MONTHLY' | 'YEARLY';
  description?: string;
  externalReference?: string;                        // empresa_id do nosso sistema
}) {
  return asaasFetch<{ id: string }>('/subscriptions', { method: 'POST', body: JSON.stringify(dados) });
}

// Consulta uma assinatura na Asaas.
export type AssinaturaAsaas = {
  id: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  value?: number;
  cycle?: string;
  nextDueDate?: string;
  billingType?: string;
  description?: string;
};

export type CobrancaAssinaturaAsaas = {
  id: string;
  invoiceUrl?: string;
  status?: string;
  dueDate?: string;
  value?: number;
  billingType?: string;
  paymentDate?: string;
  confirmedDate?: string;
  description?: string;
};

export function obterAssinaturaAsaas(id: string) {
  return asaasFetch<AssinaturaAsaas>(`/subscriptions/${id}`, { method: 'GET' });
}

export function atualizarAssinaturaAsaas(id: string, dados: {
  value?: number;
  cycle?: 'MONTHLY' | 'YEARLY';
  status?: 'ACTIVE' | 'INACTIVE';
  nextDueDate?: string;
  description?: string;
  updatePendingPayments?: boolean;
}) {
  return asaasFetch<AssinaturaAsaas>(`/subscriptions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dados),
  });
}

export function removerAssinaturaAsaas(id: string) {
  return asaasFetch(`/subscriptions/${id}`, { method: 'DELETE' });
}

// Lista as cobranças de uma assinatura (a 1ª traz o link de pagamento: invoiceUrl).
export function listarCobrancasAssinaturaAsaas(id: string) {
  return asaasFetch<{ data: CobrancaAssinaturaAsaas[] }>(
    `/subscriptions/${id}/payments`,
    { method: 'GET' }
  );
}
