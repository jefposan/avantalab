import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

import { createFiscalArtifactDownloadService } from './fiscal-artifact-download-service.mjs';
import { createPostgresFiscalRepository } from './fiscal-postgres-repository.mjs';
import { validateFiscalDurableStorageConfiguration } from './fiscal-durable-storage-policy.mjs';
import { createSupabaseFiscalArtifactStorage } from './supabase-fiscal-artifact-storage.mjs';
import { createAvantaLabAccessResolver, createPostgresAvantaLabModuleAccessRepository } from './avantalab-module-access.mjs';
import { NFE_ISSUANCE_ORCHESTRATOR_CONFIRMATION, NFE_ISSUANCE_ORCHESTRATOR_SCOPE } from './nfe-issuance-orchestrator.mjs';

const { Pool } = pg;
const HTTPS_URL = /^https:\/\//i;
const VENDAS_PILOTO_EMPRESA_ID = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e';
const NFE_HOMOLOGATION_RELEASE = 'TRIDIUM_NFE_SP_HOMOLOGACAO_CONTROLADA';

function text(value) { return typeof value === 'string' ? value.trim() : String(value ?? '').trim(); }

function disabled(reason) { return Object.freeze({ configured: false, reason, accessResolver: null, downloadService: null }); }

function parsePolicy(value) {
  try { return JSON.parse(text(value)); } catch { return null; }
}

function homologationDownloadEnabled(environment) {
  return text(environment.FISCAL_DOWNLOAD_ENVIRONMENT).toLowerCase() === 'homologacao'
    && text(environment.FISCAL_STORAGE_HOMOLOGATION_ENABLED).toLowerCase() === 'true'
    && text(environment.FISCAL_NFE_HOMOLOGATION_RELEASE) === NFE_HOMOLOGATION_RELEASE
    && text(environment.FISCAL_NFE_ORCHESTRATOR_ENVIRONMENT).toLowerCase() === 'homologacao'
    && text(environment.FISCAL_NFE_ORCHESTRATOR_SCOPE) === NFE_ISSUANCE_ORCHESTRATOR_SCOPE
    && text(environment.FISCAL_NFE_ORCHESTRATOR_CONFIRMATION) === NFE_ISSUANCE_ORCHESTRATOR_CONFIRMATION;
}

export async function createFiscalDownloadRuntimeFromEnvironment(environment = process.env) {
  if (text(environment.FISCAL_DOWNLOAD_ENABLED).toLowerCase() !== 'true') return disabled('integration_disabled');
  const supabaseUrl = text(environment.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = text(environment.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleKey = text(environment.SUPABASE_SERVICE_ROLE_KEY);
  const databaseUrl = text(environment.FISCAL_DATABASE_URL);
  const bucket = text(environment.FISCAL_STORAGE_BUCKET);
  const homologation = homologationDownloadEnabled(environment);
  const policyInput = homologation ? null : parsePolicy(environment.FISCAL_STORAGE_POLICY_JSON);
  if (!HTTPS_URL.test(supabaseUrl) || !anonKey || !serviceRoleKey || !databaseUrl || !bucket || (!homologation && !policyInput)) return disabled('configuration_incomplete');
  const policy = homologation ? null : validateFiscalDurableStorageConfiguration(policyInput);
  if (!homologation && !policy.productionReady) return disabled('storage_policy_rejected');

  const pool = new Pool({ connectionString: databaseUrl, max: 8, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000, ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: true } });
  try {
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const storageClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const accessRepository = createPostgresAvantaLabModuleAccessRepository({ pool });
    const baseAccessResolver = createAvantaLabAccessResolver({ authClient, accessRepository });
    const accessResolver = {
      async resolve(request, boundary) {
        if (text(boundary?.companyId) !== VENDAS_PILOTO_EMPRESA_ID) return { authenticated: false, boundary: null, effectivePermissions: {} };
        return baseAccessResolver.resolve(request, boundary);
      },
    };
    const fiscalRepository = createPostgresFiscalRepository({ pool });
    const storageProvider = createSupabaseFiscalArtifactStorage({ client: storageClient, bucket, environment: homologation ? 'homologacao' : 'production', productionReadiness: policy });
    const actualStorage = await storageProvider.inspectReadiness();
    if (homologation ? !actualStorage.homologationReady : !actualStorage.productionReady) { await pool.end(); return disabled('storage_not_ready'); }
    return Object.freeze({
      configured: true,
      reason: 'ready',
      accessResolver,
      downloadService: createFiscalArtifactDownloadService({ repository: fiscalRepository, storageProvider, auditWriter: fiscalRepository, maxTtlSeconds: 60 }),
    });
  } catch {
    await pool.end().catch(() => null);
    return disabled('initialization_failed');
  }
}

let runtimePromise;
export function getFiscalDownloadRuntime() {
  if (!runtimePromise) runtimePromise = createFiscalDownloadRuntimeFromEnvironment();
  return runtimePromise;
}
