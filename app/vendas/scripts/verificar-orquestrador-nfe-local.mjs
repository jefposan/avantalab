import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildUnsignedNfeSpXml } from '../lib/nfe-sp-xml.mjs';
import { createCommercialNfeAutomaticIssuanceService } from '../lib/server/commercial-nfe-automatic-issuance.mjs';
import { createCommercialNfeSubmissionService } from '../lib/server/commercial-nfe-submission.mjs';
import { createFiscalArtifactRecoveryHandlers } from '../lib/server/fiscal-artifact-recovery.mjs';
import { createFiscalEmissionLifecycleService } from '../lib/server/fiscal-emission-lifecycle.mjs';
import { createFiscalEmissionStatusService } from '../lib/server/fiscal-emission-status-service.mjs';
import { createFiscalRecoveryQueueService, createFiscalRecoveryWorker } from '../lib/server/fiscal-recovery-queue.mjs';
import { createLocalFiscalArtifactStorage } from '../lib/server/local-fiscal-artifact-storage.mjs';
import { createNfeAuthorizationAdapter } from '../lib/server/nfe-authorization-service.mjs';
import { createNfeReturnAdapter } from '../lib/server/nfe-return-service.mjs';
import {
  createNfeIssuanceOrchestrator,
  NFE_ISSUANCE_ORCHESTRATOR_CONFIRMATION,
  NFE_ISSUANCE_ORCHESTRATOR_SCOPE,
} from '../lib/server/nfe-issuance-orchestrator.mjs';
import { nfeDanfeStorageKey } from '../lib/server/nfe-danfe-artifact.mjs';
import { nfeProcessedStorageKey } from '../lib/server/nfe-processed-artifact.mjs';
import { buildSignedNfeArtifact, persistSignedNfeArtifact } from '../lib/server/nfe-signed-artifact.mjs';
import { createEphemeralLabSignedNfeXml } from '../lib/server/nfe-signature-lab.mjs';

export const NFE_ORCHESTRATOR_LAB_REHEARSAL_REFERENCE = '2026-09-04';

const COMPANY = '10000000-0000-4000-8000-000000000001';
const ACTOR = '20000000-0000-4000-8000-000000000001';
const EMISSION = '30000000-0000-4000-8000-000000000001';
const ESTABLISHMENT = '50000000-0000-4000-8000-000000000001';
const ISSUER = '48210380000142';
const TOKEN = 'ensaio-sintetico-local-sem-rede-1234567890';
const NOW = '2026-09-04T15:00:00.000Z';

function syntheticUnsignedDocument() {
  return buildUnsignedNfeSpXml({
    issuedAt: '2026-09-04T12:00:00-03:00',
    operationNature: 'Venda de mercadoria',
    series: '1',
    number: '7',
    numericCode: '12345678',
    consumerFinal: false,
    presence: 'Não presencial',
    issuer: {
      document: ISSUER,
      legalName: 'Empresa Piloto Comércio Ltda.',
      tradeName: 'Empresa Piloto',
      stateRegistration: '110042490114',
      taxRegime: 'Simples Nacional',
      address: { street: 'Rua do Comércio', number: '100', district: 'Centro', cityCode: '3550308', city: 'São Paulo', uf: 'SP', cep: '01001000' },
    },
    recipient: {
      document: '17552694000130',
      name: 'Cliente sintético',
      stateRegistrationIndicator: '1',
      stateRegistration: '669327441110',
      address: { street: 'Rua da Penha', number: '388', district: 'Centro', cityCode: '3552205', city: 'Sorocaba', uf: 'SP', cep: '18010160' },
    },
    items: [{ code: 'PRD-001', description: 'Produto sintético', gtin: '7891234567001', ncm: '33049990', cfop: '5102', commercialUnit: 'UN', quantity: 1, unitValue: 10, totalValue: 10, origin: '0', icmsCode: '102', pisCst: '49', cofinsCst: '49' }],
    totals: { products: 10, freight: 0, insurance: 0, discount: 0, other: 0, invoice: 10 },
    payment: { method: 'Pix', amount: 10 },
    matrixReviewConfirmed: true,
    fiscalReviewConfirmed: true,
    taxReformReviewConfirmed: true,
  });
}

function cloneMap(source) {
  return new Map([...source].map(([key, value]) => [key, structuredClone(value)]));
}

