import { createClient } from '@supabase/supabase-js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';

import { createAvantaLabAccessResolver, createPostgresAvantaLabModuleAccessRepository } from './avantalab-module-access.mjs';
import { createCommercialCustomerService } from './commercial-customer-service.mjs';
import { createPostgresCommercialCustomerRepository } from './commercial-customer-repository.mjs';
import { createCommercialCatalogService, createPostgresCommercialCatalogRepository } from './commercial-catalog.mjs';
import { createCommercialFiscalCenterService, createPostgresCommercialFiscalCenterRepository } from './commercial-fiscal-center.mjs';
import { createCommercialFiscalEmissionBridge, createPostgresCommercialFiscalDraftRepository } from './commercial-fiscal-emission-bridge.mjs';
import { createCommercialFiscalRuleResolver, createCommercialFiscalRulesPublicationService, createCommercialFiscalRulesQueryService, createPostgresCommercialFiscalRulesRepository } from './commercial-fiscal-rules.mjs';
import { createCommercialFiscalProfileService, createPostgresCommercialFiscalProfileRepository } from './commercial-fiscal-profile.mjs';
import { createCommercialNfePreparationService, createPostgresCommercialNfePreparationRepository } from './commercial-nfe-preparation.mjs';
import { createCommercialNfeRejectionCorrectionService, createPostgresCommercialNfeRejectionCorrectionRepository } from './commercial-nfe-rejection-correction.mjs';
import { createCommercialNfeCancellationService, createDisabledNfeCancellationAdapter, createPostgresCommercialNfeCancellationRepository } from './commercial-nfe-cancellation.mjs';
import { createCommercialNfeNumberReservationService } from './commercial-nfe-number-reservation.mjs';
import { createCommercialNfeAutomaticIssuanceService } from './commercial-nfe-automatic-issuance.mjs';
import { createCommercialNfeSigningService } from './commercial-nfe-signing.mjs';
import { createCommercialNfeSigningPreparationService, createPostgresCommercialNfeSigningPreparationRepository } from './commercial-nfe-signing-preparation.mjs';
import { createCommercialNfeSubmissionService, createPostgresCommercialNfeSubmissionRepository } from './commercial-nfe-submission.mjs';
import { createFiscalArtifactRecoveryHandlers } from './fiscal-artifact-recovery.mjs';
import { createIcpBrasilCrlRevocationChecker } from './icp-brasil-crl-checker.mjs';
import { createIcpBrasilChainResolver } from './icp-brasil-chain-resolver.mjs';
import { resolveIcpBrasilTrustedRootFingerprints } from './icp-brasil-trust-anchors.mjs';
import { createLocalFiscalArtifactStorage } from './local-fiscal-artifact-storage.mjs';
import { createNfeA1CertificateProvider } from './nfe-a1-certificate.mjs';
import { createNfeA1MtlsAuthorizationTransport } from './nfe-a1-mtls-authorization-transport.mjs';
import { createNfeA1MtlsCancellationTransport } from './nfe-a1-mtls-cancellation-transport.mjs';
import { createNfeA1MtlsReturnTransport } from './nfe-a1-mtls-return-transport.mjs';
import { createNfeA1MtlsStatusTransport } from './nfe-a1-mtls-status-transport.mjs';
import { createNfeAuthorizationAdapter } from './nfe-authorization-service.mjs';
import { createNfeCancellationAdapter } from './nfe-cancellation-service.mjs';
import { createNfeCertificateActivationService } from './nfe-certificate-activation-service.mjs';
import { createNfeCertificateInstallationService } from './nfe-certificate-installation-service.mjs';
import { createNfeCertificateEnvelopeCipher, createNfeCertificateSecretLoader, createNfeCertificateValidationLoader, createPostgresNfeCertificateProtectedRepository } from './nfe-certificate-protected-storage.mjs';
import { createNfeCertificateVaultAdapter } from './nfe-certificate-vault.mjs';
import { createNfeReturnAdapter } from './nfe-return-service.mjs';
import { createNfeStatusServiceAdapter } from './nfe-status-service.mjs';
import { createFiscalRecoveryQueueService, createFiscalRecoveryWorker } from './fiscal-recovery-queue.mjs';
import { createNfeIssuanceOrchestrator } from './nfe-issuance-orchestrator.mjs';
import { createCommercialOperationService } from './commercial-operation-service.mjs';
import { createPostgresCommercialOperationRepository } from './commercial-operation-repository.mjs';
import { createCommercialOrderWorkflow } from './commercial-order-workflow.mjs';
import { createPostgresCommercialCatalogResolver, createPostgresCommercialIssuerResolver } from './commercial-runtime-resolvers.mjs';
import { createCommercialSalesOrderBillingService, createPostgresCommercialSalesOrderBillingRepository } from './commercial-sales-order-billing.mjs';
import { createCommercialSalesOrderLifecycleService, createPostgresCommercialSalesOrderLifecycleRepository } from './commercial-sales-order-lifecycle.mjs';
import { createCommercialReceivableService, createPostgresCommercialReceivableRepository } from './commercial-receivable-service.mjs';
import { createCommercialStockService, createPostgresCommercialStockRepository } from './commercial-stock-service.mjs';
import { createCommercialSupplierService, createPostgresCommercialSupplierRepository } from './commercial-supplier-service.mjs';
import { createCommercialServiceOrderService, createPostgresCommercialServiceOrderRepository } from './commercial-service-order.mjs';
import { createCommercialServiceWorkflow, createPostgresCommercialServiceWorkflowRepository } from './commercial-service-workflow.mjs';
import { createFiscalEmissionLifecycleService } from './fiscal-emission-lifecycle.mjs';
import { createFiscalEmissionStatusService } from './fiscal-emission-status-service.mjs';
import { createPostgresFiscalRepository } from './fiscal-postgres-repository.mjs';

