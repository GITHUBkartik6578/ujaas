# Skill: editorial_workflow

**Use when:** implementing status changes, publishing, scheduling, unpublishing, archiving, revisions.
**Sources:** `docs/editorial-workflow.md`, `docs/data-model.md` (contents, content_revisions, submissions, submission_events), `docs/api-contract.md` §3.
**Tests:** T-PUB-01…04, T-REV-01, T-SUB-05, T-SUB-06.

## State machines
- Content: `draft → in_review → approved → scheduled | published → unpublished | archived`; `archived → draft`.
- Submission: `pending_review → under_review → revision_requested | approved | rejected`; `approved → converted`; `withdrawn` from any non-terminal state.

## Rules
- **Approved is not Published.** Publishing needs `lang_checked`, `proof_checked`, `final_approved`, a `rights_note` and a credited author.
- Transitions are enforced on the server through one function; illegal transitions return `422 state_transition_invalid`. Permissions per role come from the tables in `editorial-workflow.md` §1.1 and §2.1 and are checked server-side.
- Every transition writes an event row and an audit row (actor, from, to, time, note). Withdrawal is a controlled transition with a recorded process.
- Unpublish removes the item from listings, search, sitemap, author pages, collections, issue pages and API, and purges caches; its URL returns **404** (never 403).
- Public reads go through one query helper that returns only `published` with `published_at <= now`. Add a test that enumerates every public route.
- Editing creates a revision; restore creates a **new** revision. Use `If-Match` (revision number) to reject stale edits with 409.
- The scheduler publishes due items each minute and logs actor `system`; failures stay `scheduled` and raise a dashboard alert.
- No hard delete of published material or revisions from the UI.

## Done when
T-PUB and T-REV tests pass, and the T-SUB-05 enumeration proves no pending or rejected submission is reachable publicly.