function createTransactionalMemoryRepository() {
  const state = { emissions: new Map(), operations: new Map(), events: [], jobs: new Map(), artifacts: new Map(), attempts: new Map(), jobSequence: 0 };
  return {
    configured: true,
    state,
    async findEmissionStatus({ companyId, emissionId }) {
      const emission = state.emissions.get(emissionId);
      if (emission?.companyId !== companyId) return null;
      return structuredClone({
        ...emission,
        artifacts: [...state.artifacts.values()].filter((artifact) => artifact.companyId === companyId && artifact.emissionId === emissionId),
        recoveryJobs: [...state.jobs.values()].filter((job) => job.companyId === companyId && job.emissionId === emissionId),
      });
    },
    async runInTransaction(callback) {
      const draft = {
        emissions: cloneMap(state.emissions), operations: cloneMap(state.operations), events: structuredClone(state.events),
        jobs: cloneMap(state.jobs), artifacts: cloneMap(state.artifacts), attempts: cloneMap(state.attempts), jobSequence: state.jobSequence,
      };
      const tx = {
        async lockKey() {},
        async getOperation(companyId, operationKey) { return structuredClone(draft.operations.get(`${companyId}:${operationKey}`) || null); },
        async getEmission(id) { return structuredClone(draft.emissions.get(id) || null); },
        async updateEmission(emission, { expectedVersion }) {
          const current = draft.emissions.get(emission.id);
          if (!current || current.version !== expectedVersion) return false;
          draft.emissions.set(emission.id, structuredClone(emission));
          return true;
        },
        async appendEvent(event) { draft.events.push(structuredClone(event)); },
        async insertOperation(operation) { draft.operations.set(`${operation.companyId}:${operation.operationKey}`, structuredClone(operation)); },
        async findArtifact(companyId, emissionId, artifactType) { return structuredClone(draft.artifacts.get(`${companyId}:${emissionId}:${artifactType}`) || null); },
        async insertArtifact(artifact) {
          const stored = { id: `artifact-${draft.artifacts.size + 1}`, ...structuredClone(artifact) };
          draft.artifacts.set(`${artifact.companyId}:${artifact.emissionId}:${artifact.artifactType}`, stored);
          return structuredClone(stored);
        },
        async findTransmissionAttempt(companyId, operationKey) { return structuredClone(draft.attempts.get(`${companyId}:${operationKey}`) || null); },
        async insertTransmissionAttempt(attempt) {
          const stored = { id: `attempt-${draft.attempts.size + 1}`, attemptNumber: draft.attempts.size + 1, ...structuredClone(attempt) };
          draft.attempts.set(`${attempt.companyId}:${attempt.operationKey}`, stored);
          return structuredClone(stored);
        },
        async enqueueRecoveryJob(job) {
          const existing = [...draft.jobs.values()].find((item) => item.companyId === job.companyId && item.idempotencyKey === job.idempotencyKey);
          if (existing) return structuredClone(existing);
          draft.jobSequence += 1;
          const stored = { id: `job-${draft.jobSequence}`, state: 'pending', attemptCount: 0, workerId: '', leasedAt: '', leaseExpiresAt: '', completedAt: '', lastErrorCode: '', lastErrorReason: '', updatedAt: job.createdAt, ...structuredClone(job) };
          draft.jobs.set(stored.id, stored);
          return structuredClone(stored);
        },
        async recoverExpiredRecoveryJobs({ now }) {
          const recovered = [];
          for (const job of draft.jobs.values()) {
            if (job.state !== 'leased' || job.leaseExpiresAt > now) continue;
            job.state = job.attemptCount >= job.maxAttempts ? 'dead_letter' : 'pending';
            job.workerId = '';
            job.leasedAt = '';
            job.leaseExpiresAt = '';
            recovered.push(structuredClone(job));
          }
          return recovered;
        },
        async claimRecoveryJobs({ workerId, limit, leaseSeconds, now }) {
          const expiresAt = new Date(Date.parse(now) + (leaseSeconds * 1000)).toISOString();
          const jobs = [...draft.jobs.values()]
            .filter((job) => job.state === 'pending' && job.availableAt <= now)
            .sort((left, right) => left.availableAt.localeCompare(right.availableAt) || left.id.localeCompare(right.id))
            .slice(0, limit);
          for (const job of jobs) Object.assign(job, { state: 'leased', attemptCount: job.attemptCount + 1, workerId, leasedAt: now, leaseExpiresAt: expiresAt, updatedAt: now });
          return structuredClone(jobs);
        },
        async completeRecoveryJob({ jobId, workerId, now }) {
          const job = draft.jobs.get(jobId);
          if (!job || job.state !== 'leased' || job.workerId !== workerId) return null;
          Object.assign(job, { state: 'completed', completedAt: now, updatedAt: now, leaseExpiresAt: '' });
          return structuredClone(job);
        },
        async failRecoveryJob({ jobId, workerId, failureCode, failureReason, now, baseDelaySeconds, maxDelaySeconds }) {
          const job = draft.jobs.get(jobId);
          if (!job || job.state !== 'leased' || job.workerId !== workerId) return null;
          const dead = job.attemptCount >= job.maxAttempts;
          const delay = Math.min(maxDelaySeconds, baseDelaySeconds * (2 ** Math.max(job.attemptCount - 1, 0)));
          Object.assign(job, {
            state: dead ? 'dead_letter' : 'pending',
            availableAt: dead ? job.availableAt : new Date(Date.parse(now) + delay * 1000).toISOString(),
            lastErrorCode: failureCode,
            lastErrorReason: failureReason,
            workerId: '',
            leasedAt: '',
            leaseExpiresAt: '',
            updatedAt: now,
          });
          return structuredClone(job);
        },
      };
      const result = await callback(tx);
      Object.assign(state, {
        emissions: draft.emissions, operations: draft.operations, events: draft.events, jobs: draft.jobs,
        artifacts: draft.artifacts, attempts: draft.attempts, jobSequence: draft.jobSequence,
      });
      return result;
    },
  };
}

