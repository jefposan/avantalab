import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

const requireFromTest = createRequire(import.meta.url);
const ambienteOriginal = {
  BACKUP_NUVEM_ENCRYPTION_KEY: process.env.BACKUP_NUVEM_ENCRYPTION_KEY,
  GOOGLE_DRIVE_CLIENT_ID: process.env.GOOGLE_DRIVE_CLIENT_ID,
  GOOGLE_DRIVE_CLIENT_SECRET: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  MICROSOFT_ONEDRIVE_CLIENT_ID: process.env.MICROSOFT_ONEDRIVE_CLIENT_ID,
  MICROSOFT_ONEDRIVE_CLIENT_SECRET: process.env.MICROSOFT_ONEDRIVE_CLIENT_SECRET,
};
const fetchOriginal = globalThis.fetch;
let pastaCompilada;
let backup;

function respostaJson(dados, status = 200) {
  return new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json' } });
}

function restaurarAmbiente() {
  for (const [chave, valor] of Object.entries(ambienteOriginal)) {
    if (valor === undefined) delete process.env[chave];
    else process.env[chave] = valor;
  }
  globalThis.fetch = fetchOriginal;
}

before(() => {
  pastaCompilada = mkdtempSync(path.join(tmpdir(), 'avanta-backup-nuvem-tests-'));
  const servidorOnly = path.join(pastaCompilada, 'node_modules', 'server-only');
  mkdirSync(servidorOnly, { recursive: true });
  writeFileSync(path.join(servidorOnly, 'index.js'), 'module.exports = {};');
  execFileSync(path.join(process.cwd(), 'node_modules/.bin/tsc'), [
    'app/lib/backup-nuvem-servidor.ts', '--outDir', pastaCompilada,
    '--module', 'commonjs', '--target', 'ES2022', '--moduleResolution', 'node',
    '--esModuleInterop', '--skipLibCheck', '--strict',
  ], { cwd: process.cwd(), stdio: 'pipe' });
  backup = requireFromTest(path.join(pastaCompilada, 'backup-nuvem-servidor.js'));
  process.env.BACKUP_NUVEM_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  process.env.GOOGLE_DRIVE_CLIENT_ID = 'google-client';
  process.env.GOOGLE_DRIVE_CLIENT_SECRET = 'google-secret';
  process.env.MICROSOFT_ONEDRIVE_CLIENT_ID = 'microsoft-client';
  process.env.MICROSOFT_ONEDRIVE_CLIENT_SECRET = 'microsoft-secret';
});

after(() => {
  restaurarAmbiente();
  if (pastaCompilada) rmSync(pastaCompilada, { recursive: true, force: true });
});

test('credenciais são cifradas com autenticação e detectam alteração', () => {
  const cifra = backup.cifrarBackupNuvem('refresh-token-seguro');
  assert.match(cifra, /^v1\.[^.]+\.[^.]+\.[^.]+$/);
  assert.equal(backup.decifrarBackupNuvem(cifra), 'refresh-token-seguro');
  assert.throws(() => backup.decifrarBackupNuvem(`${cifra}alterado`), /unable to authenticate|Unsupported state|invalid/i);
});

test('OAuth usa callbacks, escopos mínimos e estado anti-CSRF corretos', () => {
  const google = new URL(backup.urlAutorizacaoBackup('google_drive', 'https://avantalab.com.br/gestao', 'estado-seguro'));
  assert.equal(google.origin, 'https://accounts.google.com');
  assert.equal(google.searchParams.get('redirect_uri'), 'https://avantalab.com.br/api/backup-nuvem/callback/google');
  assert.equal(google.searchParams.get('state'), 'estado-seguro');
  assert.match(google.searchParams.get('scope'), /drive\.file/);
  assert.equal(google.searchParams.get('access_type'), 'offline');

  const onedrive = new URL(backup.urlAutorizacaoBackup('onedrive', 'https://avantalab.com.br/mobile', 'outro-estado'));
  assert.equal(onedrive.origin, 'https://login.microsoftonline.com');
  assert.equal(onedrive.searchParams.get('redirect_uri'), 'https://avantalab.com.br/api/backup-nuvem/callback/onedrive');
  assert.match(onedrive.searchParams.get('scope'), /Files\.ReadWrite\.AppFolder/);
  assert.match(onedrive.searchParams.get('scope'), /offline_access/);
});

