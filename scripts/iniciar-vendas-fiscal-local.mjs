import { execFileSync, spawn } from 'node:child_process';
import { userInfo } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  createNfeCertificateEnvelopeCipher,
  createPostgresNfeCertificateProtectedRepository,
} from '../app/vendas/lib/server/nfe-certificate-protected-storage.mjs';

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const keychainAccount = userInfo().username;

function readProtectedFiscalSecret(service) {
  const value = execFileSync('/usr/bin/security', [
    'find-generic-password', '-a', keychainAccount, '-s', service, '-w',
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  if (!value) throw new Error(`O segredo fiscal protegido ${service} não foi localizado.`);
  return value;
}

const fiscalCertificateMasterKey = readProtectedFiscalSecret('br.com.avantalab.vendas.fiscal.local.master-key');
const fiscalCertificateKeyId = readProtectedFiscalSecret('br.com.avantalab.vendas.fiscal.local.key-id');
const fiscalDatabaseUrl = process.env.FISCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/avantalab_commercial_ui_lab';

if (process.argv.includes('--check')) {
  const pool = new pg.Pool({ connectionString: fiscalDatabaseUrl });
  try {
    const repository = createPostgresNfeCertificateProtectedRepository({
      pool,
      cipher: createNfeCertificateEnvelopeCipher({ key: fiscalCertificateMasterKey, keyId: fiscalCertificateKeyId }),
    });
    const companyId = process.env.FISCAL_CHECK_COMPANY_ID || 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e';
    const summary = await repository.getActiveSummary({ companyId });
    if (!summary) {
      process.stdout.write(`Cofre fiscal local disponível (${fiscalCertificateKeyId}); nenhum certificado instalado no perfil de verificação.\n`);
    } else {
      const binding = summary.status === 'active'
        ? await repository.getActiveBinding({ companyId })
        : await repository.getPendingBinding({ companyId });
      const material = summary.status === 'active'
        ? await repository.load(binding.secureReference)
        : await repository.loadForValidation(binding.secureReference);
      if (!Buffer.isBuffer(material?.pkcs12) || !material.pkcs12.byteLength || typeof material?.passphrase !== 'string' || !material.passphrase) {
        throw new Error('O certificado protegido não pôde ser recuperado pelo cofre fiscal local.');
      }
      material.pkcs12.fill(0);
      material.passphrase = '';
      process.stdout.write(`Cofre fiscal e certificado ${summary.status === 'active' ? 'ativo' : 'pendente'} acessíveis (${fiscalCertificateKeyId}).\n`);
    }
  } finally {
    await pool.end();
  }
  process.exit(0);
}

const child = spawn(process.execPath, [
  resolve(projectDirectory, 'node_modules/next/dist/bin/next'),
  'dev',
  '--webpack',
  '--port',
  process.env.AVANTALAB_LOCAL_PORT || '3000',
], {
  cwd: projectDirectory,
  env: {
    ...process.env,
    FISCAL_STATUS_ENABLED: 'true',
    FISCAL_SANDBOX_STATUS_ONLY: 'true',
    FISCAL_STATUS_ENVIRONMENT: 'homologacao',
    FISCAL_STATUS_SCOPE: 'sp',
    FISCAL_STATUS_CONFIRMATION: 'NFE_STATUS_HOMOLOGACAO_SP',
    FISCAL_DATABASE_URL: fiscalDatabaseUrl,
    FISCAL_CERTIFICATE_MASTER_KEY: fiscalCertificateMasterKey,
    FISCAL_CERTIFICATE_KEY_ID: fiscalCertificateKeyId,
  },
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 1);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
