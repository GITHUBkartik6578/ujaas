# ADR 0001 — Technology stack

**Status:** **Proposed** (owner preference recorded; spike not yet run)
**Date:** 2026-11-02 · **Decision (D-07):** owner chose MERN with Next.js. This ADR records the architecture and the checks needed before it is marked **Accepted**.

## Context
UJAAS is a content-rich Hindi site with strong SEO needs (server-rendered pages, real 404s, sitemap, JSON-LD), an admin CMS with workflow, revisions, scheduling and audit, a public submission form with private data, and an e-magazine with ordered issue contents. Repo is empty of code; `app_build/backend` and `app_build/frontend` exist as placeholders.

## Options compared
| Option | Fit | Main risks |
|---|---|---|
| **A. MongoDB + Express + Next.js (React) + Node, TypeScript** (owner choice) | Server rendering via Next.js; one language; Atlas hosting; flexible content schema | Relational data (issue ordering, many-to-many) needs care; Hindi search needs a normalised field; private data leak risk if documents are serialised whole |
| B. PostgreSQL + Express + Next.js | Strongest relational fit and constraints | Not the owner's choice |
| C. Django (built-in admin, auth, ORM) | Fast CMS | Different language; less control over custom admin look |
| D. Headless CMS (Strapi/Payload) | Faster admin | Dependency weight; verify each security control against the CMS (`security_review`) |
| E. Plain React SPA | — | Rejected: cannot meet the server-rendered SEO requirement |
| WordPress, microservices | — | Rejected by the Phase 1 brief (no unnecessary architecture) |

## Decision (proposed architecture)
- **Frontend:** Next.js (App Router), TypeScript, server-rendered public pages; admin as client-heavy routes under `/admin` (`noindex`).
- **Backend:** separate Express API (TypeScript) in `app_build/backend`, all business rules and permissions enforced here. Next.js server code calls the API; the browser calls the API through a same-origin reverse proxy path `/api`, so session cookies are first-party.
- **Database:** MongoDB on Atlas, **replica set** (needed for transactions). Mongoose models with strict schemas; Zod for request validation shared with the frontend where useful.
- **Auth/session:** Argon2id passwords; server-side sessions in MongoDB (`connect-mongo`); HttpOnly + Secure + SameSite=Lax cookie; CSRF token on non-GET admin calls.
- **Scheduler:** `node-cron` job every minute for scheduled publishing, logs actor `system`.
- **Search:** normalised Hindi field (`search_text`) per `hindi_content`, with a MongoDB text index; Atlas Search only if the quality test fails.
- **Media:** `sharp` re-encode, magic-byte check, random keys, served from a separate static path/domain; storage backend (local volume or object storage) decided in the spike.
- **Email:** none until D-06.
- **Tests:** Vitest/Jest (unit), Supertest (API), Playwright (E2E at 390/768/1366/1920 px), axe, Lighthouse.
- **Environments:** local, staging (noindex + basic-auth), production. Details in `docs/deployment.md`.

## Data-model consequences of MongoDB
1. Issue contents live in a separate `issue_items` collection (position, section label); reorder is one transaction.
2. Public responses use explicit allow-list serialisers; no document is returned whole.
3. Unique indexes enforce slugs, issue number, reference ID.
4. Hindi normalised fields are stored beside the original text.

## Spike (required before **Accepted**)
Throwaway repo, not product code. Pass/fail recorded below:
1. Atlas replica set: multi-document transaction reorders `issue_items` atomically.
2. Next.js SSR page reads from the Express API; verify HTML contains the Devanagari text, `<title>`, canonical, JSON-LD, and a 404 status for a missing slug.
3. Hindi search: 30 sample queries on matras, nukta and chandrabindu variants return expected results.
4. Session cookie works through the `/api` proxy with CSRF; login lockout works.
5. Devanagari font loads subsetted with `font-display: swap`; no clipped conjuncts at 390 px.
6. Image upload: magic-byte rejection and EXIF strip with `sharp`.
7. Node version support: local Node is v22.18.0 (checked); the taste inspector needs Node 22 + Chrome (Chrome not yet checked).

**Spike run 2026-11-02 inside the foundation build (not a throwaway repo).** Honest status:

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | Replica set, transaction, atomic reorder | **Partial.** Local single-node replica set (mongod 8.2.1), not Atlas. A multi-document transaction succeeds; reorder of `issue_items` is not written yet | `tests/media-data.test.ts` "replica set so transactions are possible" passes |
| 2 | Next.js SSR reads the API; Devanagari, title, canonical, JSON-LD, 404 | **Partial.** SSR HTML has `lang="hi"`, title and Devanagari text; unknown URL returns real 404; API reachable through the `/api` rewrite. Canonical and JSON-LD not built yet | curl output in `progress.md` change log |
| 3 | Hindi search, 30 queries | **Not run.** Only the normaliser has unit tests | `tests/env-hindi-workflow.test.ts` |
| 4 | Session cookie through the proxy, CSRF, lockout | **Pass.** Login through `localhost:3000/api` sets an HttpOnly cookie, `/me` works, foreign Origin gets 403; lockout, CSRF and expiry tests pass | 60 backend tests, curl run |
| 5 | Devanagari fonts, no clipping | **Partial.** Noto Serif/Sans Devanagari (OFL-1.1) self-hosted from `@fontsource`, `font-display: swap`; screenshots at 390 and 1366 px show no tofu. Real article text and the taste inspector not yet run | `.taste-skill/shots/` (git-ignored) |
| 6 | Image upload: magic bytes, EXIF strip | **Pass.** Wrong bytes, SVG, oversize, polyglot rejected or neutralised; EXIF removed | `tests/media-data.test.ts` |
| 7 | Node and Chrome | **Pass.** Node v22.18.0; Chrome 156 present | `node -v` |

Result: items 4, 6, 7 pass; 1, 2, 5 partial; 3 not run. ADR stays **Proposed**; the owner told the agent to proceed without waiting, so work continues on this stack. Items 1–3 must be closed in the CMS and public-site phases before the ADR is marked Accepted. Mongoose 9 note: schema type inference collapses with custom timestamp field names, so models with those use explicit interfaces.

## Consequences
Good: one language, strong SSR, simple hosting. Cost: we maintain relational integrity in application code, and need disciplined serialisers and tests (`T-SUB-05`, `T-PUB-*`). If the spike fails item 1 or 3, return to the owner with option B.

## Owner action
Confirm D-07 entry in the register; approve running the spike.
