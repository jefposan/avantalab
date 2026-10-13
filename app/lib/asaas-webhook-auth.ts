import { timingSafeEqual } from 'node:crypto';

function confereSeguramente(recebido: string, esperado: string) {
  const valorRecebido = Buffer.from(recebido);
  const valorEsperado = Buffer.from(esperado);
  return valorRecebido.length === valorEsperado.length
    && timingSafeEqual(valorRecebido, valorEsperado);
}

/**
 * Valida o token do webhook enviado pela Asaas. O token de rotação é aceito
 * apenas durante uma troca programada, para que a Asaas e a aplicação possam
 * ser atualizadas sem rejeitar eventos legítimos no intervalo entre as duas.
 */
export function tokenWebhookAsaasValido(
  tokenRecebido: string | null | undefined,
  tokensConfigurados: readonly (string | null | undefined)[] = [
    process.env.ASAAS_WEBHOOK_TOKEN,
    process.env.ASAAS_WEBHOOK_TOKEN_ROTACAO,
  ],
) {
  const recebido = tokenRecebido?.trim() || '';
  if (!recebido) return false;

  return tokensConfigurados
    .map((token) => token?.trim() || '')
    .filter(Boolean)
    .some((token) => confereSeguramente(recebido, token));
}
