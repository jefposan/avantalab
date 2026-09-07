export const EMAIL_CONTA_REVISAO_APPLE = 'teste@teste.com.br';
export const EMAIL_CONTA_REVISAO_GOOGLE = (process.env.EMAIL_CONTA_REVISAO_GOOGLE || '').trim().toLowerCase();

export function emailsContaRevisaoLojas() {
  return [EMAIL_CONTA_REVISAO_APPLE, EMAIL_CONTA_REVISAO_GOOGLE].filter(Boolean);
}

export function ehContaRevisaoApple(email: unknown): boolean {
  return String(email || '').trim().toLowerCase() === EMAIL_CONTA_REVISAO_APPLE;
}

export function ehContaRevisaoLoja(email: unknown): boolean {
  return emailsContaRevisaoLojas().includes(String(email || '').trim().toLowerCase());
}
