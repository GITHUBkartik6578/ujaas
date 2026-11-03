# UJAAS — Progress Tracker

> Single place for the team to see what is done, what is in progress, and what is blocked.
> Update this file whenever a task changes state. Never mark something ✅ unless it is actually verified.

**Last updated:** 2026-11-02
**Current phase:** Phase 2, step 9 — launch-readiness report written (`docs/release-readiness.md`); launch is blocked on owner content, hosting and approvals, not on code
**Stack (D-07):** MERN with Next.js — owner choice recorded; ADR 0001 **Proposed** until spike passes

**Status legend:** ⬜ Not started · 🟡 In progress · ✅ Done & verified · ⛔ Blocked · ❓ Needs owner decision

---

## Phase 1 — Discovery & Specification

Reference: [docs/workflow/01-discovery-and-specification.md](docs/workflow/01-discovery-and-specification.md)
All documents below are **drafts**. 🟡 means written but not yet reviewed or approved by the owner; nothing here is ✅.

| # | Deliverable | Output file | Status | Owner | Notes |
|---|---|---|---|---|---|
| 1 | Hindwi research | `docs/reference-audit.md` | 🟡 | | Page-text only; interactions, mobile and search Unverified |
| 2 | Rekhta e-magazines research | `docs/reference-audit.md` | 🟡 | | Same limits; reader not opened |
| 3 | Reference comparison matrix | `docs/reference-audit.md` | 🟡 | | §4; mockup audit §7 covers 4 of 42 images, 38 still to catalogue |
| 4 | Functional & non-functional requirements | `docs/requirements.md` | 🟡 | | 74 IDs; 5 Pending decisions |
| 5 | Sitemap & route purposes | `docs/sitemap.md` | 🟡 | | Slugs are proposals |
| 6 | User flows (16 journeys + 8 error flows) | `docs/user-flows.md` | 🟡 | | |
| 7 | Data model | `docs/data-model.md` | 🟡 | | MongoDB collections |
| 8 | API contract | `docs/api-contract.md` | 🟡 | | v0.1.0-draft |
| 9 | Editorial state machines | `docs/editorial-workflow.md` | 🟡 | | |
| 10 | Owner content checklist | `docs/content-handover.md` | 🟡 | | Item numbering to be confirmed against client documents |
| 11 | Security & privacy decisions | `docs/security-and-privacy.md` | 🟡 | | Retention and consent wording pending (D-02, D-03) |
| 12 | Test plan & traceability matrix | `docs/test-plan.md` | 🟡 | | 49 tests, 74 requirements mapped; consistency check run (output below); no test run |
| 13 | Deployment & backup plan | `docs/deployment.md` | 🟡 | | Hosting not chosen |
| 14 | Architecture Decision Record (stack choice) | `docs/decisions/0001-technology-stack.md` | 🟡 | | Proposed; spike not run |
| 14b | Design tokens (colour palette from design pack) | `docs/design-tokens.md` | 🟡 | | Measured from 42 mockups; contrast computed |
| 14a | Decision register, assumptions, owner review pack | `docs/decisions/*`, `docs/owner-review-pack.md` | 🟡 | | |
| 15 | Phase 1 owner sign-off | — | ❓ | Owner | Required before Phase 2 |

**Consistency check (2026-11-02):** 74 requirement IDs, 74 matrix rows, 49 catalogue tests; none missing; no P0 requirement without a test; every flow route exists in `sitemap.md`; every catalogue test is referenced.

---

## Phase 2 — Implementation & Verification

Reference: [docs/workflow/02-implementation-and-verification.md](docs/workflow/02-implementation-and-verification.md)
Gate answered by owner instruction on 2026-11-02 (register §A2). No commit, push or deploy is authorised.

