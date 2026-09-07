import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

import { createFiscalArtifactDownloadService } from './fiscal-artifact-download-service.mjs';
import { createPostgresFiscalRepository } from './fiscal-postgres-repository.mjs';
import { validateFiscalDurableStorageConfiguration } from './fiscal-durable-storage-policy.mjs';
import { createSupabaseFiscalArtifactStorage } from './supabase-fiscal-artifact-storage.mjs';
import { createAvantaLabAccessResolver, createPostgresAvantaLabModuleAccessRepository } from './avantalab-module-access.mjs';

const { Pool } = pg;
const HTTPS_URL = /^https:\/\//i;

function text(value) { return typeof value === 'string' ? value.trim() : String(value ?? '').trim(); }

function disabled(reason) { return Object.freeze({ configured: false, reason, accessResolver: null, downloadService: null }); }

function parsePolicy(value) {
  try { return JSON.parse(text(value)); } catch { return null; }
}

export async function createFiscalDownloadRuntimeFromEnvironment(environment = process.env) {
  if (text(environment.FISCAL_DOWNLOAD_ENABLED).toLowerCase() !== 'true') return disabled('integration_disabled');
  const supabaseUrl = text(environment.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = text(environment.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleKey = text(environment.SUPABASE_SERVICE_ROLE_KEY);
  const databaseUrl = text(environment.FISCAL_DATABASE_URL);
  const bucket = text(environment.FISCAL_STORAGE_BUCKET);
  const policyInput = parsePolicy(environment.FISCAL_STORAGE_POLICY_JSON);
  if (!HTTPS_URL.test(supabaseUrl) || !anonKey || !serviceRoleKey || !databaseUrl || !bucket || !policyInput) return disabled('configuration_incomplete');
  const policy = validateFiscalDurableStorageConfiguration(policyInput);
  if (!policy.productionReady) return disabled('storage_policy_rejected');

  const pool = new Pool({ connectionString: databaseUrl, max: 8, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000, ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: true } });
  try {
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const storageClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const accessRepository = createPostgresAvantaLabModuleAccessRepository({ pool });
    const fiscalRepository = createPostgresFiscalRepository({ pool });
    const storageProvider = createSupabaseFiscalArtifactStorage({ client: storageClient, bucket, environment: 'production', productionReadiness: policy });
    const actualStorage = await storageProvider.inspectReadiness();
    if (!actualStorage.productionReady) { await pool.end(); return disabled('storage_not_ready'); }
    return Object.freeze({
      configured: true,
      reason: 'ready',
      accessResolver: createAvantaLabAccessResolver({ authClient, accessRepository }),
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
