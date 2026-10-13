import 'server-only';
import { randomBytes } from 'node:crypto';

const messages = {
  disabled: 'A conexão Magalu ainda não está ativada neste ambiente.',
  configuration: 'A configuração Magalu do AvantaLab precisa ser conferida pelo administrador.',
  invalid_return: 'Não conseguimos validar este retorno. Inicie a conexão novamente no AvantaLab.',
  expired: 'A autorização expirou. Inicie uma nova conexão no AvantaLab.',
  browser_confirmation: 'Não conseguimos confirmar o navegador que iniciou a conexão. Tente novamente pelo AvantaLab.',
  cancelled: 'A autorização foi cancelada ou não aprovada no Magalu. Inicie novamente para autorizar.',
  access_changed: 'Seu acesso ao AvantaLab mudou durante a conexão. Entre novamente e tente conectar.',
  pending_database: 'O AvantaLab não conseguiu consultar sua tentativa. Tente novamente em instantes.',
  attempt_used: 'Esta tentativa já foi utilizada ou expirou. Inicie uma nova conexão.',
  token_network: 'Não conseguimos comunicar com o Magalu. Tente novamente em instantes.',
  token_timeout: 'O Magalu demorou para confirmar a conexão. Inicie novamente e tente mais uma vez.',
  provider_unavailable: 'O Magalu está indisponível no momento. Tente novamente em instantes.',
  provider_rate_limit: 'O Magalu limitou as tentativas agora. Aguarde alguns minutos e tente novamente.',
  application_rejected: 'O Magalu não aceitou a configuração do aplicativo AvantaLab. Avise o administrador.',
  authorization_rejected: 'O Magalu não aceitou esta autorização. Inicie uma nova conexão e conclua novamente.',
  permission_denied: 'O Magalu não liberou todas as consultas. Escolha a loja vendedora e autorize os acessos de vendas e pós-venda.',
  missing_scopes: 'Faltou autorizar alguma consulta. Conecte a mesma loja novamente e permita os acessos de vendas e pós-venda. Não precisa excluir a conta.',
  response_invalid: 'A resposta do Magalu não foi reconhecida pelo AvantaLab. Avise o administrador para conferir a integração.',
  identity_unconfirmed: 'Não conseguimos identificar uma loja no retorno do Magalu. Confirme o acesso da loja vendedora; se já usou esse acesso, avise o administrador.',
  seller_access_denied: 'O Magalu não liberou o acesso vendedor desta conta. Conecte novamente e escolha a loja, não o perfil pessoal. Se já escolheu a loja, confira a liberação da integração no Magalu.',
  seller_verification_failed: 'Não conseguimos confirmar a loja no Magalu agora. Tente novamente em instantes; se continuar, avise o administrador.',
  token_expired: 'O Magalu retornou uma autorização já vencida. Inicie uma nova conexão.',
  authorization_revoked: 'A autorização desta loja venceu ou foi revogada. Conecte a mesma loja novamente, sem excluir a conta.',
  connection_database: 'O AvantaLab não conseguiu salvar a conta Magalu. Tente novamente; se continuar, avise o administrador.',
  connection_changed: 'A conta mudou durante a conexão. Atualize as contas e tente conectar novamente.',
  vault_unavailable: 'O AvantaLab não conseguiu guardar a autorização com segurança. Avise o administrador.',
  unknown: 'Não conseguimos concluir a conexão Magalu. Tente novamente; se continuar, avise o administrador.',
} as const;
export type MagaluFailureCode = keyof typeof messages;
const stages = ['start', 'configuration', 'pending_lookup', 'browser_validation', 'intent_validation', 'access_check', 'consume', 'exchange', 'access_recheck', 'connection_lookup', 'save'] as const;
export type MagaluFailureStage = typeof stages[number];
const issues = ['response_json', 'token_fields', 'token_type', 'expires_in', 'scope_format', 'token_format', 'token_claims', 'token_audience', 'identity_format', 'seller_profile', 'seller_identity'] as const;
type Issue = typeof issues[number];
const databaseCodes = ['23505', '23503', '23514', '42501', '42P01', '42703', 'PGRST116', 'PGRST204'] as const;
type DatabaseCode = typeof databaseCodes[number];

export class MagaluConnectionError extends Error {
  readonly code: MagaluFailureCode;
  readonly details: { providerStatus?: number; issue?: Issue; databaseCode?: DatabaseCode };
  constructor(code: MagaluFailureCode, details: { providerStatus?: number; issue?: Issue; databaseCode?: DatabaseCode } = {}) {
    super(messages[code]);
    this.name = 'MagaluConnectionError';
    this.code = code;
    this.details = details;
  }
}

export function magaluDatabaseFailure(error: unknown, code: 'pending_database' | 'connection_database') {
  const value = error && typeof error === 'object' ? (error as { code?: unknown }).code : undefined;
  const databaseCode = databaseCodes.find(known => known === value);
  return new MagaluConnectionError(code, { ...(databaseCode ? { databaseCode } : {}) });
}

/** A resposta externa nunca vira texto de interface/log; somente categorias conhecidas. */
export function magaluProviderRejection(status: number, body: unknown) {
  const error = body && typeof body === 'object' ? (body as { error?: unknown }).error : undefined;
  let code: MagaluFailureCode = 'authorization_rejected';
  if (status === 429) code = 'provider_rate_limit';
  else if (status >= 500) code = 'provider_unavailable';
  else if (error === 'invalid_client' || error === 'unauthorized_client') code = 'application_rejected';
  else if (status === 403 || error === 'access_denied' || error === 'invalid_scope' || error === 'insufficient_scope') code = 'permission_denied';
  return new MagaluConnectionError(code, { providerStatus: status });
}

/** Só registra enums, status HTTP e referência aleatória. Nunca recebe request, tokens ou resposta bruta. */
export function reportMagaluFailure(error: unknown, stage: MagaluFailureStage) {
  const safeStage = stages.includes(stage) ? stage : 'start';
  const fallback: Partial<Record<MagaluFailureStage, MagaluFailureCode>> = {
    configuration: 'configuration', pending_lookup: 'pending_database', access_check: 'access_changed',
    access_recheck: 'access_changed', consume: 'attempt_used', intent_validation: 'configuration', connection_lookup: 'connection_database', save: 'connection_database',
  };
  const known = error instanceof MagaluConnectionError && Object.hasOwn(messages, error.code);
  const code = known ? error.code : fallback[safeStage] || 'unknown';
  const reference = randomBytes(6).toString('hex');
  const status = known ? error.details?.providerStatus : undefined;
  const issue = known ? error.details?.issue : undefined;
  const databaseCode = known ? error.details?.databaseCode : undefined;
  console.warn(JSON.stringify({ event: 'magalu_oauth_failure', reference,
    stage: safeStage, code,
    ...(Number.isInteger(status) && status! >= 100 && status! <= 599 ? { provider_status: status } : {}),
    ...(issue && issues.includes(issue) ? { issue } : {}),
    ...(databaseCode && databaseCodes.includes(databaseCode) ? { database_code: databaseCode } : {}),
  }));
  return { code, reference, message: `${messages[code]} Referência: ${reference}.` };
}
