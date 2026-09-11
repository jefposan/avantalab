export type ClienteVozCampo = {
  id: string;
  companyId: string;
  subcompanyId: string | null;
  label: string;
  detail: string;
  searchable: string;
};

const TERMOS_DE_ACAO = new Set([
  'agenda', 'agendar', 'agendamento', 'anota', 'anotar', 'baixa', 'baixar',
  'cliente', 'cobranca', 'empresa', 'lanca', 'lancar', 'marca', 'marcar',
  'pagamento', 'pagar', 'recebe', 'recebendo', 'receber', 'recebimento',
  'servico', 'valor',
]);

export function normalizarBuscaVozCampo(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(value: string, removerAcoes = false) {
  const encontrados = normalizarBuscaVozCampo(value).split(' ').filter((item) => item.length >= 2);
  const filtrados = removerAcoes ? encontrados.filter((item) => !TERMOS_DE_ACAO.has(item)) : encontrados;
  return [...new Set(filtrados.length ? filtrados : encontrados)];
}

function distanciaEdicao(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

function similaridadeEdicao(left: string, right: string) {
  const maior = Math.max(left.length, right.length);
  return maior ? 1 - distanciaEdicao(left, right) / maior : 0;
}

function similaridadeJaroWinkler(left: string, right: string) {
  if (left === right) return 1;
  if (!left || !right) return 0;
  const distance = Math.max(Math.floor(Math.max(left.length, right.length) / 2) - 1, 0);
  const leftMatches = new Array(left.length).fill(false);
  const rightMatches = new Array(right.length).fill(false);
  let matches = 0;
  for (let index = 0; index < left.length; index += 1) {
    const start = Math.max(0, index - distance);
    const end = Math.min(index + distance + 1, right.length);
    for (let candidate = start; candidate < end; candidate += 1) {
      if (!rightMatches[candidate] && left[index] === right[candidate]) {
        leftMatches[index] = true;
        rightMatches[candidate] = true;
        matches += 1;
        break;
      }
    }
  }
  if (!matches) return 0;
  let transpositions = 0;
  for (let leftIndex = 0, rightIndex = 0; leftIndex < left.length; leftIndex += 1) {
    if (!leftMatches[leftIndex]) continue;
    while (!rightMatches[rightIndex]) rightIndex += 1;
    if (left[leftIndex] !== right[rightIndex]) transpositions += 1;
    rightIndex += 1;
  }
  const jaro = (matches / left.length + matches / right.length + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < Math.min(4, left.length, right.length) && left[prefix] === right[prefix]) prefix += 1;
  return jaro + prefix * .1 * (1 - jaro);
}

function formaFonetica(value: string) {
  return normalizarBuscaVozCampo(value)
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/ch|sh/g, 'x')
    .replace(/lh/g, 'li')
    .replace(/nh/g, 'ni')
    .replace(/qu/g, 'k')
    .replace(/gu(?=[ei])/g, 'g')
    .replace(/[ckq]/g, 'k')
    .replace(/y/g, 'i')
    .replace(/w/g, 'v')
    .replace(/z/g, 's')
    .replace(/([a-z])\1+/g, '$1');
}

function similaridadeToken(left: string, right: string) {
  return Math.max(
    similaridadeEdicao(left, right),
    similaridadeJaroWinkler(left, right),
    similaridadeJaroWinkler(formaFonetica(left), formaFonetica(right)),
  );
}

function prefixoComum(left: string, right: string) {
  let total = 0;
  while (total < Math.min(left.length, right.length) && left[total] === right[total]) total += 1;
  return total;
}

export function pontuarClienteVozCampo(reference: string, cliente: ClienteVozCampo) {
  const query = normalizarBuscaVozCampo(reference);
  const label = normalizarBuscaVozCampo(cliente.label);
  const searchable = normalizarBuscaVozCampo(cliente.searchable);
  if (!query || !label) return 0;
  if (query === label) return 1;
  if (label.startsWith(query)) return .96;
  if (label.includes(query)) return .94;
  if (query.includes(label) && label.length >= 4) return .92;

  const queryTokens = tokens(reference, true);
  const labelTokens = tokens(cliente.label);
  const searchableTokens = tokens(searchable);
  if (!queryTokens.length || !searchableTokens.length) return 0;
  const matches = queryTokens.map((queryToken) => searchableTokens.reduce(
    (best, fieldToken) => Math.max(best, similaridadeToken(queryToken, fieldToken)),
    0,
  ));
  const strong = matches.filter((match) => match >= .78).length;
  const average = matches.reduce((sum, match) => sum + match, 0) / matches.length;
  const labelBest = queryTokens.reduce((best, queryToken) => Math.max(
    best,
    ...labelTokens.map((labelToken) => similaridadeToken(queryToken, labelToken)),
  ), 0);
  const compact = similaridadeJaroWinkler(queryTokens.join(''), labelTokens.join(''));
  if (queryTokens.length === 1) {
    const queryToken = queryTokens[0];
    const direct = labelTokens.reduce((best, labelToken) => Math.max(
      best,
      similaridadeEdicao(queryToken, labelToken),
      similaridadeJaroWinkler(queryToken, labelToken),
    ), 0);
    const edit = labelTokens.reduce((best, labelToken) => Math.max(best, similaridadeEdicao(queryToken, labelToken)), 0);
    const prefix = labelTokens.reduce((best, labelToken) => Math.max(best, prefixoComum(queryToken, labelToken)), 0);
    if (edit >= .8 || direct >= .93) return Math.min(.98, .79 + direct * .2);
    if (direct >= .84 && prefix >= 3) return Math.min(.9, .68 + direct * .23);
    if (searchableTokens.includes(queryToken)) return .76;
    return 0;
  }
  if (strong === queryTokens.length) return Math.min(.98, .79 + average * .19);
  if (strong && labelBest >= .82) return Math.min(.9, .55 + average * .25 + strong / queryTokens.length * .1);
  return compact >= .82 ? Math.min(.88, compact * .9) : 0;
}

export function resolverClienteVozCampo(reference: string, clientes: ClienteVozCampo[], selectedId?: string | null) {
  if (selectedId) {
    const selecionado = clientes.find((item) => item.id === selectedId);
    if (selecionado) return { selected: selecionado, candidates: [] as ClienteVozCampo[] };
  }
  const classificados = clientes
    .map((item) => ({ item, score: pontuarClienteVozCampo(reference, item) }))
    .filter((item) => item.score >= .58)
    .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label, 'pt-BR'));
  const primeiro = classificados[0];
  const segundo = classificados[1];
  if (primeiro && primeiro.score >= .88 && (!segundo || primeiro.score - segundo.score >= .1)) {
    return { selected: primeiro.item, candidates: [] as ClienteVozCampo[] };
  }
  if (primeiro && !segundo && primeiro.score >= .74) {
    return { selected: primeiro.item, candidates: [] as ClienteVozCampo[] };
  }
  return { selected: null, candidates: classificados.slice(0, 6).map((item) => item.item) };
}
