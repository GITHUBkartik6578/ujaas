/** Labels for the submission states (docs/editorial-workflow.md section 2). */
export const SUB_STATUS: Record<string, string> = {
  pending_review: 'Awaiting review', under_review: 'Under review', revision_requested: 'Revision requested', approved: 'Approved',
  rejected: 'Rejected', converted: 'Converted to draft', withdrawn: 'Withdrawn',
};