const { Pool } = pg;
const HTTPS_URL = /^https:\/\//i;
const VENDAS_PILOTO_EMPRESA_ID = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e';
function text(value) { return typeof value === 'string' ? value.trim() : String(value ?? '').trim(); }
function disabled(reason) { return Object.freeze({ configured: false, reason, accessResolver: null, catalogService: null, statusService: null, centerService: null, emissionBridge: null, fiscalProfileService: null, fiscalRulesQueryService: null, fiscalRulesPublicationService: null, certificateInstallationService: null, nfePreparationService: null, nfeRejectionCorrectionService: null, nfeCancellationService: null, nfeNumberReservationService: null, nfeSigningPreparationService: null, nfeSigningService: null, nfeStatusServiceAdapter: null, nfeAuthorizationAdapter: null, nfeReturnAdapter: null, nfeIssuanceOrchestrator: null, nfeAutomaticIssuanceService: null, orderWorkflow: null, serviceWorkflow: null, operationService: null, serviceOrderService: null, customerService: null, receivableService: null, stockService: null, supplierService: null }); }

function createCertificateRuntime({ environment, pool, issuerResolver, databaseUrl }) {
  const key = text(environment.FISCAL_CERTIFICATE_MASTER_KEY);
  if (!key) return null;
  try {
    const cipher = createNfeCertificateEnvelopeCipher({ key, keyId: text(environment.FISCAL_CERTIFICATE_KEY_ID) || 'principal-v1' });
    const repository = createPostgresNfeCertificateProtectedRepository({ pool, cipher });
    const validationLoader = createNfeCertificateValidationLoader(repository);
    const activeLoader = createNfeCertificateSecretLoader(repository);
    const revocationChecker = createIcpBrasilCrlRevocationChecker();
    const validationProvider = createNfeA1CertificateProvider({ secretLoader: validationLoader, revocationChecker });
    const signingProvider = createNfeA1CertificateProvider({ secretLoader: activeLoader, revocationChecker });
    const trustedRootFingerprints = resolveIcpBrasilTrustedRootFingerprints(environment.FISCAL_ICP_BRASIL_TRUSTED_ROOT_FINGERPRINTS);
    const chainResolver = createIcpBrasilChainResolver({ trustedRootFingerprints });
    const validationAdapter = createNfeCertificateVaultAdapter({ provider: validationProvider, trustedRootFingerprints, chainResolver });
    const signingAdapter = createNfeCertificateVaultAdapter({ provider: signingProvider, trustedRootFingerprints, chainResolver });
    const nfeStatusServiceAdapter = createStatusRuntime({
      environment,
      databaseUrl,
      certificateRuntime: { activeLoader, chainResolver, signingAdapter },
    });
    const activationService = createNfeCertificateActivationService({
      repository,
      issuerResolver,
      certificateAdapter: validationAdapter,
      availabilityService: nfeStatusServiceAdapter,
    });
    return Object.freeze({
      repository,
      signingAdapter,
      signingProvider,
      activeLoader,
      chainResolver,
      nfeStatusServiceAdapter,
      installationService: createNfeCertificateInstallationService({ repository, issuerResolver, activationService }),
    });
  } catch {
    return null;
  }
}

