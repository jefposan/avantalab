import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import XLSX from 'xlsx';

const [arquivoPlanilha, nomePerfil, arquivoSaida] = process.argv.slice(2);
if (!arquivoPlanilha || !nomePerfil || !arquivoSaida) {
  throw new Error('Uso: node scripts/gerar-sql-importacao-recebimentos.mjs <planilha.xlsx> <perfil> <saida.sql>');
}

const livro = XLSX.readFile(arquivoPlanilha, { cellDates: false });
const aba = livro.SheetNames[0];
const linhas = XLSX.utils.sheet_to_json(livro.Sheets[aba], { defval: null })
  .map((linha) => ({
    status: String(linha.Status ?? '').trim().toLowerCase(),
    empresa: String(linha.EMPRESA ?? '').trim(),
    subempresa: String(linha.SUBEMPRESA ?? '').trim(),
    valor: linha.Valor == null || linha.Valor === '' ? null : Number(linha.Valor),
  }))
  .filter((linha) => linha.empresa || linha.subempresa);

for (const [indice, linha] of linhas.entries()) {
  if (!['ativo', 'cancelado', 'inativo'].includes(linha.status)) throw new Error(`Status inválido na linha ${indice + 2}.`);
  if (!linha.empresa || !linha.subempresa) throw new Error(`Empresa ou subempresa ausente na linha ${indice + 2}.`);
  if (linha.valor != null && (!Number.isFinite(linha.valor) || linha.valor <= 0)) throw new Error(`Valor inválido na linha ${indice + 2}.`);
}

const sql = [
  '-- Importação gerada a partir da planilha revisada.',
  `-- Aba: ${aba}. Linhas: ${linhas.length}.`,
  '-- A correção abaixo impede a sincronização de recorrências durante a carga administrativa.',
  fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/20260724014000_evitar_recorrencia_durante_importacao_planilha.sql'), 'utf8').trim(),
  '-- A função faz a limpeza de Recebimentos somente do perfil informado e importa a nova base em uma transação.',
  `select public.recebimentos_importar_planilha('${nomePerfil.replace(/'/g, "''")}', $json$${JSON.stringify(linhas)}$json$::jsonb);`,
  '',
].join('\n');

fs.mkdirSync(path.dirname(arquivoSaida), { recursive: true });
fs.writeFileSync(arquivoSaida, sql, 'utf8');
console.log(JSON.stringify({ aba, linhas: linhas.length, semValor: linhas.filter((linha) => linha.valor == null).length, arquivoSaida }, null, 2));
