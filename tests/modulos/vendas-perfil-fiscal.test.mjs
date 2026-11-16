import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { createFiscalProfileSaveRequest, parseFiscalProfileSnapshot } from '../../app/vendas/lib/fiscal-profile-bridge.mjs';
import { createCommercialFiscalProfileService, normalizeCommercialFiscalProfile } from '../../app/vendas/lib/server/commercial-fiscal-profile.mjs';

const companyId = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e';
const actorId = '20202020-2020-4020-8020-202020202020';
const context = { companyId, actorId, moduleId: 'vendas', active: true, moduleActive: true, effectivePermissions: { 'settings.view': true, 'settings.edit': true } };

async function readTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const contents = await Promise.all(entries.map(async (entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return readTree(path);
    if (!/\.(?:js|jsx|mjs|ts|tsx)$/.test(entry.name)) return '';
    return readFile(path, 'utf8');
  }));
  return contents.flat(Infinity).join('\n');
}

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

test('AvantaVendas e Conteúdo AvantaVendas permanecem fora da emissão fiscal', async () => {
  const [avantaVendas, conteudo, manual] = await Promise.all([
    readTree('app/avantavendas'),
    readTree('app/mobile/conteudo-vendas'),
    readFile('docs/ava/vendas.md', 'utf8'),
  ]);
  assert.doesNotMatch(avantaVendas, /FISCAL_PROFILE_|\/fiscal\/profile/);
  assert.doesNotMatch(conteudo, /FISCAL_PROFILE_|\/fiscal\/profile/);
  assert.match(manual, /Este aplicativo\s+> não emite NF-e, NFC-e nem NFS-e/i);
  assert.match(manual, /Vendas e Serviços da Gestão Web/i);
});

test('repositório real atualiza perfil existente e relê NFC-e e NFS-e desativadas, recusando versão antiga',async()=>{
 const {PGlite}=await import('@electric-sql/pglite');
 const {createPostgresCommercialFiscalProfileRepository}=await import('../../app/vendas/lib/server/commercial-fiscal-profile.mjs');
 const db=new PGlite();
 try{
  await db.exec(`create table public.vendas_fiscal_perfis(empresa_id uuid primary key,documentos_habilitados text[],documento_padrao text,ambiente_fiscal text,versao int,atualizado_por uuid,atualizado_em timestamptz default now());
  create function bump_profile_version() returns trigger language plpgsql as $$begin new.versao=old.versao+1;return new;end$$;
  create trigger bump before update on public.vendas_fiscal_perfis for each row execute function bump_profile_version();`);
  const repository=createPostgresCommercialFiscalProfileRepository({pool:db});
  const service=createCommercialFiscalProfileService({repository});
  const initial=await service.save({context,expectedVersion:0,input:{documentScope:['nfe','nfce','nfse'],defaultDocument:'nfe',environment:'homologacao'}});
  assert.equal(initial.ok,true);
  const saved=await service.save({context,expectedVersion:initial.profile.version,input:{documentScope:['nfe'],defaultDocument:'nfe',environment:'homologacao'}});
  assert.equal(saved.ok,true);assert.equal(saved.profile.version,2);
  assert.deepEqual((await service.get({context})).profile.documentScope,['nfe']);
  const stale=await service.save({context,expectedVersion:1,input:{documentScope:['nfe','nfce','nfse'],defaultDocument:'nfe',environment:'homologacao'}});
  assert.equal(stale.ok,false);assert.equal(stale.errors[0].code,'AV-FISCAL-PROFILE-CONFLICT');
  assert.deepEqual((await service.get({context})).profile.documentScope,['nfe']);
 }finally{await db.close();}
});
