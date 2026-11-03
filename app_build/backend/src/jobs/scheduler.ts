import cron, { type ScheduledTask } from 'node-cron';
import type { Env } from '../config/env.js';
import { publishDue, type DueResult } from '../services/content.js';
import { runRetention } from './retention.js';

export const schedulerState: { started: boolean; last_run_at: Date | null; last_result: DueResult | null; last_error: string | null } = {
  started: false, last_run_at: null, last_result: null, last_error: null,
};

/** One run of the publishing job. Exported so tests and the ops page can use the same code. */
export async function runSchedulerOnce(now: Date = new Date()): Promise<DueResult> {
  try {
    const result = await publishDue(now);
    schedulerState.last_run_at = now;
    schedulerState.last_result = result;
    schedulerState.last_error = null;
    return result;
  } catch (err) {
    schedulerState.last_run_at = now;
    schedulerState.last_error = err instanceof Error ? err.message : 'unknown error';
    throw err;
  }
}

/**
 * Publishes due scheduled items every minute (editorial_workflow). ASSUMPTION: one API instance runs it;
 * a second instance is still safe because every publish is a conditional update on status "scheduled".
 */
export function startScheduler(env: Env): ScheduledTask {
  schedulerState.started = true;
  // Daily purge (FR-031). It does nothing while the RETENTION_DAYS_* settings are unset (D-02).
  cron.schedule('17 3 * * *', () => {
    runRetention(env).catch(() => undefined);
  });
  return cron.schedule('* * * * *', () => {
    runSchedulerOnce().catch(() => undefined); // the error is kept in schedulerState for the ops page
  });
}
