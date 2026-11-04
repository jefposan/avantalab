type Attribute = { id: string; value: string };
const identity = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const length = (value: string) => Array.from(value).length;

/** Compacta somente uma identidade comprovada; nunca corta um modelo para caber. */
export function productRegistrationName(name: string, attributes: readonly Attribute[] = [], limit = 60): string {
  const original = name.trim().replace(/\s+/g, ' ');
  if (length(original) <= limit) return original;
  const value = (...ids: string[]) => attributes.find(item => ids.includes(item.id.toUpperCase()) && item.value.trim() && !/^(gen[eé]ric[oa]|sem marca|sem modelo|n\/a|n[aã]o informado)$/i.test(item.value.trim()))?.value.trim();
  const brand = value('BRAND', 'MARCA'), model = value('MODEL', 'MODELO', 'MPN');
  // Sem marca e modelo confirmados, manter o nome para revisão é mais seguro.
  if (!brand || !model) return original;
  const position = original.toLocaleLowerCase('pt-BR').indexOf(brand.toLocaleLowerCase('pt-BR'));
  if (position < 0) return original;
  const typeText = position === 0 ? original.slice(brand.length).trim() : original.slice(0, position).trim();
  const modelPosition = typeText.toLocaleLowerCase('pt-BR').indexOf(model.toLocaleLowerCase('pt-BR'));
  const prefix = (modelPosition > 0 ? typeText.slice(0, modelPosition) : typeText).trim().replace(/[-–—,;:]$/, '').trim();
  if (!prefix) return original;
  const essentials: string[] = [];
  const add = (text?: string) => { if (text && !essentials.some(part => identity(part).includes(identity(text)))) essentials.push(text); };
  add(brand);
  const line = value('LINE', 'LINHA');
  if (line && !identity(model).includes(identity(line))) add(line);
  add(model);
  // Códigos adicionais e variantes não podem desaparecer junto com os adjetivos.
  for (const token of original.match(/\b[A-Za-z0-9]+(?:[-/][A-Za-z0-9]+)*\b/g) || []) {
    if (/[a-z]/i.test(token) && /\d/.test(token) && !/^\d+(?:w|kw|v|hz|cm|mm|m|kg|g|ml|l|btu|btus|em\d+)$/i.test(token)) add(token);
  }
  for (const ids of [['VOLTAGE', 'VOLTAGEM'], ['COLOR', 'COR'], ['CAPACITY', 'TOTAL_CAPACITY', 'STORAGE_CAPACITY'], ['SIZE', 'TAMANHO', 'SCREEN_SIZE']]) add(value(...ids));
  for (const match of original.matchAll(/\b(?:bivolt|\d{2,3}\s*(?:v|volts?)|\d+(?:[.,]\d+)?\s*(?:gb|tb|kg|ml|l|litros?))\b/gi)) add(match[0]);
  const suffix = essentials.join(' ');
  const full = `${prefix} ${suffix}`;
  if (length(full) <= limit) return full;
  // O prefixo é o tipo do produto. Só removemos palavras inteiras de sua cauda;
  // marca, linha, modelo e variantes permanecem intactos.
  const words = prefix.split(' ');
  while (words.length > 1) {
    words.pop();
    while (words.length > 1 && /^(de|do|da|dos|das|e|com|para)$/i.test(words.at(-1)!)) words.pop();
    const candidate = `${words.join(' ')} ${suffix}`;
    if (length(candidate) <= limit) return candidate;
  }
  return original;
}