function authorizedResponse(accessKey) {
  return `<?xml version="1.0"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cStat>104</cStat><xMotivo>Lote processado</xMotivo><cUF>35</cUF><protNFe versao="4.00"><infProt><tpAmb>2</tpAmb><chNFe>${accessKey}</chNFe><dhRecbto>2026-09-04T12:00:01-03:00</dhRecbto><nProt>135260000000001</nProt><digVal>SINTETICO</digVal><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe></retEnviNFe></soap:Body></soap:Envelope>`;
}

function transportResult(answer) {
  if (answer instanceof Error) throw answer;
  if (typeof answer === 'string') return { status: 200, body: answer };
  if (answer && typeof answer === 'object' && typeof answer.body === 'string') return answer;
  throw new Error('A resposta sintética do transporte não foi configurada.');
}

export async function createSyntheticNfeOrchestratorLab({ authorizationResponder, returnResponder } = {}) {
  const rootDirectory = await mkdtemp(join(tmpdir(), 'avantalab-nfe-orchestrator-lab-'));
  let cleaned = false;
  let currentTime = NOW;
  try {
    const generated = syntheticUnsignedDocument();
    if (!generated.valid) throw new Error('O pré-XML sintético não passou na validação local.');
    const signed = await createEphemeralLabSignedNfeXml(generated.xml, new Date(NOW));
    const signedArtifact = await buildSignedNfeArtifact({ signedXml: signed.signedXml, expectedAccessKey: generated.accessKey, expectedIssuerDocument: ISSUER });
    if (!signedArtifact.valid) throw new Error('O XML sintético não passou na validação criptográfica.');

    const clock = () => currentTime;
    const storage = createLocalFiscalArtifactStorage({ rootDirectory, clock });
    const storedSigned = await persistSignedNfeArtifact({ artifact: signedArtifact, provider: storage });
    if (!storedSigned.valid) throw new Error('O XML assinado sintético não foi guardado.');

    const repository = createTransactionalMemoryRepository();
    const initialEmission = {
      id: EMISSION, companyId: COMPANY, establishmentId: ESTABLISHMENT, draftId: EMISSION, originId: 'PED-LAB-001', documentType: 'nfe', model: '55', environment: 'homologacao', state: 'signed', version: 4,
      series: '1', number: 7, reservationId: '60000000-0000-4000-8000-000000000001', accessKey: generated.accessKey, signedChecksum: signedArtifact.checksum,
      batchId: '', receiptNumber: '', statusCode: '', statusReason: '', protocolNumber: '', submittedAt: '', authorizedAt: '', processedStorageReference: '', processedChecksum: '', danfeStorageReference: '', danfeChecksum: '', createdAt: NOW, updatedAt: NOW,
    };
    repository.state.emissions.set(EMISSION, initialEmission);
    repository.state.artifacts.set(`${COMPANY}:${EMISSION}:signed_xml`, {
      id: 'artifact-1', companyId: COMPANY, emissionId: EMISSION, artifactType: 'signed_xml', storageReference: storedSigned.storageReference,
      storageVersion: storedSigned.storageVersion, checksum: signedArtifact.checksum, byteLength: signedArtifact.byteLength, contentType: 'application/xml', createdAt: storedSigned.storedAt,
    });

    const lifecycle = createFiscalEmissionLifecycleService({ repository, clock });
    const metrics = { syntheticAuthorizationCalls: 0, receiptQueries: 0, protocolQueries: 0, externalNetworkCalls: 0 };
    const certificateAdapter = { async inspectBinding() { return { valid: true, readyForMutualTls: true, readyForXmlSignature: true, errors: [] }; } };
    const authorizationAdapter = createNfeAuthorizationAdapter({
      certificateAdapter,
      statusAdapter: { async checkAvailability() { return { valid: true, serviceOperational: true, errors: [] }; } },
      transport: {
        configured: true,
        async postSoap(input) {
          metrics.syntheticAuthorizationCalls += 1;
          const answer = typeof authorizationResponder === 'function'
            ? await authorizationResponder({ ...input, accessKey: generated.accessKey, call: metrics.syntheticAuthorizationCalls })
            : authorizedResponse(generated.accessKey);
          return transportResult(answer);
        },
      },
    });
    const draft = { id: EMISSION, companyId: COMPANY, issuerSnapshot: { establishmentId: ESTABLISHMENT, document: ISSUER } };
    const submissionService = createCommercialNfeSubmissionService({
      repository: {
        async load({ companyId, emissionId }) {
          const emission = repository.state.emissions.get(emissionId);
          const artifact = repository.state.artifacts.get(`${companyId}:${emissionId}:signed_xml`);
          return emission?.companyId === companyId && artifact ? { emission: structuredClone(emission), draft, signedArtifact: structuredClone(artifact) } : null;
        },
      },
      certificateBindingResolver: async () => ({ secureReference: 'certificate://laboratorio/sintetico', expectedMode: 'Certificado A1' }),
      artifactStorage: storage,
      authorizationAdapter,
      lifecycle,
    });
    const automaticIssuanceService = createCommercialNfeAutomaticIssuanceService({
      signingPreparationService: { async prepare() { throw new Error('A emissão já começa assinada neste ensaio.'); } },
      signingService: { async sign() { throw new Error('A emissão já começa assinada neste ensaio.'); } },
      submissionService,
      emissionStateResolver: ({ context, emissionId }) => repository.findEmissionStatus({ companyId: context.companyId, emissionId }),
    });
    const returnAdapter = createNfeReturnAdapter({
      certificateAdapter,
      transport: {
        configured: true,
        async postSoap(input) {
          const kind = input.body.includes('<consReciNFe') ? 'receipt' : 'protocol';
          if (kind === 'receipt') metrics.receiptQueries += 1;
          else metrics.protocolQueries += 1;
          const call = kind === 'receipt' ? metrics.receiptQueries : metrics.protocolQueries;
          const answer = typeof returnResponder === 'function'
            ? await returnResponder({ ...input, kind, accessKey: generated.accessKey, call })
            : new Error('A autorização síncrona não exige consulta.');
          return transportResult(answer);
        },
      },
    });
    const handlers = createFiscalArtifactRecoveryHandlers({
      repository,
      storageProvider: storage,
      returnAdapter,
      certificateBindingResolver: async () => ({ secureReference: 'certificate://laboratorio/sintetico', expectedMode: 'Certificado A1' }),
      issuerDocumentResolver: async () => ISSUER,
      clock,
    });
    const queueService = createFiscalRecoveryQueueService({ repository, clock });
    const recoveryWorker = createFiscalRecoveryWorker({ queueService, handlers });
    const orchestrator = createNfeIssuanceOrchestrator({
      enabled: true,
      environment: 'homologacao',
      scope: NFE_ISSUANCE_ORCHESTRATOR_SCOPE,
      confirmation: NFE_ISSUANCE_ORCHESTRATOR_CONFIRMATION,
      activationToken: TOKEN,
      automaticIssuanceService,
      recoveryWorker,
    });
    const context = { companyId: COMPANY, actorId: ACTOR, moduleId: 'vendas', active: true, moduleActive: true, effectivePermissions: { 'fiscal.issue': true } };
    const statusService = createFiscalEmissionStatusService({ repository });
    const statusBoundary = { source: 'authenticated', authenticated: true, userId: ACTOR, companyId: COMPANY, moduleId: 'vendas', userActive: true, membershipActive: true, companyActive: true, moduleActive: true };
    return Object.freeze({
      accessKey: generated.accessKey,
      repository,
      storage,
      metrics,
      continueEmission({ expectedVersion = 4, idempotencyKey = 'ensaio-integral-sintetico-001' } = {}) {
        return orchestrator.continueProtected({ activationToken: TOKEN, context, emissionId: EMISSION, expectedVersion, idempotencyKey });
      },
      runRecoveryOnce({ workerId = 'worker-fiscal-lab-01', limit = 10, leaseSeconds = 120 } = {}) {
        return orchestrator.runRecoveryOnceProtected({ activationToken: TOKEN, workerId, limit, leaseSeconds });
      },
      getStatus() {
        return statusService.get({ boundary: statusBoundary, effectivePermissions: { 'fiscal.view': true }, emissionId: EMISSION });
      },
      advanceSeconds(seconds) {
        currentTime = new Date(Date.parse(currentTime) + (Number(seconds) * 1000)).toISOString();
        return currentTime;
      },
      snapshot() {
        const emission = repository.state.emissions.get(EMISSION);
        return {
          state: emission?.state || '',
          version: emission?.version || 0,
          artifacts: [...repository.state.artifacts.values()].map((artifact) => artifact.artifactType).sort(),
          jobs: [...repository.state.jobs.values()].map((job) => ({ id: job.id, jobType: job.jobType, state: job.state, attemptCount: job.attemptCount, lastErrorCode: job.lastErrorCode })),
          attempts: repository.state.attempts.size,
        };
      },
      async inspectFinalArtifacts() {
        const processed = await storage.inspect({ accessKey: generated.accessKey, storageKey: nfeProcessedStorageKey(generated.accessKey) });
        const danfe = await storage.inspect({ accessKey: generated.accessKey, storageKey: nfeDanfeStorageKey(generated.accessKey) });
        return { processed: Boolean(processed), danfe: Boolean(danfe), contentReturned: false };
      },
      async cleanup() {
        if (cleaned) return;
        cleaned = true;
        await rm(rootDirectory, { recursive: true, force: true });
      },
    });
  } catch (cause) {
    await rm(rootDirectory, { recursive: true, force: true });
    throw cause;
  }
}

