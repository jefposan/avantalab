export const FISCAL_RECOVERY_QUEUE_REFERENCE: string;
export const FISCAL_RECOVERY_JOB_TYPES: readonly string[];
export function createDisabledFiscalRecoveryRepository(): { id: string; configured: false; runInTransaction(): Promise<never> };
export function createFiscalRecoveryQueueService(options?: { repository?: any; clock?: () => string }): Record<string, any>;
export function createFiscalRecoveryWorker(options?: { queueService?: any; handlers?: Record<string, (job: Record<string, any>) => Promise<Record<string, any>>> }): { id: string; runOnce(input?: Record<string, any>): Promise<Record<string, any>> };
