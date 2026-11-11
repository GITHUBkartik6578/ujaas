# UJAAS (उजास) — अपनी बात, अपना मंच

Professional Hindi literary publishing platform: public reading site, editorial CMS, public writer submissions, and a readable digital e-magazine.It is very famous magazine.

## How this project works (read this first)

The work is split into **two phases**. Do not start Phase 2 until Phase 1 is approved by the owner.

| Phase | Goal | Instructions |
|---|---|---|
| 1 | Research + full specification (docs only, no major feature code) | [docs/workflow/01-discovery-and-specification.md](docs/workflow/01-discovery-and-specification.md) |
| 2 | Build, test and verify against the approved spec | [docs/workflow/02-implementation-and-verification.md](docs/workflow/02-implementation-and-verification.md) |

Live status of every task: **[progress.md](progress.md)**

## Team rules

1. The approved spec is the single source of truth.
2. Inspect the repo before changing anything; never overwrite existing work.
3. Never commit credentials. Use `.env.example` only.
4. Do not commit, push, merge, or deploy without explicit authorisation.
5. Owner/legal items (privacy wording, retention period, consent text) are never invented — mark them pending in `progress.md`.
6. Nothing is "done" until it is verified by a test — update `progress.md` honestly.

## Fixed scope

- Hindi (Devanagari) first
- No reader accounts, payments, comments, ratings or social feeds at launch
- Writers submit via form, no writer accounts
- Every submission is reviewed before publication
- Magazine = readable web articles (no PDF/scan reader at launch)

## Documentation map

```
README.md
progress.md
docs/
  workflow/        ← the two phase instruction files
  reference-audit.md
  requirements.md
  sitemap.md
  user-flows.md
  data-model.md
  api-contract.md
  editorial-workflow.md
  content-handover.md
  security-and-privacy.md
  test-plan.md
  deployment.md
  decisions/
```

Files other than `docs/workflow/` are produced during Phase 1.

## Architecture overview (proposed)

MERN with Next.js (owner choice D-07): Next.js (React, server-rendered) frontend, Express API, MongoDB Atlas, TypeScript. See `docs/decisions/0001-technology-stack.md` (status **Proposed**; spike partly complete). The foundation is built (auth, media, models, shell); public pages, CMS screens and submissions are not.

Phase 1 drafts are in `docs/`; start with `docs/owner-review-pack.md`. Decisions: `docs/decisions/owner-decision-register.md`.

## Setup and commands (foundation, verified 2026-11-02)

Requires Node 22+, npm, and a local `mongod` (8.x) for the dev database and tests.

```bash
npm install                      # installs both workspaces
npm run lint && npm run typecheck && npm test && npm run build

# local run (three terminals, in this order)
export MONGOMS_SYSTEM_BINARY="<path to your mongod>"   # avoids a download
npm run dev:db                   # single-node replica set on :27018; wait for "MongoDB replica set ready."
cp app_build/backend/.env.example app_build/backend/.env   # fill in the values
npm run dev:api                  # Express API on :4000
npm run dev:web                  # Next.js on :3000 (proxies /api and /media to the API)

# sample content for local viewing only (refuses to run in production)
cd app_build/backend && npm run seed:dev && cd ../..

# first administrator (one time, no default credentials)
cd app_build/backend && npm run create-admin -- --email you@example.org --name "Your Name"
```
Admin: sign in at `/admin/login` with the account made by `create-admin`. Browser check of the editorial flow: `E2E_EMAIL=... E2E_PASSWORD=... node app_build/frontend/e2e/admin-flow.mjs` (needs Chrome and the three services running).
Submissions: the writer form stays closed until a row exists in `consent_texts` (the owner's three statements, D-03). `npm run seed:dev` adds a clearly marked development one, which production ignores. Browser checks: `app_build/frontend/e2e/admin-flow.mjs` and `submission-flow.mjs`.
E-magazine: create an issue under `/admin/issues`, attach published creations with a section label each, then publish; the public side is `/e-patrika`. Browser checks: `e2e/admin-flow.mjs`, `submission-flow.mjs`, `magazine-flow.mjs`.
Hardening and launch checks: `app_build/frontend/e2e/hardening.mjs` (browser), `node scripts/secret-scan.mjs`, `node scripts/launch-check.mjs --source`, `npm run backup:drill` (backend). Results and open items: `docs/hardening-report.md`.
Details: `app_build/backend/README.md`, `app_build/frontend/README.md`. Status of every requirement: `docs/test-plan.md` and `progress.md`.

### Troubleshooting
- `Invalid environment configuration` on start: a required variable is missing; the message lists each one.
- Tests try to download MongoDB: set `MONGOMS_SYSTEM_BINARY` to your local `mongod`.
- `connect ECONNREFUSED 127.0.0.1:27018` from the API: it was started before the database was ready, and it does not retry. Wait for `MongoDB replica set ready.` in the `dev:db` output, then start `npm run dev:api` again.
- `Port 27018 is already in use`: `dev:db` found something on the port and refused to start a second database. If it is the dev database, use it as it is. If not, free the port. Do not delete `mongod.lock` or anything else in `app_build/.data`.
- `dev:db` takes longer than usual to start: normal after an unclean stop or a first start after days idle, because `mongod` recovers from its journal before accepting connections. On Windows, every stop that ends the process (the desktop app's stop, closing the terminal) is unclean; recovery is automatic and keeps the data. `scripts/dev-db.ts` allows 120 seconds for this (the library default of 10 seconds was too short). A real error, such as a locked data folder, still stops at once.
- Login gets `403 csrf_failed`: the request `Origin` must equal `PUBLIC_BASE_URL`, and non-GET admin calls need the `X-CSRF-Token` returned by login.
