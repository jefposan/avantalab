const EMAIL_CADASTRO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function normalizarEmail(valor: unknown) {
  return String(valor || '').trim().toLowerCase();
}

export function validarEmail(valor: unknown) {
  const email = normalizarEmail(valor);
  return email.length <= 254 && EMAIL_CADASTRO.test(email);
}
