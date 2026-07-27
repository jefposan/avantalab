const CONECTIVOS_NOME = new Set(['da', 'das', 'de', 'do', 'dos', 'e']);
const PARTE_NOME_VALIDA = /^\p{L}+(?:['’\-]\p{L}+)*$/u;

function parteNomeValida(parte: string) {
  if (!PARTE_NOME_VALIDA.test(parte)) return false;
  return Array.from(parte).filter((caractere) => /\p{L}/u.test(caractere)).length >= 2;
}

export function validarNomeCompleto(valor: unknown) {
  const partes = String(valor || '')
    .normalize('NFC')
    .trim()
    .split(/\s+/);

  if (partes.some((parte) => (
    !CONECTIVOS_NOME.has(parte.toLocaleLowerCase('pt-BR')) && !parteNomeValida(parte)
  ))) return false;

  const nomes = partes.filter(
    (parte) => parte && !CONECTIVOS_NOME.has(parte.toLocaleLowerCase('pt-BR')),
  );

  return nomes.length >= 2;
}
