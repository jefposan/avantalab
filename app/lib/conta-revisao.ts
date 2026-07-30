export const EMAIL_CONTA_REVISAO_APPLE = 'teste@teste.com.br';

export function ehContaRevisaoApple(email: unknown): boolean {
  return String(email || '').trim().toLowerCase() === EMAIL_CONTA_REVISAO_APPLE;
}
