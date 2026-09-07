function text(value) { return typeof value === 'string' ? value.trim() : String(value ?? '').trim(); }
function disabled(reason) { return Object.freeze({ configured: false, reason, worker: null, workerToken: '', workerId: '' }); }

export function createFiscalRecoveryWorkerRuntime({ worker, workerToken, workerId = 'avantalab-fiscal-worker-01' } = {}) {
  const token = text(workerToken);
  const id = text(workerId);
  if (!worker?.runOnce || token.length < 32 || id.length < 6) return disabled('configuration_incomplete');
  return Object.freeze({ configured: true, reason: 'ready', worker, workerToken: token, workerId: id });
}

export function createFiscalRecoveryWorkerRuntimeFromEnvironment(environment = process.env) {
  if (text(environment.FISCAL_RECOVERY_WORKER_ENABLED).toLowerCase() !== 'true') return disabled('integration_disabled');
  return disabled('orchestrator_not_released');
}

let runtime;
export function getFiscalRecoveryWorkerRuntime() {
  if (!runtime) runtime = createFiscalRecoveryWorkerRuntimeFromEnvironment();
  return runtime;
}
