# UJAAS — Progress Tracker

> Single place for the team to see what is done, what is in progress, and what is blocked.
> Update this file whenever a task changes state. Never mark something ✅ unless it is actually verified.

**Last updated:** 2026-10-24
**Current phase:** Phase 1 — Discovery & Specification

**Status legend:** ⬜ Not started · 🟡 In progress · ✅ Done & verified · ⛔ Blocked · ❓ Needs owner decision

---

## Phase 1 — Discovery & Specification

Reference: [docs/workflow/01-discovery-and-specification.md](docs/workflow/01-discovery-and-specification.md)

| # | Deliverable | Output file | Status | Owner | Notes |
|---|---|---|---|---|---|
| 1 | Hindwi research | `docs/reference-audit.md` | ⬜ | | |
| 2 | Rekhta e-magazines research | `docs/reference-audit.md` | ⬜ | | |
| 3 | Reference comparison matrix | `docs/reference-audit.md` | ⬜ | | |
| 4 | Functional & non-functional requirements | `docs/requirements.md` | ⬜ | | |
| 5 | Sitemap & route purposes | `docs/sitemap.md` | ⬜ | | |
| 6 | User flows (14 journeys + error flows) | `docs/user-flows.md` | ⬜ | | |
| 7 | Data model | `docs/data-model.md` | ⬜ | | |
| 8 | API contract | `docs/api-contract.md` | ⬜ | | |
| 9 | Editorial state machines | `docs/editorial-workflow.md` | ⬜ | | |
| 10 | Owner content checklist | `docs/content-handover.md` | ⬜ | | |
| 11 | Security & privacy decisions | `docs/security-and-privacy.md` | ⬜ | | |
| 12 | Test plan & traceability matrix | `docs/test-plan.md` | ⬜ | | |
| 13 | Deployment & backup plan | `docs/deployment.md` | ⬜ | | |
| 14 | Architecture Decision Record (stack choice) | `docs/decisions/` | ⬜ | | |
| 15 | Phase 1 owner sign-off | — | ❓ | Owner | Required before Phase 2 |

---

## Phase 2 — Implementation & Verification

Reference: [docs/workflow/02-implementation-and-verification.md](docs/workflow/02-implementation-and-verification.md)

| Step | Work item | Status | Owner | Notes |
|---|---|---|---|---|
| 1 | Inspect existing repo/workspace | ⬜ | | |
| 2 | Foundation: structure, schema, auth, env, scripts | ⬜ | | |
| 3 | Public website | ⬜ | | |
| 4 | Editorial CMS (admin) | ⬜ | | |
| 5 | Submission workflow | ⬜ | | |
| 6 | Testing (unit / integration / e2e, 390 / 1366 / 1920 px) | ⬜ | | |
| 7 | Production readiness checks | ⬜ | | |
| 8 | Final delivery report | ⬜ | | |

---

## Open Owner Decisions

| ID | Decision needed | Assumption (until decided) | Risk | Decision owner | Status |
|---|---|---|---|---|---|
| D-01 | Submission receipt method (reference ID / email / status lookup) | Confirmation screen + reference ID | Writers get no later updates | Owner | ❓ |
| D-02 | Data-retention period for submissions | None invented — pending | Legal/privacy exposure | Owner / Legal | ❓ |
| D-03 | Privacy policy & consent wording | None invented — pending | Cannot launch submissions | Owner / Legal | ❓ |
| D-04 | Optional image upload in submission form | Not in P0 until approved | Scope creep | Owner | ❓ |
| D-05 | Multiple editors / admin roles | Single admin role until approved | Permission model rework | Owner | ❓ |
| D-06 | Confirmation / notification emails (service) | Off until approved | No email channel | Owner | ❓ |

---

## Blockers & Risks

| Item | Impact | Raised by | Status |
|---|---|---|---|
| _None logged yet_ | | | |

---

## Change Log

| Date | Change | By |
|---|---|---|
| 2026-10-24 | Created workflow docs and this progress tracker | — |