| Step | Work item | Status | Owner | Notes |
|---|---|---|---|---|
| 1 | Inspect existing repo/workspace | ✅ | Agent | Repo had docs only; no code, no dependencies |
| 2 | Foundation: structure, schema, auth, env, scripts | 🟡 | Agent | **Built and verified**: 63 tests pass (backend 60, frontend 3), lint, typecheck, build clean, prod audit 0. Missing: CI not yet run on GitHub, seed files, admin UI login page, scheduler wiring. Evidence: `docs/test-plan.md` §2a |
| 2b | Design direction session (`taste_design_run`) | 🟡 | Agent | Direction `split-stage` chosen and home page built from DEV fixtures. `lint.mjs` 0 FAIL; `inspect.mjs` 1 FAIL (no pictures, recorded exception) + 4 WARN. Report: `docs/design-direction.md`. Waiting for owner view of 390/768 px screens (D-26) |
| 3 | Public website | 🟡 | Agent | Built and checked: public API (contents, categories, authors, collections, search, home, settings, redirects, sitemap data), pages for home, literature, category, reading, authors, collections, search, 404, sitemap.xml, robots.txt, JSON-LD, canonical. 80 backend + 11 frontend tests pass; 400-page crawl clean. **Not built**: About, Editorial intro, policy pages (need owner text), e-magazine, submission, contact, related works, RSS. Taste inspector on these pages: FAILs recorded as exceptions (docs/design-direction.md §11) |
| 4 | Editorial CMS (admin) | 🟡 | Agent | Built and checked: admin API (content CRUD with revisions, If-Match conflicts, workflow transitions with publish checks, scheduler, signed preview, authors, categories, topics, collections with ordered members, homepage picks, settings, media list/delete, audit read, dashboard) and admin screens (login, dashboard, content list and editor, authors, categories, collections, media, homepage, settings, audit). 106 backend tests incl. a role-by-route matrix; 21/21 browser checks. **Not built**: rich-text editor (plain text with paste cleaning only), issue manager (magazine phase), submission inbox (submission phase), contact inbox, admin users page (D-05), TOTP 2FA (P1) |
| 5 | Submission workflow | 🟡 | Agent | Built and checked: writer form (three separate consents, honeypot, time check, duplicate and rate limits, idempotency, draft kept in the browser, receipt with reference), contact form, admin inbox with the review workflow, history, notes, assignment, conversion to a **draft**, withdrawal, contact inbox. 144 backend tests; 24/24 browser checks. **Closed until you supply the consent wording (D-03)**: with no consent text the API answers 503 and no link to the form shows. Purge job scheduled daily and disabled while D-02 is unset. **Not built**: emails (D-06), image/document upload (D-04/D-12), writer status lookup (D-01 option d) |
| 6 | E-magazine | 🟡 | Agent | Built and checked: issue records, ordered contents with section labels, publish rules, public landing and archive with year filter, issue page, reading through an issue (previous/next, canonical stays on the article), home block, sitemap, admin issue manager. 157 backend tests; 23/23 browser checks. **Not built**: any PDF handling, a standard list of section headings (editors type them), drag-and-drop ordering |
| 7 | Testing (unit / integration / e2e, 390 / 768 / 1366 / 1920 px) | 🟡 | Agent | 158 backend + 11 frontend tests; 4 browser flows (admin 21, submissions 24, magazine 23, hardening 272 checks over 31 pages at 4 widths). Missing: screen-reader testing, load testing |
| 8 | Production readiness checks | 🟡 | Agent | Hardening pass done (`docs/hardening-report.md`): axe 0 violations, no sideways scroll, security headers and CSP verified, secret scan and audit clean, backup drill passes, Lighthouse a11y/best-practices 100 and SEO 100. **Open**: `launch-check` reports 4 development leftovers; LCP over 2.5 s on 3 page types under the throttled profile; no error monitoring; no real host, HTTPS or logo; Hindi proofreading not signed off |
| 9 | Final delivery report | 🟡 | Agent | Drafted in `docs/release-readiness.md` (verdict: not ready to launch; owner content, wording, accounts, host and Hindi proofreading outstanding) |

---

## Open Owner Decisions

Full list with options: `docs/decisions/owner-decision-register.md`. Assumptions: `docs/decisions/open-decisions.md`.