export async function runSyntheticNfeOrchestratorRehearsal() {
  const lab = await createSyntheticNfeOrchestratorLab();
  try {
    const issued = await lab.continueEmission();
    if (issued.ok !== true || issued.result?.state !== 'authorized') throw new Error('O orquestrador não concluiu a autorização sintética.');
    const firstRecovery = await lab.runRecoveryOnce();
    const secondRecovery = await lab.runRecoveryOnce();
    const snapshot = lab.snapshot();
    const artifacts = await lab.inspectFinalArtifacts();
    if (snapshot.state !== 'danfe_ready' || !artifacts.processed || !artifacts.danfe || snapshot.artifacts.join(',') !== 'danfe_pdf,processed_xml,protocol_xml,signed_xml') throw new Error('O ensaio não concluiu todos os artefatos fiscais sintéticos.');
    if (lab.metrics.receiptQueries !== 0 || lab.metrics.protocolQueries !== 0 || lab.metrics.syntheticAuthorizationCalls !== 1) throw new Error('O ensaio executou uma quantidade inesperada de consultas sintéticas.');
    const completedJobs = snapshot.jobs.filter((job) => job.state === 'completed').length;
    return Object.freeze({
      ok: true,
      environment: 'homologacao',
      state: snapshot.state,
      version: snapshot.version,
      artifacts: snapshot.artifacts,
      completedJobs,
      recoveryRuns: [firstRecovery.completed, secondRecovery.completed],
      syntheticAuthorizationCalls: lab.metrics.syntheticAuthorizationCalls,
      returnQueries: lab.metrics.receiptQueries + lab.metrics.protocolQueries,
      externalNetworkCalls: 0,
      realCertificateUsed: false,
      contentReturned: false,
    });
  } finally {
    await lab.cleanup();
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const result = await runSyntheticNfeOrchestratorRehearsal();
  process.stdout.write(`AVANTALAB_NFE_ORCHESTRATOR_LAB_OK state=${result.state} artifacts=${result.artifacts.length} jobs=${result.completedJobs} network=${result.externalNetworkCalls}\n`);
}
