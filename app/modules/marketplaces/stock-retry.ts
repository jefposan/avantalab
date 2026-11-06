/** Divergência observada não é uma nova falha de envio a cada leitura. */
export function stockRetry(job: { attempts: number; issue?: string | null }, outcome: string, issue: string | null, now = Date.now()) {
  const repeatedDivergence = outcome === 'pending' && issue === 'lower_remote_stock' && job.issue === issue;
  const attempts = repeatedDivergence ? Math.max(1, job.attempts) : job.attempts + 1;
  const delayMinutes = repeatedDivergence ? 30 : Math.min(15, 2 ** Math.min(job.attempts, 4));
  return { attempts, next_attempt_at: new Date(now + delayMinutes * 60_000).toISOString() };
}