test('Google troca código, identifica conta e reutiliza a pasta exclusiva', async () => {
  const chamadas = [];
  globalThis.fetch = async (url, init = {}) => {
    chamadas.push({ url: String(url), init });
    if (String(url).includes('/token')) return respostaJson({ access_token: 'google-access', refresh_token: 'google-refresh', expires_in: 3600 });
    if (String(url).includes('userinfo')) return respostaJson({ email: 'conta@exemplo.com' });
    if (String(url).includes('/drive/v3/files?')) return respostaJson({ files: [{ id: 'pasta-avantalab' }] });
    throw new Error(`URL inesperada: ${url}`);
  };
  const credenciais = await backup.trocarCodigoBackup('google_drive', 'codigo', 'https://avantalab.com.br/api/backup-nuvem/callback/google');
  assert.deepEqual({ ...credenciais, expiraEm: Boolean(credenciais.expiraEm) }, { accessToken: 'google-access', refreshToken: 'google-refresh', pastaId: 'pasta-avantalab', email: 'conta@exemplo.com', expiraEm: true });
  assert.equal(callsWith(calls => calls.url.includes('/token'), chamadas).init.method, 'POST');
  restaurarAmbiente();
  process.env.BACKUP_NUVEM_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  process.env.GOOGLE_DRIVE_CLIENT_ID = 'google-client'; process.env.GOOGLE_DRIVE_CLIENT_SECRET = 'google-secret';
  process.env.MICROSOFT_ONEDRIVE_CLIENT_ID = 'microsoft-client'; process.env.MICROSOFT_ONEDRIVE_CLIENT_SECRET = 'microsoft-secret';
});

function callsWith(condicao, chamadas) {
  const chamada = chamadas.find(condicao);
  assert.ok(chamada, 'a chamada esperada deve ocorrer');
  return chamada;
}

test('upload, listagem e download preservam o isolamento de cada provedor', async () => {
  const chamadas = [];
  globalThis.fetch = async (url, init = {}) => {
    chamadas.push({ url: String(url), init });
    if (String(url).includes('upload/drive')) return respostaJson({ id: 'google-arquivo', name: 'backup.xlsx' });
    if (String(url).includes('drive/v3/files?')) return respostaJson({ files: [{ id: 'google-lista', name: 'backup.xlsx', size: '12', createdTime: '2026-09-20T00:00:00Z' }] });
    if (String(url).includes('drive/v3/files/google-lista?alt=media')) return new Response(new Uint8Array([1, 2, 3]));
    if (String(url).includes('approot:/backup.xlsx:/content')) return respostaJson({ id: 'one-arquivo', name: 'backup.xlsx' });
    if (String(url).includes('approot/children')) return respostaJson({ value: [{ id: 'one-lista', name: 'backup.xlsx', size: 16, lastModifiedDateTime: '2026-09-20T00:00:00Z', file: {} }, { id: 'ignorar', name: 'texto.txt', file: {} }] });
    if (String(url).includes('drive/items/one-lista/content')) return new Response(new Uint8Array([4, 5]));
    throw new Error(`URL inesperada: ${url}`);
  };
  const bytes = new Uint8Array([9, 8, 7]).buffer;
  assert.equal((await backup.enviarBackupNuvem('google_drive', 'token', 'pasta', 'backup.xlsx', bytes)).id, 'google-arquivo');
  assert.equal((await backup.enviarBackupNuvem('onedrive', 'token', 'approot', 'backup.xlsx', bytes)).id, 'one-arquivo');
  assert.deepEqual(await backup.listarBackupsNuvem('google_drive', 'token', 'pasta'), [{ id: 'google-lista', nome: 'backup.xlsx', tamanho: 12, criadoEm: '2026-09-20T00:00:00Z' }]);
  assert.deepEqual(await backup.listarBackupsNuvem('onedrive', 'token', 'approot'), [{ id: 'one-lista', nome: 'backup.xlsx', tamanho: 16, criadoEm: '2026-09-20T00:00:00Z' }]);
  assert.deepEqual([...new Uint8Array(await backup.baixarBackupNuvem('google_drive', 'token', 'google-lista'))], [1, 2, 3]);
  assert.deepEqual([...new Uint8Array(await backup.baixarBackupNuvem('onedrive', 'token', 'one-lista'))], [4, 5]);
  assert.match(callsWith(calls => calls.url.includes('upload/drive'), chamadas).init.headers['Content-Type'], /multipart\/related/);
  assert.equal(callsWith(calls => calls.url.includes('approot:/backup.xlsx:/content'), chamadas).init.method, 'PUT');
});

