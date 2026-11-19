const EMAIL_CADASTRO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function normalizarEmail(valor: unknown) {
  return String(valor || '').trim().toLowerCase();
}

export function validarEmail(valor: unknown) {
  const email = normalizarEmail(valor);
  return email.length <= 254 && EMAIL_CADASTRO.test(email);
}

/** Identificador técnico do Auth; nunca é um endereço de contato ou recuperação. */
export function emailTecnicoUsuario(valor: unknown) {
  return normalizarEmail(valor).endsWith('@usuarios.avantalab.local');
}

export function emailPessoalUsuario(valor: unknown) {
  return emailTecnicoUsuario(valor) ? '' : normalizarEmail(valor);
}
