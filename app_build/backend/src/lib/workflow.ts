import { AppError, forbidden } from './errors.js';

export type Role = 'site_admin' | 'editor_in_chief' | 'editor' | 'content_manager';
export const ROLES: Role[] = ['site_admin', 'editor_in_chief', 'editor', 'content_manager'];
const ALL: Role[] = ROLES;
const EDITOR_UP: Role[] = ['site_admin', 'editor_in_chief', 'editor'];
const CHIEF_UP: Role[] = ['site_admin', 'editor_in_chief'];

export type ContentStatus =
  | 'draft' | 'in_review' | 'approved' | 'scheduled' | 'published' | 'unpublished' | 'archived';

/** docs/editorial-workflow.md §1.1 */
const CONTENT: Record<ContentStatus, Partial<Record<ContentStatus, Role[]>>> = {
  draft: { in_review: ALL },
  in_review: { approved: EDITOR_UP, draft: EDITOR_UP },
  approved: { scheduled: EDITOR_UP, published: CHIEF_UP, draft: EDITOR_UP },
  scheduled: { published: CHIEF_UP, approved: EDITOR_UP },
  published: { unpublished: CHIEF_UP, archived: CHIEF_UP },
  unpublished: { published: CHIEF_UP, archived: CHIEF_UP, draft: EDITOR_UP },
  archived: { draft: EDITOR_UP },
};

export type SubmissionStatus =
  | 'pending_review' | 'under_review' | 'revision_requested' | 'approved' | 'rejected' | 'converted' | 'withdrawn';

/** docs/editorial-workflow.md §2.1 */
const SUBMISSION: Record<SubmissionStatus, Partial<Record<SubmissionStatus, Role[]>>> = {
  pending_review: { under_review: EDITOR_UP, withdrawn: CHIEF_UP },
  under_review: { revision_requested: EDITOR_UP, approved: CHIEF_UP, rejected: CHIEF_UP, withdrawn: CHIEF_UP },
  revision_requested: { pending_review: EDITOR_UP, withdrawn: CHIEF_UP },
  approved: { converted: EDITOR_UP, withdrawn: CHIEF_UP },
  rejected: {},
  converted: {},
  withdrawn: {},
};

function check<S extends string>(table: Record<S, Partial<Record<S, Role[]>>>, from: S, to: S, role: Role) {
  const allowed = table[from]?.[to];
  if (!allowed) {
    throw new AppError(422, 'state_transition_invalid', `Cannot move from ${from} to ${to}`, 'यह स्थिति-परिवर्तन मान्य नहीं है');
  }
  if (!allowed.includes(role)) throw forbidden();
}

export function assertContentTransition(from: ContentStatus, to: ContentStatus, role: Role): void {
  check(CONTENT, from, to, role);
}

export function assertSubmissionTransition(from: SubmissionStatus, to: SubmissionStatus, role: Role): void {
  check(SUBMISSION, from, to, role);
}

/** Who may edit a record in a given state: drafts and items in review by anyone, everything else by editors and up. */
export function canEditContent(status: ContentStatus, role: Role): boolean {
  if (status === 'draft' || status === 'in_review') return true;
  return EDITOR_UP.includes(role);
}
export const canSetLangProof = (role: Role) => EDITOR_UP.includes(role);
export const canSetFinalApproval = (role: Role) => CHIEF_UP.includes(role);
export const isChiefUp = (role: Role) => CHIEF_UP.includes(role);
export const isEditorUp = (role: Role) => EDITOR_UP.includes(role);

export interface PublishCandidate {
  lang_checked?: boolean;
  proof_checked?: boolean;
  final_approved?: boolean;
  rights_note?: string;
  credits?: unknown[];
  /** alt text of the cover when a cover is set; null or undefined when no cover. */
  cover_alt?: string | null;
}

/** "Approved is not Published": every check must pass before status becomes published. */
export function publishBlockers(c: PublishCandidate): string[] {
  const out: string[] = [];
  if (!c.lang_checked) out.push('lang_checked');
  if (!c.proof_checked) out.push('proof_checked');
  if (!c.final_approved) out.push('final_approved');
  if (!c.rights_note || !c.rights_note.trim()) out.push('rights_note');
  if (!c.credits || c.credits.length === 0) out.push('credits');
  if (c.cover_alt !== null && c.cover_alt !== undefined && !c.cover_alt.trim()) out.push('cover_alt');
  return out;
}
