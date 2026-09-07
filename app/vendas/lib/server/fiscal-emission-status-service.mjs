import { evaluateAccessDecision } from '../access-control.mjs';

export const FISCAL_EMISSION_STATUS_REFERENCE = '2026-09-05';

const STATUS_LABELS = Object.freeze({
  draft: 'Em preparação',
  prepared: 'Preparação concluída',
  number_reserved: 'Número reservado',
  signed: 'Assinada',
  submitted: 'Enviada',
  processing: 'Processando',
  authorized: 'Autorizada',
  artifacts_stored: 'Documentos em preparação',
  danfe_ready: 'Nota autorizada',
  rejected: 'Rejeitada',
  failed: 'Falha na emissão',
  canceled: 'Cancelada',
});

const ACTIVE_RECOVERY_STATES = new Set(['pending', 'leased']);

function recommendedAction(record, deadLetterJobs) {
  if (deadLetterJobs.length > 0) return Object.freeze({
    required: true,
    kind: 'review_emission',
    label: 'Revisar emissão',
    message: 'A confirmação automática não foi concluída. Revise a emissão antes de continuar.',
  });
  if (record.state === 'rejected') return Object.freeze({
    required: true,
    kind: 'review_fiscal_data',
    label: 'Revisar dados fiscais',
    message: 'A nota foi rejeitada. Corrija os dados indicados antes de uma nova tentativa.',
  });
  return Object.freeze({ required: false, kind: '', label: '', message: '' });
}

function text(value) { return typeof value === 'string' ? value.trim() : String(value ?? '').trim(); }
function denied(reason) { return { ok: false, reason, emission: null }; }

function safeArtifact(artifact) {
  if (!artifact || !['processed_xml', 'danfe_pdf'].includes(text(artifact.artifactType))) return null;
  return Object.freeze({ id: text(artifact.id), artifactType: text(artifact.artifactType), available: true });
}

export function createFiscalEmissionStatusService({ repository } = {}) {
  return Object.freeze({
    id: 'avantalab-fiscal-emission-status-v1',
    async get(input = {}) {
      const access = evaluateAccessDecision({ boundary: input.boundary, effectivePermissions: input.effectivePermissions, permission: 'fiscal.view' });
      if (!access.allowed) return denied(access.reason);
      if (repository?.configured !== true || typeof repository.findEmissionStatus !== 'function') return denied('repository_unavailable');
      const emissionId = text(input.emissionId);
      const record = await repository.findEmissionStatus({ companyId: access.session.companyId, emissionId });
      if (!record || record.companyId !== access.session.companyId) return denied('emission_not_found');
      const artifacts = (record.artifacts || []).map(safeArtifact).filter(Boolean);
      const jobs = (record.recoveryJobs || []).map((job) => ({ jobType: text(job.jobType), state: text(job.state), attemptCount: Number(job.attemptCount || 0), maxAttempts: Number(job.maxAttempts || 0) }));
      const activeJobs = jobs.filter((job) => ACTIVE_RECOVERY_STATES.has(job.state));
      const deadLetterJobs = jobs.filter((job) => job.state === 'dead_letter');
      const action = recommendedAction(record, deadLetterJobs);
      return {
        ok: true,
        reason: 'allowed',
        emission: Object.freeze({
          id: text(record.id),
          documentType: text(record.documentType),
          model: text(record.model),
          environment: text(record.environment),
          state: text(record.state),
          stateLabel: STATUS_LABELS[record.state] || 'Situação fiscal',
          version: Number(record.version),
          series: text(record.series),
          number: Number(record.number || 0),
          accessKey: text(record.accessKey),
          statusCode: text(record.statusCode),
          statusReason: text(record.statusReason),
          protocolNumber: text(record.protocolNumber),
          canceledAt: text(record.canceledAt),
          cancellationProtocol: text(record.cancellationProtocol),
          cancellationStatusCode: text(record.cancellationStatusCode),
          submittedAt: text(record.submittedAt),
          authorizedAt: text(record.authorizedAt),
          updatedAt: text(record.updatedAt),
          authorized: ['authorized', 'artifacts_stored', 'danfe_ready', 'canceled'].includes(record.state),
          finalDocumentReady: record.state === 'danfe_ready',
          recoveryPending: activeJobs.length > 0,
          needsTechnicalAttention: deadLetterJobs.length > 0,
          actionRequired: action.required,
          recommendedAction: action.kind,
          recommendedActionLabel: action.label,
          recommendedActionMessage: action.message,
          artifacts: Object.freeze(artifacts),
          recovery: Object.freeze({ active: activeJobs.length, failed: deadLetterJobs.length }),
        }),
      };
    },
  });
}
