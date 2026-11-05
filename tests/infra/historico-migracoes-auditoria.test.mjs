import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { auditRecords, evidencePath } from '../../docs/auditorias/reconciliacao-2026-11-04/auditar-registros.mjs';
import { canonicalSql } from '../../docs/auditorias/reconciliacao-2026-11-04/sql-canonical.mjs';
const records = JSON.parse(readFileSync(evidencePath, 'utf8')).records;

test('19 fontes e comparações históricas reproduzidas sem SQL remoto', () => {
  assert.deepEqual(auditRecords(records), { sourcesVerified: 19, restoredRecordedSql: 6, damagedRegistryReproduced: 5, formattingEquivalent: 2, registryWithoutSql: 6, remoteWrites: false });
});
test('mudança da fonte ou do registro remoto quebra a evidência', () => {
  assert.throws(() => auditRecords(records, () => 'select 999;'), /Fonte histórica alterada/);
  const copy = structuredClone(records.filter(x => x.group === 'javascript-replacement-corruption'));
  copy[0].remoteStatements[0] += ' -- alterado';
  assert.throws(() => auditRecords(copy), /Corrupção não reproduzida/);
});
test('substituição literal com callback preserva dólares e aspas', () => {
  const source = "do $$ begin raise notice '$& $` $\' $$'; end $$;";
  assert.notEqual('marker'.replace('marker', source), source);
  assert.equal('marker'.replace('marker', () => source), source);
});
test('canonicalização reconhece somente a formatação equivalente esperada', () => {
  const a = 'create function public.f() returns int language sql security definer set search_path=public as $$select 1;$$;';
  const b = "CREATE FUNCTION public.f() RETURNS int LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $function$ select 1; $function$;;";
  assert.deepEqual(canonicalSql(a), canonicalSql(b));
  assert.notDeepEqual(canonicalSql(a), canonicalSql(b.replace('DEFINER', 'INVOKER')));
  assert.notDeepEqual(canonicalSql('grant select on t to service_role;'), canonicalSql('grant delete on t to service_role;'));
});
test('literais e ponto-e-vírgula dentro do corpo não são descartados', () => {
  assert.notDeepEqual(canonicalSql("select 'duas palavras';"), canonicalSql("select 'duaspalavras';"));
  assert.notDeepEqual(canonicalSql('select $$ -- texto A $$;'), canonicalSql('select $$ -- texto B $$;'));
  assert.notDeepEqual(canonicalSql('do $$begin; end;$$;'), canonicalSql('do $$begin end;$$;'));
});
test('registro ausente não pode esconder SQL, caminho externo ou versão duplicada', () => {
  const r = structuredClone(records.find(x => x.group === 'missing-sql-in-registry'));
  r.remoteStatements = ['begin; delete from qualquer_tabela; commit;'];
  assert.throws(() => auditRecords([r]), /contém SQL/);
  assert.throws(() => auditRecords([{...records[0],path:'../fora.sql'}]), /caminho/);
  assert.throws(() => auditRecords([records[0], records[0]]), /Identificador/);
});
test('comparador rejeita alteração funcional mesmo com hash da nova fonte', () => {
  const source = 'select 2;';
  const r = {version:'20261104190000',path:'supabase/migrations/20261104190000_exemplo.sql',candidateSourceSha256:createHash('sha256').update(source).digest('hex'),remoteStatements:['select 1'],group:'restored-recorded-sql'};
  assert.throws(() => auditRecords([r], () => source), /Sequência SQL diverge/);
});
