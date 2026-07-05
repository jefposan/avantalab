// ─────────────────────────────────────────────────────────────
// Telefone — normalização para o formato internacional E.164 (+DDI...).
//
// Regras:
//  • Se o número já vier com '+' (o cliente montou DDI + nacional),
//    usamos como está (só limpamos não-dígitos). É o caminho novo,
//    com o seletor de país.
//  • Sem '+': mantemos compatibilidade com o comportamento antigo
//    (Brasil). Só tratamos os dígitos como já tendo o 55 quando o
//    tamanho for de número BR completo (>= 12 dígitos); caso contrário
//    prefixamos +55. Isso evita quebrar números de DDD 55 (RS), que
//    têm 11 dígitos e começam com "55".
// ─────────────────────────────────────────────────────────────
export function formatarE164(entrada: string): string {
  const bruto = String(entrada || '').trim();
  const temMais = bruto.startsWith('+');
  const digitos = bruto.replace(/\D/g, '');
  if (!digitos) return '';
  if (temMais) return `+${digitos}`;
  if (digitos.startsWith('55') && digitos.length >= 12) return `+${digitos}`;
  return `+55${digitos}`;
}
