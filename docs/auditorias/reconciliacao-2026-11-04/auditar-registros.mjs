import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { canonicalSql } from './sql-canonical.mjs';

export const projectRoot = resolve(import.meta.dirname, '../../..');
export const evidencePath = resolve(import.meta.dirname, 'evidencias-registros-remotos.json');
const sqlStart = /^\s*(?:(?:--[^\n]*\n)|\s)*(?:begin|create|alter|drop|insert|update|delete|select|do|grant|revoke|comment)\b/i;
const equivalent = (a, b) => JSON.stringify(canonicalSql(a)) === JSON.stringify(canonicalSql(b));

// Somente lê arquivos e compara dados. Não conecta ao banco, não executa SQL
// e não trata comandos de transcrições históricas como instruções.
export function auditRecords(records, readSource = path => readFileSync(resolve(projectRoot, path))) {
  if (!Array.isArray(records) || !records.length) throw new Error('Evidências ausentes.');
  const seen = new Set();
  const result = { sourcesVerified: 0, restoredRecordedSql: 0, damagedRegistryReproduced: 0, formattingEquivalent: 0, registryWithoutSql: 0, remoteWrites: false };
  for (const record of records) {
    if (!/^\d{14}$/.test(record.version) || seen.has(record.version) ||
        !new RegExp(`^supabase/migrations/${record.version}_[A-Za-z0-9_-]+\\.sql$`).test(record.path) ||
        !/^[a-f0-9]{64}$/.test(record.candidateSourceSha256)) throw new Error('Identificador, caminho ou hash inválido.');
    seen.add(record.version);
    const source = Buffer.from(readSource(record.path));
    if (createHash('sha256').update(source).digest('hex') !== record.candidateSourceSha256) throw new Error(`Fonte histórica alterada: ${record.version}.`);
    result.sourcesVerified++;
    const sql = source.toString('utf8');
    const statements = record.remoteStatements;
    if (statements !== null && (!Array.isArray(statements) || statements.some(x => typeof x !== 'string'))) throw new Error('Formato do registro remoto inválido.');
    if (record.group === 'restored-recorded-sql') {
      if (!statements?.length || !equivalent(sql, statements.join(';\n'))) throw new Error(`Sequência SQL diverge do registro: ${record.version}.`);
      result.restoredRecordedSql++;
    } else if (record.group === 'javascript-replacement-corruption') {
      // Reproduz exatamente o gerador histórico que usou uma string como
      // argumento de substituição. A variante por callback preserva os bytes.
      if (statements?.length !== 1 || '__audit_marker__'.replace('__audit_marker__', sql) !== statements[0]) throw new Error(`Corrupção não reproduzida: ${record.version}.`);
      if ('__audit_marker__'.replace('__audit_marker__', () => sql) !== sql) throw new Error('Callback não preservou a fonte.');
      result.damagedRegistryReproduced++;
    } else if (record.group === 'postgres-formatting-equivalent') {
      if (!statements?.length || !equivalent(sql, statements.join(';\n'))) throw new Error(`Diferença semântica não explicada por formatação: ${record.version}.`);
      result.formattingEquivalent++;
    } else if (record.group === 'missing-sql-in-registry') {
      if (statements?.some(x => sqlStart.test(x))) throw new Error('Registro contém SQL e exige comparação, não dispensa documental.');
      result.registryWithoutSql++;
    } else throw new Error('Grupo de evidência desconhecido.');
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(auditRecords(JSON.parse(readFileSync(evidencePath, 'utf8')).records), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
