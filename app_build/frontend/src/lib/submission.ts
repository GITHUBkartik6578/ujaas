import 'server-only';
import { cache } from 'react';
import { apiOrNull } from './api';

export interface SubmissionConfig {
  open: boolean;
  version?: string;
  consents?: { original: string; publication: string; privacy: string };
  body_max?: number;
}

/**
 * Whether the writer form is open. It is closed until the owner supplies the consent wording (D-03), and every
 * link to the form (header, closing action) follows this answer. Failure to ask counts as closed.
 */
export const getSubmissionConfig = cache(async (): Promise<SubmissionConfig> => {
  try {
    return (await apiOrNull<SubmissionConfig>('/submission-config')) ?? { open: false };
  } catch {
    return { open: false };
  }
});
