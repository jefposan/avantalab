import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createFiscalProfileSaveRequest, parseFiscalProfileSnapshot } from '../../app/vendas/lib/fiscal-profile-bridge.mjs';
import { createCommercialFiscalProfileService, normalizeCommercialFiscalProfile } from '../../app/vendas/lib/server/commercial-fiscal-profile.mjs';

const companyId = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e';
const actorId = '20202020-2020-4020-8020-202020202020';
const context = { companyId, actorId, moduleId: 'vendas', active: true, moduleActive: true, effectivePermissions: { 'settings.view': true, 'settings.edit': true } };

test('produto mantém catálogo fiscal genérico e valida o recorte de cada empresa', () => {
  assert.deepEqual(normalizeCommercialFiscalProfile({ documentScope: ['nfse', 'nfe', 'nfse'], defaultDocument: 'nfe', environment: 'homologacao' }).profile.documentScope, ['nfse', 'nfe']);
  assert.equal(normalizeCommercialFiscalProfile({ documentScope: [] }).errors[0].code, 'AV-FISCAL-PROFILE-DOCUMENTS');
  assert.equal(normalizeCommercialFiscalProfile({ documentScope: ['nfe'], environment: 'producao' }).errors[0].code, 'AV-FISCAL-PROFILE-ENVIRONMENT');
});

test('perfil fiscal é isolado por empresa, versionado e protegido por permissão', async () => {
  let stored = null;
  const repository = {
    get: async ({ companyId: requested }) => requested === companyId ? stored : null,
    save: async ({ companyId: requested, expectedVersion, profile }) => {
      assert.equal(requested, companyId);
      assert.equal(expectedVersion, stored?.version || 0);
      stored = { ...profile, version: expectedVersion + 1, updatedAt: '2026-09-10T18:30:00.000Z' };
      return stored;
    },
  };
  const service = createCommercialFiscalProfileService({ repository });
  const saved = await service.save({ context, expectedVersion: 0, input: { documentScope: ['nfe'], defaultDocument: 'nfe', environment: 'homologacao' } });
  assert.equal(saved.ok, true);
  assert.deepEqual(saved.profile.documentScope, ['nfe']);
  const read = await service.get({ context });
  assert.equal(read.canWrite, true);
  assert.equal(read.profile.version, 1);
  const denied = await service.save({ context: { ...context, effectivePermissions: { 'settings.view': true } }, expectedVersion: 1, input: { documentScope: ['nfe'] } });
  assert.equal(denied.errors[0].code, 'AV-FISCAL-PROFILE-PERMISSION');
});

test('bridge só aceita documentos conhecidos e perfil persistido válido', () => {
  assert.equal(createFiscalProfileSaveRequest({ requestId: 'fiscal:profile:1234', expectedVersion: 2, documentScope: ['nfe', 'desconhecido'], defaultDocument: 'nfe', environment: 'homologacao' }), null);
  const request = createFiscalProfileSaveRequest({ requestId: 'fiscal:profile:1234', expectedVersion: 2, documentScope: ['nfe'], defaultDocument: 'nfe', environment: 'homologacao' });
  assert.deepEqual(request.documentScope, ['nfe']);
  const snapshot = parseFiscalProfileSnapshot({ type: 'AVANTALAB_VENDAS_FISCAL_PROFILE_SNAPSHOT_V1', snapshot: { available: true, writable: true, profile: { documentScope: ['nfe'], defaultDocument: 'nfe', environment: 'homologacao', version: 1 } } });
  assert.deepEqual(snapshot.profile.documentScope, ['nfe']);
});

test('migração cria configuração genérica e limita a Tridium ao piloto NF-e', async () => {
  const sql = await readFile(new URL('../../supabase/migrations/20260910183000_vendas_perfil_fiscal_empresa.sql', import.meta.url), 'utf8');
  assert.match(sql, /vendas_fiscal_perfis/);
  assert.match(sql, /array\['nfe','nfce','nfse'\]/);
  assert.match(sql, /ec9604fd-38f2-429b-9c00-c4bc6c642b0e[\s\S]*array\['nfe'\]/);
  assert.match(sql, /force row level security/i);
});

test('integração salva e recarrega o perfil sem entregar token ao iframe', async () => {
  const source = await readFile(new URL('../../app/vendas/VendasIntegrado.tsx', import.meta.url), 'utf8');
  assert.match(source, /\/api\/modulos\/vendas\/fiscal\/profile/);
  assert.match(source, /FISCAL_PROFILE_SAVE_REQUEST_TYPE/);
  assert.doesNotMatch(source, /postMessage\([^\n]*access_token/);
});
