# UJAAS: Release Readiness and Handover

**Date:** 2026-11-02 · **Verdict: NOT READY TO LAUNCH.** The software is built and hardened on a local setup with development data. What blocks launch is owner content, wording, accounts and a real host, none of which the agent may invent. Nothing has been committed, pushed, tagged or deployed, and none of that happens without written authorisation for each release.

## 1. Pre-launch checklist (`release_readiness`), with evidence

| # | Item | Status | Evidence or what is missing |
|---|---|---|---|
| 1 | Launch-blocking owner items received (`docs/content-handover.md`: About, Editor-in-Chief text, first works, first issue or "coming soon" agreement, policy pages, consent wording, admin names, remaining launch decisions) | ⛔ | none received; the site cannot go live without them |
| 2 | All P0 tests pass, matrix updated | 🟡 | 158 backend + 11 frontend tests pass; 4 browser flows pass (21, 24, 23, 272 checks); matrix consistent (`docs/test-plan.md`). Unrun: screen reader, load, real-host tests |
| 3 | Sample data removed (T-CLN-01) | ⛔ | `launch-check --source`: 4 hits (`DEV` wordmark in `SiteHeader.tsx`, two sample-sentence spots in `(site)/page.tsx`, dev note in `StageHome.tsx`); database holds `dev_data` records |
| 4 | Admin accounts, strong passwords, no defaults | ⬜ | tooling ready (`npm run create-admin`); needs the owner's list of people and roles |
| 5 | HTTPS and HSTS; header scan; dependency and secret scans | 🟡 | headers, audit (0 production vulnerabilities) and secret scan verified locally; **no TLS host exists** |
| 6 | Environment validation fails loudly; retention and mail handling confirmed | 🟡 | startup validation tested; purge stays off until `RETENTION_DAYS_*` are set; no mail is sent in this version |
| 7 | Backups configured, restore drill on a clean environment, RPO/RTO agreed | 🟡 | logical backup and restore drill pass locally (3.6 s for 165 documents); host snapshots and recovery objectives not set |
| 8 | Error monitoring receives a test event; logs contain no PII | 🟡 | log test passes; **no monitoring service connected** (`ERROR_MONITORING_DSN` unused) |
| 9 | Privacy and consent wording live and versioned; policy pages approved | ⛔ | the form stays closed (API answers `submissions_closed`) until a consent record is entered; policy pages are not written |
| 10 | `sitemap.xml`, `robots.txt`, `/admin` noindex | ✅ locally | indexing off blocks all; on allows the site, blocks `/admin` and `/api/`; Lighthouse SEO 100 |
| 11 | Rollback written and tried on staging | 🟡 | written below; **not tried**, there is no staging |
| 12 | Editor training; credentials handed to the authorised UJAAS representative | ⬜ | guide in section 4; training needs people |
| 13 | Owner sign-off recorded | ⬜ | `docs/owner-review-pack.md` is ready to send |

## 2. Final report

**Built:** public reading site (home, literature lists and categories, reading page, authors, collections, search, contact, writer submission form with receipt page, e-magazine landing and issue pages, preview links), editorial CMS (content, authors, categories, topics, collections, homepage, media, settings, audit log, submission inbox, messages, issues), Hindi search, sitemap and robots, redirects, scheduled publishing, retention job, backup tooling.

**Real results:** backend 158/158, frontend 11/11, lint and typecheck clean, production build succeeds; `npm audit --omit=dev` 0; secret scan clean (188 files); axe 0 violations over 31 pages; no sideways scroll at 390/768/1366/1920 px; Lighthouse accessibility 100, best practices 100, SEO 100 (indexing on). Details: `docs/hardening-report.md`.

**Known defects and gaps:**
- Largest-paint time is over 2.5 s on home, list and issue pages under Lighthouse's throttled profile.
- Not built: About, editorial-message and policy pages (need owner text), related works, FAQ, RSS, rich-text editor, admin users page, two-factor sign-in, side-by-side edit conflict compare.
- The logo is a text stand-in; the favicon is a placeholder.
- All 765 Hindi strings are unproofread (`docs/proofreading-list.md`).
- `style-src` allows inline styles (framework limitation); scripts are strict.
- Rate-limit counters are in memory: run one API instance.

**Missing from the owner:** everything in `docs/content-handover.md` marked launch-blocking, plus hosting account, domain and DNS ownership, error-monitoring choice, retention periods, backup objectives.

## 3. How to run it

**Local (development):** from the repo root `npm install`; in `app_build/backend` run `npm run dev:db` (replica set), `npm run seed:dev`, `npm run dev`; in `app_build/frontend` `npm run dev`. Needs Node 22+ and a local `mongod`.

**Production build (when a host is approved):**
1. Backend: `npm run build`, then `npm start` with the variables from `.env.example` set in the host's secret store (`NODE_ENV=production`, `MONGODB_URI`, `SESSION_SECRET`, `IP_HASH_SALT`, `PUBLIC_BASE_URL`, `MEDIA_DIR`, `MEDIA_BASE_URL`, `ENABLED_ROLES`, `TRUST_PROXY=1`, `RETENTION_DAYS_*` once agreed, `RATE_LIMIT_SCALE` unset). Keep the API reachable only from the web server.
2. Frontend: set `API_URL`, `SITE_URL`, and `ALLOW_INDEXING=1` **only on production**; `npm run build`, `npm start`.
3. Create the first administrator once: `npm run create-admin` (backend). No default account exists.
4. Enter the consent text record (three statements plus version) using the owner's approved wording; only then does the writer form open.
5. Remove development leftovers; `node scripts/launch-check.mjs --source` and `--db <uri>` must both report zero.
6. Take a backup (`npm run backup -- --out <folder>`), then go live with the checks in `docs/deployment.md` section 4.

**Rollback:** keep the previous build. Redeploy it; the server applies only forward-compatible changes for one release. If data was affected, restore the pre-release backup into a new database with `npm run restore -- --from <folder> --db <new name>`, check counts, then point `MONGODB_URI` at it. Not yet rehearsed.

## 4. Editor guide (short)
- Sign in at `/admin/login`. Roles: site admin, editor-in-chief, editor, content manager (only enabled roles work).
- Content goes draft → in review → approved → published; only the editor-in-chief or site admin publishes. Unpublishing removes a page from public lists, search and sitemap at once.
- Writer submissions arrive in the inbox, never publish by themselves, and are converted to a draft by a person. Do not copy submission text into notes or messages.
- The audit log records who changed what; the session ends after 8 hours idle.

## 5. Needs a human before launch (short list)
1. Owner supplies the launch-blocking content and wording.
2. A Hindi proofreader signs off `docs/proofreading-list.md`.
3. Approve hosting, domain, TLS, monitoring vendor and backup objectives.
4. Remove the four development leftovers and the development data; rerun `launch-check`.
5. Stage it (synthetic data, `noindex`, basic auth), rehearse rollback and restore, run owner acceptance.
6. Written authorisation to deploy.
