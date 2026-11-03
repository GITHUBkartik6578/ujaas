import mongoose from 'mongoose';
import type { Env } from '../config/env.js';
import { ContactMessage, Submission, SubmissionEvent } from '../models/index.js';

export interface RetentionResult {
  enabled: boolean;
  submissions_removed: number;
  contact_removed: number;
}

const TERMINAL: Array<'rejected' | 'converted' | 'withdrawn'> = ['rejected', 'converted', 'withdrawn'];

/**
 * Purge job (FR-031). D-02: the owner has not set retention periods, so every period is optional
 * and the job does nothing while its variable is unset. No number is chosen by the agent.
 * ASSUMPTION D-02: only finished submissions (rejected, converted, withdrawn) are purged; open ones never are.
 */
export async function runRetention(env: Env, now: Date = new Date()): Promise<RetentionResult> {
  const result: RetentionResult = { enabled: false, submissions_removed: 0, contact_removed: 0 };
  const day = 24 * 60 * 60 * 1000;

  if (env.RETENTION_DAYS_SUBMISSIONS !== undefined) {
    result.enabled = true;
    const cutoff = new Date(now.getTime() - env.RETENTION_DAYS_SUBMISSIONS * day);
    const old = await Submission.find({ created_at: mongoose.trusted({ $lt: cutoff }), status: mongoose.trusted({ $in: TERMINAL }) }).select('_id').lean();
    const ids = (old as unknown as Array<{ _id: import('mongoose').Types.ObjectId }>).map((s) => s._id);
    if (ids.length > 0) {
      await SubmissionEvent.deleteMany({ submission_id: mongoose.trusted({ $in: ids }) });
      const del = await Submission.deleteMany({ _id: mongoose.trusted({ $in: ids }) });
      result.submissions_removed = del.deletedCount ?? 0;
    }
  }
  if (env.RETENTION_DAYS_CONTACT !== undefined) {
    result.enabled = true;
    const cutoff = new Date(now.getTime() - env.RETENTION_DAYS_CONTACT * day);
    const del = await ContactMessage.deleteMany({ created_at: mongoose.trusted({ $lt: cutoff }), status: 'handled' });
    result.contact_removed = del.deletedCount ?? 0;
  }
  return result;
}