test('erros do provedor e configuração ausente são devolvidos sem ocultar a causa', async () => {
  delete process.env.MICROSOFT_ONEDRIVE_CLIENT_SECRET;
  assert.throws(() => backup.configuracaoProvedor('onedrive'), /OneDrive ainda não está configurado/);
  process.env.MICROSOFT_ONEDRIVE_CLIENT_SECRET = 'microsoft-secret';
  globalThis.fetch = async () => respostaJson({ error: 'invalid_grant' }, 400);
  await assert.rejects(() => backup.renovarTokenBackup('google_drive', 'refresh-invalido'), /invalid_grant/);
});

test('web e mobile confirmam o retorno OAuth e não oferecem conexão a perfil sem permissão', async () => {
  const { readFileSync } = await import('node:fs');
  const modal = readFileSync(path.join(process.cwd(), 'app/components/BackupNuvemModals.tsx'), 'utf8');
  const web = readFileSync(path.join(process.cwd(), 'app/gestao/page.tsx'), 'utf8');
  const mobile = readFileSync(path.join(process.cwd(), 'app/mobile/BackupMobileBridge.tsx'), 'utf8');
  const rota = readFileSync(path.join(process.cwd(), 'app/api/backup-nuvem/route.ts'), 'utf8');
  const arquivo = readFileSync(path.join(process.cwd(), 'app/api/backup-nuvem/arquivo/route.ts'), 'utf8');
  const exportacao = readFileSync(path.join(process.cwd(), 'app/lib/exportacao.ts'), 'utf8');
  const migracao = readFileSync(path.join(process.cwd(), 'supabase/migrations/20260920165000_backup_nuvem.sql'), 'utf8');
  assert.match(modal, /podeConectar === true/);
  assert.match(modal, /Somente o Gestor Master pode conectar ou trocar a conta de backup/);
  assert.match(web, /parametros\.get\('backupNuvem'\)/);
  assert.match(web, /Conta conectada/);
  assert.match(mobile, /parametros\.get\('backupNuvem'\)/);
  assert.match(mobile, /Conta conectada/);
  assert.match(rota, /ctx\.perfil !== 'gestor_master'/);
  assert.match(rota, /arquivo\.size > 25 \* 1024 \* 1024/);
  assert.match(rota, /replace\(\/\[\^a-zA-Z0-9\._ -\]\/g, '_'/);
  assert.match(arquivo, /\['gestor_master', 'administrador', 'operador_completo'\]/);
  assert.match(exportacao, /destino === 'local' \|\| destino === 'ambos'/);
  assert.match(exportacao, /destino === 'nuvem' \|\| destino === 'ambos'/);
  assert.match(migracao, /backup_nuvem_conexoes enable row level security/);
  assert.match(migracao, /backup_nuvem_oauth_pendencias enable row level security/);
});
