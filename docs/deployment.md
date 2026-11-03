# UJAAS — Deployment, Backup and Release

**Status:** Draft. Hosting provider, domain and region are **not decided** (owner items 21 and 29). Nothing is deployed. No deploy, DNS change, push, merge or tag without explicit written authorisation; one approval does not cover the next release (`release_readiness`).

## 1. Environments
| Env | Data | Access | Indexing |
|---|---|---|---|
| local | `DEV DATA` seed files only | developer | n/a |
| staging | synthetic data only (`DEV DATA`) | basic-auth in front | `noindex` |
| production | real approved content only | public; admin behind login | indexed except `/admin` |

## 2. Architecture (per ADR 0001, proposed)
Browser → reverse proxy (HTTPS, HSTS) → Next.js server (public pages, admin UI) and Express API under `/api` → MongoDB Atlas replica set. Media on a separate static path or domain. Scheduler runs inside the API process (single instance) or as a separate worker; one instance only to avoid double publishing (or a DB lock). Hosting provider TBD.

## 3. Configuration
- `.env.example` lists names only: `NODE_ENV`, `MONGODB_URI`, `SESSION_SECRET`, `CSRF_SECRET`, `PUBLIC_BASE_URL`, `MEDIA_BASE_URL`, `SUBMISSION_BODY_MAX`, `RETENTION_DAYS_SUBMISSIONS`, `RETENTION_DAYS_CONTACT`, `RETENTION_DAYS_LOGS`, `IP_HASH_SALT`, `MAIL_*` (unset: email off), `ERROR_MONITORING_DSN`.
- Web server (Next.js): `API_URL` (where the Express API listens, server-side only), `SITE_URL` (public address for canonical URLs and the sitemap), `ALLOW_INDEXING` (only `1` in production; anything else keeps the whole site `noindex` and `robots.txt` blocking all).
- API: `TRUST_PROXY=1` when it sits behind the Next.js server or a reverse proxy, so per-IP rate limits use the visitor's address from `X-Forwarded-For`. The API must then be reachable only from that proxy, never directly from the internet (otherwise the header can be forged). `RATE_LIMIT_SCALE` stays `1` in production.
- Environment validation fails at startup with a clear message if a required variable is missing; `RETENTION_DAYS_*` unset keeps the purge job disabled.
- Web fonts live in `app_build/frontend/public/fonts` (copied by `npm run fonts:copy`, SIL OFL 1.1) and are served with a one-year immutable cache.
- API connections: idle connections are kept open for 65 seconds so the web server's reused connections are not reset.
- Scheduler: the API process starts a once-a-minute job that publishes due scheduled items. Run one API instance (a second is safe because every publish is a conditional update, but wastes work). `GET /api/v1/admin/ops/health` and the admin dashboard show its last run and any failed items.
- Secrets live only in the host's secret store; never in the repo.

## 4. Release procedure (needs written authorisation each time)
1. All P0 tests pass on the release commit in CI; matrix updated.
2. Build once; deploy the same artifact to staging; run smoke tests, link crawl, axe, Lighthouse.
3. Database migrations run before the new version starts and are backward compatible for one release.
4. Owner UAT on staging recorded.
5. Take a fresh backup; deploy to production; run smoke tests; check logs and error monitoring.
6. Tag and record the release in `progress.md`.

## 5. Rollback
Keep the previous build artifact. Roll back by redeploying it; if a migration was applied, use its documented down step or restore from the pre-release backup. Rollback is rehearsed on staging before launch.

## 6. Backups
- MongoDB: automated continuous or daily snapshots (Atlas), retention and RPO/RTO to be confirmed by the owner (item 29).
- Media: copy of the media store on the same schedule.
- **Restore drill** on a clean environment before launch and after any storage change (T-BCK-01); record the time taken and result.
- Backups contain private submissions; access is limited to `site_admin` and the host administrator; they follow the retention decision (D-02).

### 6a. Commands (backend folder)
`npm run backup -- --out <folder>` · `npm run restore -- --from <folder> --db <new database> [--media <folder>]` · `npm run backup:drill`. The drill restores into a scratch database next to the live one and compares counts, indexes and a checksum; measured 104 ms backup and 3.6 s restore for 165 documents on a laptop (not a recovery-time figure for production). Rehearse it again on the real host, and keep the host's own snapshots as the primary backup.

## 7. Monitoring and logs
Structured logs with request ID, no PII; error monitoring receives a test event before launch; health endpoint `/api/v1/admin/ops/health` and scheduler status on the dashboard.

## 8. Build order (from `startcycle.md`)
1. Foundation (repo, CI, schema, env validation, admin auth, audit, media, fonts) and design direction session.
2. Public site. 3. Editorial CMS. 4. Submissions (needs D-03 text before live). 5. E-magazine (PDF only if D-08). 6. Hardening and owner UAT. 7. Launch and handover.
If time runs out, cut P1 first (related works, previous/next issue, FAQ, 2FA, RSS). Never cut: server-side permissions, consent storage, unpublish purge, backups, submission privacy.

## 9. Open
Hosting provider and region, domain and DNS owner, error-monitoring vendor, object storage vs local volume (spike), RPO/RTO.
