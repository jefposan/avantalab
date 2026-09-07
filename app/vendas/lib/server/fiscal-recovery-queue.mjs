export const FISCAL_RECOVERY_QUEUE_REFERENCE = '2026-09-02';
export const FISCAL_RECOVERY_JOB_TYPES = Object.freeze(['authorization_status', 'receipt_status', 'processed_artifact', 'danfe_generation']);

const SENSITIVE_TEXT = /<\?xml|<(?:NFe|procNFe)\b|BEGIN (?:RSA )?PRIVATE KEY|BEGIN CERTIFICATE|\b(?:senha|password|token|secret)\s*[:=]/i;

function error(code, field, message) {
  return { code, field, message };
}

function text(value, limit = 500) {
  return (typeof value === 'string' ? value : String(value ?? '')).trim().slice(0, limit);
}

function integer(value, minimum, maximum, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function configured(repository) {
  return repository?.configured === true && typeof repository.runInTransaction === 'function';
}

function unavailable() {
  return { ok: false, persisted: false, errors: [error('AV-FISCAL-RECOVERY-REPOSITORY', 'repository', 'A fila fiscal persistente ainda não está configurada.')], warnings: ['Nenhuma tarefa fiscal foi alterada.'] };
}

function safeFailure(input = {}) {
  const candidateCode = text(input.failureCode, 80) || 'AV-FISCAL-RECOVERY-UNEXPECTED';
  const candidate = text(input.failureReason, 500) || 'A tarefa fiscal não foi concluída.';
  return { failureCode: SENSITIVE_TEXT.test(candidateCode) ? 'AV-FISCAL-RECOVERY-PROTECTED' : candidateCode, failureReason: SENSITIVE_TEXT.test(candidate) ? 'A tarefa fiscal falhou sem expor o conteúdo protegido.' : candidate };
}

export function createDisabledFiscalRecoveryRepository() {
  return Object.freeze({ id: 'fila-fiscal-nao-configurada', configured: false, async runInTransaction() { throw new Error('A fila fiscal persistente ainda não foi instalada.'); } });
}

export function createFiscalRecoveryQueueService({ repository = createDisabledFiscalRecoveryRepository(), clock = () => new Date().toISOString() } = {}) {
  return Object.freeze({
    id: 'avantalab-fiscal-recovery-queue-v1',
    async schedule(input = {}) {
      const companyId = text(input.companyId, 80);
      const emissionId = text(input.emissionId, 80);
      const jobType = text(input.jobType, 80);
      const idempotencyKey = text(input.idempotencyKey, 120);
      const maxAttempts = integer(input.maxAttempts, 1, 12, 8);
      const errors = [];
      if (!companyId || !emissionId) errors.push(error('AV-FISCAL-RECOVERY-TARGET', 'emissionId', 'Empresa e emissão são obrigatórias para agendar a recuperação.'));
      if (!FISCAL_RECOVERY_JOB_TYPES.includes(jobType)) errors.push(error('AV-FISCAL-RECOVERY-TYPE', 'jobType', 'O tipo de recuperação fiscal não é reconhecido.'));
      if (idempotencyKey.length < 8) errors.push(error('AV-FISCAL-RECOVERY-IDEMPOTENCY', 'idempotencyKey', 'A chave idempotente deve possuir de 8 a 120 caracteres.'));
      if (errors.length) return { ok: false, persisted: false, job: null, errors };
      if (!configured(repository)) return unavailable();
      const now = text(input.availableAt, 80) || clock();
      return repository.runInTransaction(async (tx) => {
        await tx.lockKey?.('recovery-operation', companyId, idempotencyKey);
        const job = await tx.enqueueRecoveryJob({ companyId, emissionId, jobType, idempotencyKey, maxAttempts, availableAt: now, createdAt: clock() });
        if (job && (job.companyId !== companyId || job.emissionId !== emissionId || job.jobType !== jobType)) return { ok: false, persisted: false, job, errors: [error('AV-FISCAL-RECOVERY-IDEMPOTENCY-CONFLICT', 'idempotencyKey', 'A chave idempotente já pertence a outra tarefa fiscal.')] };
        return { ok: Boolean(job), persisted: Boolean(job), job, errors: job ? [] : [error('AV-FISCAL-RECOVERY-SCHEDULE', 'job', 'A tarefa fiscal não pôde ser agendada.')] };
      });
    },
    async claim(input = {}) {
      const workerId = text(input.workerId, 120);
      if (workerId.length < 6) return { ok: false, jobs: [], recovered: 0, errors: [error('AV-FISCAL-RECOVERY-WORKER', 'workerId', 'O executor precisa de uma identificação estável.')] };
      if (!configured(repository)) return { ...unavailable(), jobs: [], recovered: 0 };
      const limit = integer(input.limit, 1, 25, 5);
      const leaseSeconds = integer(input.leaseSeconds, 30, 900, 120);
      const now = clock();
      return repository.runInTransaction(async (tx) => {
        const recovered = typeof tx.recoverExpiredRecoveryJobs === 'function' ? await tx.recoverExpiredRecoveryJobs({ now }) : [];
        const jobs = await tx.claimRecoveryJobs({ workerId, limit, leaseSeconds, now });
        return { ok: true, persisted: jobs.length > 0 || recovered.length > 0, jobs, recovered: recovered.length, errors: [] };
      }, { isolationLevel: 'read committed' });
    },
    async complete(input = {}) {
      const jobId = text(input.jobId, 80);
      const workerId = text(input.workerId, 120);
      if (!jobId || !workerId) return { ok: false, persisted: false, job: null, errors: [error('AV-FISCAL-RECOVERY-LEASE', 'jobId', 'Tarefa e executor são obrigatórios para concluir a recuperação.')] };
      if (!configured(repository)) return unavailable();
      return repository.runInTransaction(async (tx) => {
        const job = await tx.completeRecoveryJob({ jobId, workerId, now: clock() });
        return { ok: Boolean(job), persisted: Boolean(job), job, errors: job ? [] : [error('AV-FISCAL-RECOVERY-LEASE-LOST', 'workerId', 'A tarefa não pertence mais a este executor.')] };
      }, { isolationLevel: 'read committed' });
    },
    async fail(input = {}) {
      const jobId = text(input.jobId, 80);
      const workerId = text(input.workerId, 120);
      if (!jobId || !workerId) return { ok: false, persisted: false, job: null, errors: [error('AV-FISCAL-RECOVERY-LEASE', 'jobId', 'Tarefa e executor são obrigatórios para reagendar a recuperação.')] };
      if (!configured(repository)) return unavailable();
      const failure = safeFailure(input);
      return repository.runInTransaction(async (tx) => {
        const job = await tx.failRecoveryJob({ jobId, workerId, ...failure, now: clock(), baseDelaySeconds: 15, maxDelaySeconds: 900 });
        return { ok: Boolean(job), persisted: Boolean(job), job, errors: job ? [] : [error('AV-FISCAL-RECOVERY-LEASE-LOST', 'workerId', 'A tarefa não pertence mais a este executor.')] };
      }, { isolationLevel: 'read committed' });
    },
  });
}

export function createFiscalRecoveryWorker({ queueService, handlers = {} } = {}) {
  return Object.freeze({
    id: 'avantalab-fiscal-recovery-worker-v1',
    async runOnce({ workerId, limit = 5, leaseSeconds = 120 } = {}) {
      if (!queueService || typeof queueService.claim !== 'function') return { ok: false, claimed: 0, completed: 0, retried: 0, deadLetter: 0, errors: [error('AV-FISCAL-RECOVERY-QUEUE', 'queueService', 'A fila fiscal não foi fornecida ao executor.')] };
      const claimed = await queueService.claim({ workerId, limit, leaseSeconds });
      if (!claimed.ok) return { ok: false, claimed: 0, completed: 0, retried: 0, deadLetter: 0, errors: claimed.errors || [] };
      const summary = { ok: true, claimed: claimed.jobs.length, completed: 0, retried: 0, deadLetter: 0, errors: [] };
      for (const job of claimed.jobs) {
        const handler = handlers[job.jobType];
        if (typeof handler !== 'function') {
          const failed = await queueService.fail({ jobId: job.id, workerId, failureCode: 'AV-FISCAL-RECOVERY-HANDLER', failureReason: 'Não existe executor habilitado para esta etapa fiscal.' });
          if (failed.job?.state === 'dead_letter') summary.deadLetter += 1; else summary.retried += 1;
          continue;
        }
        try {
          const result = await handler(Object.freeze({ ...job }));
          if (result?.ok !== true) {
            const failed = await queueService.fail({ jobId: job.id, workerId, failureCode: text(result?.failureCode, 80) || 'AV-FISCAL-RECOVERY-HANDLER', failureReason: text(result?.failureReason, 500) || 'O executor não concluiu a tarefa fiscal.' });
            if (failed.job?.state === 'dead_letter') summary.deadLetter += 1; else summary.retried += 1;
            continue;
          }
          const completed = await queueService.complete({ jobId: job.id, workerId });
          if (completed.ok) summary.completed += 1;
          else summary.errors.push(...(completed.errors || []));
        } catch {
          const failed = await queueService.fail({ jobId: job.id, workerId, failureCode: 'AV-FISCAL-RECOVERY-EXECUTION', failureReason: 'O executor encontrou uma falha inesperada e a tarefa será tratada pela política de retentativa.' });
          if (failed.job?.state === 'dead_letter') summary.deadLetter += 1; else summary.retried += 1;
        }
      }
      summary.ok = summary.errors.length === 0;
      return summary;
    },
  });
}
