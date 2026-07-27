const CONECTIVOS_NOME = new Set(['da', 'das', 'de', 'do', 'dos', 'e']);

export function validarNomeCompleto(valor: unknown) {
  const nomes = String(valor || '')
    .trim()
    .split(/\s+/)
    .filter((parte) => parte && !CONECTIVOS_NOME.has(parte.toLocaleLowerCase('pt-BR')));

  return nomes.length >= 2;
}