| ID | Decision needed | Assumption (until decided) | Risk | Decision owner | Status |
|---|---|---|---|---|---|
| D-01 | Submission receipt method | Confirmation screen + reference ID | Writers get no later updates | Owner | ❓ |
| D-02 | Data-retention period | None invented; purge job disabled | Legal/privacy exposure | Owner / Legal | ❓ |
| D-03 | Privacy policy & consent wording | None invented; form cannot go live | Cannot launch submissions | Owner / Legal | ❓ |
| D-04 | Optional image upload in form | Not in P0 | Scope creep | Owner | ❓ |
| D-05 | Multiple editors / admin roles | `site_admin` only | Permission model rework | Owner | ❓ |
| D-06 | Notification emails | Off | No email channel | Owner | ❓ |
| D-07 | Tech stack | **MERN with Next.js (owner, 2026-11-02)** | ADR pending spike | Owner | 🟡 answered |
| D-08 | PDF of issues | None | Issue page rework | Owner | ❓ **P1** |
| D-09 | Palette roles and brand version | **Palette taken from design pack (owner instruction 2026-11-02)**; `docs/design-tokens.md` | Hex values measured from AI mockups | Owner | 🟡 answered |
| D-23 | Membership button | Not built | Header rework | Owner | ❓ **P1** |
| D-24 | Newsletter box | Not built | Footer rework | Owner | ❓ **P1** |
| D-25 | Activities / registration | Not built | Home rework | Owner | ❓ **P1** |
| D-26 | Mobile and tablet layouts | Derive from desktop, owner approves | Responsive rework | Owner | ❓ **P1** |
| D-27 | Logo choice and vector files | `DEV` text wordmark | Branding rework | Owner | ❓ **P1** |
| D-12, D-16, D-19, D-28–D-31 | See register | See assumptions | See register | Owner | ❓ |
| D-10, D-11, D-13–D-15, D-17, D-18, D-20–D-22 | **Not defined in repo**; D-13, D-18 launch-blocking | none possible | Unknown | Owner | ❓ |

---

## Blockers & Risks

| Item | Impact | Raised by | Status |
|---|---|---|---|
| Client documents A/B/C (`UJAAS_PageWise_Guide.pdf`) not in repo | Brand/brief authority missing; decisions D-10 to D-22 undefined | Agent | Open |
| 38 of 42 design-pack images not yet catalogued | Page coverage in mockups unknown | Agent | Open |
| Reference research limited to page text (no browser interaction) | Search, mobile, reader behaviour Unverified | Agent | Open — needs owner approval for browser pass |
| MongoDB for relational data and Hindi search | Integrity and search risk | Agent | Open — spike in ADR 0001 |
| Taste `lint.mjs` / `inspect.mjs` not yet run (Node 22.18.0 and Chrome 156 are present) | Design gate evidence missing | Agent | Open |
| Rate limiters use an in-memory store | Wrong counts if several API instances run | Agent | Open (ASSUMPTION: one instance) |

---

## Change Log

