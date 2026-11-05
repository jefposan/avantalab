import type { SupabaseClient } from '@supabase/supabase-js';

/** Lotes restritos aos IDs já autorizados pelo chamador, sem cache entre requisições. */
export async function consultarPorIds<T>(db: SupabaseClient, tabela: string, colunas: string, chave: string, ids: string[], desempate?: string): Promise<T[]> {
  const unicos = [...new Set(ids.filter(Boolean))];
  const linhas: T[] = [];
  // Evita URLs gigantes, truncamento de respostas e uma consulta por perfil.
  for (let inicio = 0; inicio < unicos.length; inicio += 100) {
    for (let pagina = 0; ; pagina += 1000) {
      let consulta = db.from(tabela).select(colunas).in(chave, unicos.slice(inicio, inicio + 100)).order(chave);
      if (desempate) consulta = consulta.order(desempate);
      const resultado = await consulta.range(pagina, pagina + 999);
      if (resultado.error || !Array.isArray(resultado.data)) throw new Error('Não foi possível confirmar os dados dos perfis.');
      linhas.push(...resultado.data as T[]);
      if (resultado.data.length < 1000) break;
    }
  }
  return linhas;
}
