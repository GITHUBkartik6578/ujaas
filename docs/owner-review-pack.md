# UJAAS — Owner Review Pack (Phase 1)

**Status:** For owner review · **Date:** 2026-11-02. Nothing has been built. This pack lists what the owner must read, decide and sign before Phase 2 (`startcycle.md` gate).

## 1. What was produced (all drafts)
| Doc | What to check |
|---|---|
| `reference-audit.md` | Findings are from page text only; interactions are Unverified. 38 of 42 mockups not yet catalogued |
| `requirements.md` | Scope, priorities (P0/P1), pending items |
| `sitemap.md` | Routes, slugs (transliterated), header and footer, admin routes |
| `user-flows.md` | 16 flows and 8 error flows |
| `data-model.md`, `editorial-workflow.md`, `api-contract.md` | MongoDB collections, states, endpoints |
| `security-and-privacy.md` | Controls; retention and consent wording left to you |
| `content-handover.md` | What you must supply |
| `test-plan.md` | 49 tests; 74 requirements mapped; nothing run |
| `deployment.md`, `decisions/0001-technology-stack.md` | Architecture proposal; hosting not chosen |
| `design-tokens.md` | Palette measured from the design pack (D-09) |
| `decisions/*` | Register and assumptions |

## 2. Things the owner should know
1. **MERN with Next.js** is recorded as D-07 from your message; ADR 0001 stays Proposed until the spike passes.
2. The mockup submit page has a **file upload** and **one** declaration checkbox; the spec has no upload and **three** consents (D-04, D-12, D-03).
3. The mockups show a membership button, newsletter, map, events, statistics and named writers; none are built (D-23, D-24, D-25, D-30, `content_safety`).
4. The client documents A/B/C are not in the repo; questions D-10, D-11, D-13–D-15, D-17, D-18, D-20–D-22 have no definition. D-13 and D-18 are listed as launch-blocking.
5. Slugs like `/rachna-bhejein` and `/e-patrika` are proposals.
6. Category list, creation types and the 12 magazine section names are not confirmed.

## 3. Decisions needed (P1 first)
D-08 PDF · D-23 membership · D-24 newsletter · D-25 activities · D-26 mobile/tablet layouts · D-27 logo. Then D-02, D-03 (legal), D-05, D-12, D-16, D-28, D-29, D-31, and the undefined IDs. Full table: `decisions/owner-decision-register.md`.

## 4. Risks
| Risk | Impact | Mitigation |
|---|---|---|
| MongoDB for relational data | Integrity bugs | Transactions, allow-list serialisers, spike |
| Hindi search quality | Poor results | Normaliser, 30-query test, Atlas Search fallback |
| Legal text late (D-02, D-03) | Submissions cannot launch | Form built, stays off |
| No logo, no real images | Placeholder look | `DEV` wordmark, type-led design |
| Mockups desktop-only | Mobile unapproved | Derive and approve 390/768 px before content load |

## 5. Sign-off (E)
| Item | Owner | Date |
|---|---|---|
| Phase 1 specification approved | ❓ | |
| P1 decisions D-07 (recorded), D-08, D-09, D-23, D-24, D-25, D-26, D-27 | ❓ | |
| ADR 0001 accepted after spike | ❓ | |
| Phase 2 authorised in writing | ❓ | |