| Date | Change | By |
|---|---|---|
| 2026-10-24 | Created workflow docs and this progress tracker | — |
| 2026-11-02 | Wrote `.agents/agents.md` (roles, skills, designs folder rules) | Agent |
| 2026-11-03 | Public shell and homepage replaced with the approved canvas design "UJAAS Homepage" (top strip, header with genre dropdown, search and phone menu, hero with the interactive quill, genre bar, issue, works, writers, विचार band, submission invitation with the 7 editorial steps, wine footer). Blocks still come from `/api/v1/home` and hide when empty; links follow the route registry. New tokens (wine/ivory/gold, art colours), self-hosted Yatra One (OFL-1.1), static artwork in `public/art/`. Evidence: lint, typecheck, 14 tests and build pass; checked in the browser at 1440, 768 and 390 px with no horizontal overflow. Open for owner: logo is a recreation (D-27), गतिविधियाँ and social links stay out (D-25, no URLs), "साहित्यिक लेख" opens all of साहित्य (no matching type) | Agent |
| 2026-11-02 | Recorded D-07 (MERN with Next.js) from owner message; created decision register, assumptions, ADR 0001 (Proposed) | Agent |
| 2026-11-02 | Added `docs/design-tokens.md` (palette measured from design pack); recorded D-09 as answered by owner instruction | Agent |
| 2026-11-02 | Owner instruction "dont wait for owners decision, proceed further": recorded as Phase 1 accepted, Phase 2 authorised, P1 decisions on assumptions (register §A2) | Agent |
| 2026-11-02 | Foundation built: npm workspaces, backend (env validation, all models, Argon2id login with lockout, sessions, CSRF, origin check, rate limits, media pipeline, audit log, retention job, migrations, create-admin), frontend (Next.js shell, tokens, self-hosted Devanagari fonts, CSP nonce, 404, error page), CI workflow file (not run). Verified: lint, typecheck, 60 backend + 3 frontend tests, build, end-to-end login through the proxy, screenshots at 390 and 1366 px | Agent |
| 2026-11-02 | Design direction session: taste skill `draw.mjs` dealt 3 directions, chose `split-stage` (tagline word "मंच" becomes the fixed stage); built the home page from DEV fixtures (header, stage + picks, issue showcase, authors grid, closing action, footer); `SafeLink`/`BUILT_ROUTES` so unbuilt pages never become dead links; ran lint (0) and inspector (1 FAIL exception, 4 WARN); wrote `docs/design-direction.md` | Agent |
| 2026-11-02 | Public site phase: public API with allow-list serializers and one published-only helper; `seed:dev` DEV DATA; frontend pages (literature, category, reading, authors, collections, search, 404), `SafeLink`/route registry so unbuilt pages never render as links, SEO files and JSON-LD; 39-query Hindi search test; unpublish enumeration test; crawl script. Bugs caught and fixed: soft 404s from `loading.tsx`, no-op JSON-LD escape, `$ne` under `sanitizeFilter`, shared rate-limit bucket behind the web server | Agent |
| 2026-11-02 | Editorial CMS phase: admin API and screens as in step 4. Caught and fixed while building: Mongoose refuses a multi-document create in a transaction without `ordered: true`; a restore was wrongly blocked by the flag-permission check; Hindi words broke letter by letter in narrow table cells (tables now stack on phones). Added `e2e/admin-flow.mjs` (real Chrome via playwright-core) | Agent |
| 2026-11-02 | Submissions phase: public form and contact form, submission API (spam, duplicate, rate limits, idempotency, transaction), consent record with the owner's three statements, admin inbox and review workflow, contact inbox, `/admin/staff`, daily retention schedule. Caught and fixed: sanitizeFilter broke my own `$gte` date filters (now a trusted helper); the inbox search needed trusted regex clauses. Added `e2e/submission-flow.mjs` | Agent |
| 2026-11-02 | E-magazine phase: issue API (public and admin), landing, archive, issue page, issue manager, home block. Caught and fixed by the tests: a test asserted the wrong field set (the creation card legitimately carries its own date); the admin cover select needed a text match in the browser script | Agent |
| 2026-11-02 | Hardening: browser pass (axe, widths, headers, CSP, keyboard, reduced motion, scripts off), Lighthouse, secret scan, launch check, Hindi string list, backup/restore drill, idle-timeout test. Fixed: 24 px targets, heading levels, favicon 404, connection reuse reset (API keep-alive), `robots.txt` fixed at build time, font swap layout shift (fonts preloaded), lazy LCP image, restore of text indexes | Agent |
| 2026-11-02 | Spec updates found while building: `search_text_folded` field, extra content transitions (cancel schedule, re-publish, send back) | Agent |
| 2026-11-02 | Phase 1 drafts written: reference audit, requirements, sitemap, user flows, data model, editorial workflow, API contract, security and privacy, content handover, test plan, deployment, owner review pack. Consistency check run | Agent |
