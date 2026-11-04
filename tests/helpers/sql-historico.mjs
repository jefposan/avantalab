import { readFileSync } from 'node:fs';

const provenance = JSON.parse(readFileSync(new URL('../../supabase/historico-sem-registro/proveniencia.json', import.meta.url), 'utf8'));
const historicalNames = new Set(provenance.files.map(file => file.path.split('/').at(-1)));

// Resolve somente a origem do SQL de teste; não consulta ou aplica banco remoto.
export function sqlDeTesteURL(name) {
  if (!/^\d{14}_[a-zA-Z0-9_-]+\.sql$/.test(name)) throw new Error('Nome de SQL de teste inválido.');
  return historicalNames.has(name)
    ? new URL(`../../supabase/historico-sem-registro/${name}`, import.meta.url)
    : new URL(`../../supabase/migrations/${name}`, import.meta.url);
}
