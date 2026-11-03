# UJAAS — Editorial Workflow

**Status:** Draft for owner review. One transition function on the server enforces every rule; illegal transitions return `422 state_transition_invalid`. Roles enabled depend on D-05 (assumption: only `site_admin` enabled; all four exist in the schema).

## 1. Content workflow

States: `draft → in_review → approved → scheduled | published → unpublished | archived`; `archived → draft`; `unpublished → draft` or `published` (re-publish).

**Approved is not Published.** Publishing needs `lang_checked`, `proof_checked`, `final_approved`, a `rights_note`, ≥ 1 credited author, and, if a cover is set, its alt text.

### 1.1 Transitions and permissions (server-checked)
| Transition | content_manager | editor | editor_in_chief | site_admin | Records | Public sees |
|---|---|---|---|---|---|---|
| create draft, edit draft | ✔ | ✔ | ✔ | ✔ | revision, audit | nothing |
| draft → in_review | ✔ | ✔ | ✔ | ✔ | event, audit | nothing |
| in_review → approved | — | ✔ | ✔ | ✔ | event, audit, checks | nothing |
| in_review → draft (send back) | — | ✔ | ✔ | ✔ | note | nothing |
| approved → scheduled | — | ✔ | ✔ | ✔ | `scheduled_at` | nothing |
| approved/scheduled → published | — | — | ✔ | ✔ | `published_at`, cache purge | the item |
| published → unpublished | — | — | ✔ | ✔ | note, purge | removed; URL 404 |
| published/unpublished → archived | — | — | ✔ | ✔ | note | removed; 404 |
| scheduled → approved (cancel a schedule) | — | ✔ | ✔ | ✔ | note | nothing |
| unpublished → published (re-publish) | — | — | ✔ | ✔ | `published_at`, purge | the item |
| unpublished → draft | — | ✔ | ✔ | ✔ | note | nothing |
| approved → draft (send back) | — | ✔ | ✔ | ✔ | note | nothing |
| archived → draft (restore) | — | ✔ | ✔ | ✔ | note | nothing |
| hard delete (never-published draft) | — | — | — | ✔ | audit | nothing |
**Who may edit (server-checked, Phase 2):** drafts and items in review can be edited by every role; anything in approved, scheduled, published, unpublished or archived only by editor and above. `lang_checked` and `proof_checked` can be set by editor and above; `final_approved` only by editor_in_chief and above. Setting a flag without the right is a 403, not a silent ignore. A restore (editor and above) is refused while the item is published or scheduled (unpublish first), becomes a new revision, ignores the old slug, and clears all three checks. Publishing or scheduling needs: the three checks, a rights note, at least one credited author and, if a cover is set, its alt text; failures return `422 publish_blocked` listing each missing item. Publishing makes a cover with alt text public. Hard delete is only for a never-published draft by site_admin and removes its revisions.
Scheduler: runs every minute, publishes due `scheduled` items as actor `system`; on failure the item stays `scheduled` and the dashboard shows an alert.
Edits create a revision; restore creates a **new** revision. `If-Match: <revision_no>` mismatch → `409 conflict`.
Unpublish removes the item from listings, search, sitemap, author pages, collections, issue pages and API, and purges caches. Published material and revisions are never hard-deleted from the UI.

### 1.2 Removal and correction requests (including writers)
1. Request arrives by contact form or email (no writer accounts).
2. `site_admin` logs it as a contact message and an audit entry with date and requester; identity is checked against the submission email.
3. `editor_in_chief` decides: unpublish (reversible) or archive; deletion of published material only through the owner-approved deletion policy (pending D-02/D-03).
4. Outcome recorded in the audit log; the requester is answered manually (D-06).
5. Private writer information is never exposed publicly while the audit history is kept.

## 2. Submission workflow

States: `pending_review → under_review → revision_requested | approved | rejected`; `revision_requested → pending_review` (resubmission by the writer via contact, handled manually); `approved → converted`; `withdrawn` from any non-terminal state. Terminal: `rejected`, `converted`, `withdrawn`.

### 2.1 Transitions and permissions
| Transition | editor | editor_in_chief | site_admin | Records |
|---|---|---|---|---|
| pending_review → under_review (open, assign) | ✔ | ✔ | ✔ | event, assignee |
| add private note | ✔ | ✔ | ✔ | event |
| → revision_requested | ✔ | ✔ | ✔ | note (text for writer, sent manually) |
| → approved | — | ✔ | ✔ | event |
| → rejected | — | ✔ | ✔ | note |
| approved → converted (creates a **draft** content, `submission_id` private link) | ✔ | ✔ | ✔ | event, audit |
| → withdrawn (writer request, process in §1.2) | — | ✔ | ✔ | event, audit |
Rules: every transition writes a `submission_events` row and an audit row (actor, from, to, time, note). **Approved does not publish**: a converted draft goes through §1 to be public. Pending, under-review, revision-requested, approved and rejected submissions are never reachable through public endpoints (T-SUB-05 enumerates every public route).

## 3. Issue and collection states
`draft → published → archived`. Publishing an issue needs cover with alt, number, date and ≥ 1 published item. If a member item is unpublished, the public issue page omits it and the admin sees a warning.

## 4. Checks tied to tests
T-PUB-01…04 (publish, schedule, unpublish, archive), T-REV-01 (revisions), T-SUB-05, T-SUB-06, T-ADM-01…04.