function createStatusRuntime({ environment, databaseUrl, certificateRuntime }) {
  const localDatabase = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
  const productionPilot = text(environment.FISCAL_SANDBOX_STATUS_ONLY).toLowerCase() === 'true'
    && text(environment.FISCAL_STATUS_ENVIRONMENT).toLowerCase() === 'homologacao'
    && text(environment.FISCAL_STATUS_SCOPE).toLowerCase() === 'sp'
    && text(environment.FISCAL_STATUS_CONFIRMATION) === 'NFE_STATUS_HOMOLOGACAO_SP';
  if (!certificateRuntime || (!localDatabase && !productionPilot)) return null;
  try {
    const transport = createNfeA1MtlsStatusTransport({
      secretLoader: certificateRuntime.activeLoader,
      chainResolver: certificateRuntime.chainResolver,
    });
    return createNfeStatusServiceAdapter({ certificateAdapter: certificateRuntime.signingAdapter, transport });
  } catch {
    return null;
  }
}

function createLocalAuthorizationRuntime({ databaseUrl, certificateRuntime, statusAdapter }) {
  if (!certificateRuntime || !statusAdapter || (!databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1'))) return null;
  try {
    const transport = createNfeA1MtlsAuthorizationTransport({
      secretLoader: certificateRuntime.activeLoader,
      chainResolver: certificateRuntime.chainResolver,
    });
    return createNfeAuthorizationAdapter({
      certificateAdapter: certificateRuntime.signingAdapter,
      statusAdapter,
      transport,
    });
  } catch {
    return null;
  }
}

function createLocalReturnRuntime({ databaseUrl, certificateRuntime }) {
  if (!certificateRuntime || (!databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1'))) return null;
  try {
    const transport = createNfeA1MtlsReturnTransport({
      secretLoader: certificateRuntime.activeLoader,
      chainResolver: certificateRuntime.chainResolver,
    });
    return createNfeReturnAdapter({
      certificateAdapter: certificateRuntime.signingAdapter,
      transport,
    });
  } catch {
    return null;
  }
}

function createLocalCancellationRuntime({ environment, databaseUrl, certificateRuntime }) {
  const enabled = text(environment.FISCAL_NFE_CANCELLATION_ENABLED).toLowerCase() === 'true'
    && text(environment.FISCAL_NFE_CANCELLATION_ENVIRONMENT).toLowerCase() === 'homologacao'
    && text(environment.FISCAL_NFE_CANCELLATION_SCOPE).toLowerCase() === 'sp'
    && text(environment.FISCAL_NFE_CANCELLATION_CONFIRMATION) === 'CANCELAMENTO_NFE_HOMOLOGACAO_AUTORIZADO';
  if (!enabled || !certificateRuntime || (!databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1'))) return null;
  try {
    const transport = createNfeA1MtlsCancellationTransport({ secretLoader: certificateRuntime.activeLoader, chainResolver: certificateRuntime.chainResolver });
    return createNfeCancellationAdapter({ certificateAdapter: certificateRuntime.signingAdapter, signingProvider: certificateRuntime.signingProvider, transport });
  } catch { return null; }
}

function createLocalArtifactStorageRuntime(databaseUrl) {
  if (!databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1')) return null;
  try {
    return createLocalFiscalArtifactStorage({ rootDirectory: join(tmpdir(), 'avantalab-vendas-fiscal-lab-artifacts') });
  } catch {
    return null;
  }
}

function createLocalSigningRuntime({ databaseUrl, pool, certificateRuntime, fiscalRuleResolver, fiscalLifecycle, artifactStorage }) {
  if (!certificateRuntime || !artifactStorage || (!databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1'))) return null;
  try {
    const repository = createPostgresCommercialNfeSigningPreparationRepository({ pool });
    return createCommercialNfeSigningService({
      repository,
      fiscalRuleResolver,
      certificateBindingResolver: ({ companyId }) => certificateRuntime.repository.getActiveBinding({ companyId }),
      certificateAdapter: certificateRuntime.signingAdapter,
      signingProvider: certificateRuntime.signingProvider,
      artifactStorage,
      lifecycle: fiscalLifecycle,
    });
  } catch {
    return null;
  }
}

function createLocalIssuanceOrchestrator({ environment, databaseUrl, pool, certificateRuntime, issuerResolver, fiscalRepository, fiscalLifecycle, artifactStorage, nfeSigningPreparationService, nfeSigningService, nfeAuthorizationAdapter, nfeReturnAdapter }) {
  if (!certificateRuntime || !artifactStorage || !nfeSigningPreparationService || !nfeSigningService || !nfeAuthorizationAdapter || !nfeReturnAdapter || (!databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1'))) return null;
  try {
    const certificateBindingResolver = ({ companyId }) => certificateRuntime.repository.getActiveBinding({ companyId });
    const submissionService = createCommercialNfeSubmissionService({
      repository: createPostgresCommercialNfeSubmissionRepository({ pool }),
      certificateBindingResolver,
      artifactStorage,
      authorizationAdapter: nfeAuthorizationAdapter,
      lifecycle: fiscalLifecycle,
    });
    const automaticIssuanceService = createCommercialNfeAutomaticIssuanceService({
      signingPreparationService: nfeSigningPreparationService,
      signingService: nfeSigningService,
      submissionService,
      emissionStateResolver: ({ context, emissionId }) => fiscalRepository.findEmissionStatus({ companyId: context?.companyId, emissionId }),
    });
    const handlers = createFiscalArtifactRecoveryHandlers({
      repository: fiscalRepository,
      storageProvider: artifactStorage,
      returnAdapter: nfeReturnAdapter,
      certificateBindingResolver,
      issuerDocumentResolver: async ({ companyId, establishmentId }) => (await issuerResolver({ companyId, establishmentId }))?.document || '',
    });
    const recoveryWorker = createFiscalRecoveryWorker({
      queueService: createFiscalRecoveryQueueService({ repository: fiscalRepository }),
      handlers,
    });
    return createNfeIssuanceOrchestrator({
      enabled: text(environment.FISCAL_NFE_ORCHESTRATOR_ENABLED).toLowerCase() === 'true',
      environment: text(environment.FISCAL_NFE_ORCHESTRATOR_ENVIRONMENT),
      scope: text(environment.FISCAL_NFE_ORCHESTRATOR_SCOPE),
      confirmation: text(environment.FISCAL_NFE_ORCHESTRATOR_CONFIRMATION),
      activationToken: text(environment.FISCAL_NFE_ORCHESTRATOR_TOKEN),
      automaticIssuanceService,
      recoveryWorker,
    });
  } catch {
    return null;
  }
}

export async function createFiscalStatusRuntimeFromEnvironment(environment = process.env) {
  if (text(environment.FISCAL_STATUS_ENABLED).toLowerCase() !== 'true') return disabled('integration_disabled');
  const supabaseUrl = text(environment.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = text(environment.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const databaseUrl = text(environment.FISCAL_DATABASE_URL);
  const statusOnly = text(environment.FISCAL_SANDBOX_STATUS_ONLY).toLowerCase() === 'true';
  if (!HTTPS_URL.test(supabaseUrl) || !anonKey || !databaseUrl) return disabled('configuration_incomplete');
  const localDatabase = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
  const databaseCa = text(environment.FISCAL_DATABASE_CA_PEM);
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: localDatabase ? false : { rejectUnauthorized: true, ...(databaseCa ? { ca: databaseCa } : {}) },
  });
  try {
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const accessRepository = createPostgresAvantaLabModuleAccessRepository({ pool });
    const baseAccessResolver = createAvantaLabAccessResolver({ authClient, accessRepository });
    const accessResolver = {
      async resolve(request, boundary) {
        if (text(boundary?.companyId) !== VENDAS_PILOTO_EMPRESA_ID) {
          return { authenticated: false, boundary: null, effectivePermissions: {} };
        }
        return baseAccessResolver.resolve(request, boundary);
      },
    };
    const fiscalRepository = createPostgresFiscalRepository({ pool });
    const fiscalLifecycle = createFiscalEmissionLifecycleService({ repository: fiscalRepository });
    const fiscalRulesRepository = createPostgresCommercialFiscalRulesRepository({ pool });
    const fiscalProfileRepository = createPostgresCommercialFiscalProfileRepository({ pool });
    const fiscalRuleResolver = createCommercialFiscalRuleResolver({ repository: fiscalRulesRepository });
    const centerRepository = createPostgresCommercialFiscalCenterRepository({ pool });
    const commercialDraftRepository = createPostgresCommercialFiscalDraftRepository({ pool });
    const customerRepository = createPostgresCommercialCustomerRepository({ pool });
    const operationRepository = createPostgresCommercialOperationRepository({ pool });
    const customerService = createCommercialCustomerService({ repository: customerRepository });
    const operationService = createCommercialOperationService({
      repository: operationRepository,
      customerResolver: ({ companyId, customerId }) => customerRepository.get({ companyId, customerId }),
      catalogResolver: createPostgresCommercialCatalogResolver({ pool }),
    });
    const serviceCatalogResolver = createPostgresCommercialCatalogResolver({ pool });
    const serviceOrderService = createCommercialServiceOrderService({
      repository: createPostgresCommercialServiceOrderRepository({ pool }),
      materialResolver: async ({ companyId, itemIds }) => (await serviceCatalogResolver({ companyId, priceTableId: '', itemIds })).items,
    });
    const lifecycleService = createCommercialSalesOrderLifecycleService({
      repository: createPostgresCommercialSalesOrderLifecycleRepository({ pool }),
    });
    const issuerResolver = createPostgresCommercialIssuerResolver({ pool });
    const certificateRuntime = createCertificateRuntime({ environment, pool, issuerResolver, databaseUrl });
    const artifactStorage = statusOnly ? null : createLocalArtifactStorageRuntime(databaseUrl);
    const nfeSigningPreparationService = statusOnly ? null : createCommercialNfeSigningPreparationService({
      repository: createPostgresCommercialNfeSigningPreparationRepository({ pool }),
      fiscalRuleResolver,
    });
    const nfeSigningService = statusOnly ? null : createLocalSigningRuntime({ databaseUrl, pool, certificateRuntime, fiscalRuleResolver, fiscalLifecycle, artifactStorage });
    const nfeStatusServiceAdapter = certificateRuntime?.nfeStatusServiceAdapter || null;
    const nfeAuthorizationAdapter = statusOnly ? null : createLocalAuthorizationRuntime({ databaseUrl, certificateRuntime, statusAdapter: nfeStatusServiceAdapter });
    const nfeReturnAdapter = statusOnly ? null : createLocalReturnRuntime({ databaseUrl, certificateRuntime });
    const nfeCancellationAdapter = statusOnly ? null : createLocalCancellationRuntime({ environment, databaseUrl, certificateRuntime });
    const nfeIssuanceOrchestrator = statusOnly ? null : createLocalIssuanceOrchestrator({ environment, databaseUrl, pool, certificateRuntime, issuerResolver, fiscalRepository, fiscalLifecycle, artifactStorage, nfeSigningPreparationService, nfeSigningService, nfeAuthorizationAdapter, nfeReturnAdapter });
    const billingService = createCommercialSalesOrderBillingService({
      repository: createPostgresCommercialSalesOrderBillingRepository({ pool }),
      issuerResolver,
    });
    return Object.freeze({
      configured: true,
      reason: 'ready',
      accessResolver,
      catalogService: createCommercialCatalogService({ repository: createPostgresCommercialCatalogRepository({ pool }) }),
      statusService: createFiscalEmissionStatusService({ repository: fiscalRepository }),
      centerService: createCommercialFiscalCenterService({ repository: centerRepository }),
      emissionBridge: createCommercialFiscalEmissionBridge({
        draftRepository: commercialDraftRepository,
        emissionLifecycle: fiscalLifecycle,
      }),
      fiscalProfileService: createCommercialFiscalProfileService({ repository: fiscalProfileRepository }),
      fiscalRulesQueryService: createCommercialFiscalRulesQueryService({ repository: fiscalRulesRepository }),
      fiscalRulesPublicationService: createCommercialFiscalRulesPublicationService({ repository: fiscalRulesRepository }),
      certificateInstallationService: certificateRuntime?.installationService || null,
      nfePreparationService: statusOnly ? null : createCommercialNfePreparationService({
        repository: createPostgresCommercialNfePreparationRepository({ pool }),
        emissionLifecycle: fiscalLifecycle,
        fiscalRuleResolver,
      }),
      nfeRejectionCorrectionService: statusOnly ? null : createCommercialNfeRejectionCorrectionService({
        repository: createPostgresCommercialNfeRejectionCorrectionRepository({ pool }),
        emissionLifecycle: fiscalLifecycle,
        fiscalRuleResolver,
      }),
      nfeCancellationService: !statusOnly && certificateRuntime && artifactStorage ? createCommercialNfeCancellationService({
        repository: createPostgresCommercialNfeCancellationRepository({ pool }),
        certificateBindingResolver: ({ companyId }) => certificateRuntime.repository.getActiveBinding({ companyId }),
        cancellationAdapter: nfeCancellationAdapter || createDisabledNfeCancellationAdapter(),
        artifactStorage,
        lifecycle: fiscalLifecycle,
      }) : null,
      nfeNumberReservationService: statusOnly ? null : createCommercialNfeNumberReservationService({ emissionLifecycle: fiscalLifecycle }),
      nfeSigningPreparationService,
      // O laboratório assina somente com A1 ativo no armazenamento protegido,
      // cadeia/LCR aprovadas e guarda imutável local. Não existe transmissão aqui.
      nfeSigningService,
      // Diagnóstico mTLS restrito ao NfeStatusServico 4.00 de homologação.
      // Não aceita XML de NF-e e não participa ainda do fluxo de transmissão.
      nfeStatusServiceAdapter,
      // O autorizador possui transporte próprio, limitado à homologação paulista,
      // mas segue sem rota e sem ligação ao comando de emissão.
      nfeAuthorizationAdapter,
      // Recibo e protocolo usam outro transporte mTLS, limitado aos dois
      // serviços oficiais paulistas. O adaptador não possui rota de usuário.
      nfeReturnAdapter,
      // Composição completa disponível apenas atrás de quatro confirmações de
      // homologação e token técnico. Nenhuma rota recebe este objeto.
      nfeIssuanceOrchestrator,
      nfeAutomaticIssuanceService: null,
      orderWorkflow: createCommercialOrderWorkflow({
        customerRepository, customerService, operationService, lifecycleService, billingService,
      }),
      serviceWorkflow: createCommercialServiceWorkflow({
        repository: createPostgresCommercialServiceWorkflowRepository({ pool }),
        issuerResolver,
      }),
      customerService,
      operationService,
      serviceOrderService,
      receivableService: createCommercialReceivableService({ repository: createPostgresCommercialReceivableRepository({ pool }) }),
      stockService: createCommercialStockService({ repository: createPostgresCommercialStockRepository({ pool }) }),
      supplierService: createCommercialSupplierService({ repository: createPostgresCommercialSupplierRepository({ pool }) }),
    });
  } catch {
    await pool.end().catch(() => null);
    return disabled('initialization_failed');
  }
}

let runtimePromise;
export function getFiscalStatusRuntime() {
  if (!runtimePromise) runtimePromise = createFiscalStatusRuntimeFromEnvironment();
  return runtimePromise;
}
