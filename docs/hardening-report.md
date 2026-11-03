# UJAAS: Hardening Report

**Date:** 2026-11-02 · **Scope:** the built system (public site, CMS, submissions, e-magazine) on the local replica set with development data.
Nothing here is a production claim: no HTTPS host, no real content and no real traffic exist yet. Every line says what was run and what was not.

## 1. Commands and results

| Check | Command | Result |
|---|---|---|
| Lint, types, unit and API tests | `npm run lint`, `npm run typecheck`, `npm test` | clean; **backend 158/158, frontend 11/11** |
| Production dependency audit | `npm audit --omit=dev` | 0 vulnerabilities |
| Full dependency audit | `npm audit` | 17 moderate, all in the development tool chain (eslint plugins through `minimatch`); none ships to visitors |
| Secret scan | `node scripts/secret-scan.mjs` | 188 files, none found (also a CI step) |
| Taste lint | `lint.mjs app_build/frontend/src` | 0 FAIL, 0 WARN |
| Browser hardening, 31 pages x 4 widths | `node app_build/frontend/e2e/hardening.mjs` | **272 checks, 0 problems** (twice in a row) |
| Backup and restore drill | `npm run backup:drill` (backend) | all collections, indexes and a checksum match; backup 104 ms, restore 3.6 s for 165 documents |
| Launch clean-up | `node scripts/launch-check.mjs --source` | **4 hits**: the `DEV` wordmark, the sample hero sentence, a development-only note. Not ready to launch |
| Lighthouse (mobile profile, throttled) | see section 4 | accessibility 100, best practices 100, SEO 100 with indexing on |

## 2. What the browser pass covers (T-A11Y-01, T-RES-01, T-SEC-01, T-STA-01)
15 public pages (home, lists, a category, a reading page, authors, collections, search with and without results, e-magazine landing and issue, the writer form, contact, a 404) and 16 admin screens, each at 390, 768, 1366 and 1920 px:
- **No sideways scrolling** at any width on any page.
- **axe-core** (WCAG 2.0/2.1/2.2 A and AA rules) at 390 and 1366 px: **0 violations** after the fixes below. Judged on the settled page (reduced motion), not on a frame of the reveal animation.
- **Console and network:** no errors, no failed requests, no CSP violation, and **no request to any host other than the site's own**.
- **Headers on the web server:** `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, a `Content-Security-Policy` with `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'` and a per-request nonce on `script-src` (no `unsafe-inline` for scripts); no `X-Powered-By`.
- **Keyboard:** the skip link is the first stop and works; the first 25 stops on a list page all show a focus ring of at least 2 px; search works from the keyboard; the home page picks react to focus.
- **Reduced motion:** no animation runs. **Scripts off:** reading page, home, list and issue page still show their text and one `h1`.
- **Indexing:** with indexing off the whole site is `noindex` and `robots.txt` blocks everything; with it on, `robots.txt` allows the site and blocks `/admin` and `/api/` (SEO 100).

Problems the pass found and that were fixed:
1. Single-letter filter links on the authors page were smaller than 24 px (WCAG 2.2 target size): now at least 2.5 rem.
2. Card headings on list pages skipped a level (`h1` to `h3`): cards are `h2`, or `h3` under an `h2` section.
3. Every missing icon caused a 404 in the console: a stand-in favicon (shapes only, no letters) now exists. The logo is still a text wordmark marked DEV.
4. The reused connection between the web server and the API was reset about once in a hundred requests (`ECONNRESET`, seen as a 500): the API now keeps idle connections open for 65 s.
5. `robots.txt` was fixed at build time, so one build could not serve both staging and production: it is now read per request.
6. The late font swap moved the list page (layout shift 0.23): fonts have stable addresses and are preloaded; the shift is 0.

## 3. Security checklist (`security_review`)
| Item | Evidence | Status |
|---|---|---|
| Passwords: Argon2id, minimum 12, common-password check | `T-ADM-01`; the common-password list is a short built-in one | ✅ (weak list) |
| Login: generic error, lock after 5 failures for 15 minutes, 5 attempts per 15 minutes per address and email | `T-ADM-01` | ✅ |
| Sessions: HttpOnly, SameSite=Lax, server-side store, 8 h idle, 24 h absolute, rotated on login, killed on logout and password change | `T-ADM-02`, including the new idle-timeout test and the in-browser expiry flow | ✅; the `Secure` flag is set only in production and was **not** exercised over HTTPS |
| CSRF token on every non-GET admin call; origin check on public POSTs | `T-SEC-01` | ✅ |
| Authorisation server-side, deny by default, role by route | matrices for content, structure, submissions, issues (all four roles) and 401 without a session | ✅ for the built routes |
| Input: schema validation, length caps, NFC; NoSQL operator injection rejected; rich text allow-list | login, search and query tests; `sanitizeFilter` is on globally | ✅; the editor stores plain text, so the rich-text sanitiser is unit-tested only |
| CSP, no inline scripts, explicit font and image sources | headers check and zero CSP violations on 31 pages | ✅ with one recorded exception: `style-src` allows `unsafe-inline` (Next.js and React emit style attributes); scripts are strict |
| Rate limits: search 30/min, submissions 5/h per address and 20/day per email, contact 5/h, general 120/min | tests for each | ✅; the limiter store is in memory (one API instance assumed) |
| Headers: HSTS, nosniff, Referrer-Policy, Permissions-Policy, `frame-ancestors 'none'` | web and API | ✅; HSTS not verified over real TLS |
| Secrets in the environment only; `.env.example` names only; scanning in CI | secret scan clean; `.env` is ignored | ✅ for the working tree; **git history was not scanned** |
| Logging: structured, request id, no PII, no submission text, hashed addresses | log-capture test | ✅ |
| Dependencies: lockfile, audit in CI, no unpinned CDN scripts, no third-party requests on page load | audit 0 in production dependencies; zero foreign hosts on 31 pages | ✅ |
| Initial admin: one-time command, no default credentials | `T-ADM-01` | ✅ |
| Error monitoring receives a test event | the variable exists, **no monitoring service is connected** | ⛔ open |
| TOTP two-factor sign-in (P1) | not built | ⬜ |
| HTTPS in staging and production | needs a host | ⬜ |

## 4. Performance (T-PERF-01)
Lighthouse 12, mobile emulation, its default throttled profile (slow 4G, 4x CPU slowdown), local server, development data. Timings vary by about half a second between runs, so ranges are given.

| Page | Performance | LCP | CLS | TBT |
|---|---|---|---|---|
| Reading page | 90 to 97 | 2.1 to 3.0 s | 0 | 160 to 240 ms |
| Home | 85 to 90 | 3.4 to 3.7 s | 0 | 90 to 150 ms |
| Literature list | 80 to 87 | 3.7 to 4.4 s | 0 | 90 to 150 ms |
| E-magazine landing | 91 to 92 | 3.1 to 3.4 s | 0 | 90 to 160 ms |

Accessibility 100 and best practices 100 on all four. The budget (LCP at most 2.5 s on a mid-range phone over 4G) is **met by the reading page in some runs and not demonstrated for the others** under this stricter profile. Measured without throttling every request finishes in about 130 ms and the 390 px load shows LCP 180 to 230 ms and CLS 0 in Chrome. Ideas left, in order of likely gain: send less JavaScript (about 120 KB is shipped per page), render list pages without client scripts, and decide which fonts are worth preloading once real content exists.

## 5. Backup and restore (T-BCK-01)
`npm run backup -- --out <folder>` writes every collection (extended JSON), the full index definitions, the images and a manifest; `npm run restore -- --from <folder> --db <new name>` restores into an **empty** database only; `npm run backup:drill` does both into a scratch database and compares. The first drill failed: text indexes could not be recreated from their stored form. That was fixed and the drill now passes. Not done: a drill on the real host (Atlas snapshots and point-in-time restore), and agreeing the recovery point and time objectives. Backups contain private data and password hashes; store them like the database.

## 6. Hindi and content gates
- `docs/proofreading-list.md` lists **765 visible Hindi strings in 64 files** for a human proofreader. **Not proofread; no sign-off.**
- `launch-check` finds the four development leftovers above in the source and the `dev_data` records in the database. Both must report zero before launch (T-CLN-01).

## 7. Not done in this pass
Screen-reader testing; Lighthouse and axe on the admin screens beyond axe (Lighthouse needs a session); keyboard walk of the admin editor; load testing; penetration testing; scanning the git history for secrets; connecting error monitoring; TOTP; a restore drill on the real host; structured-data and Open Graph validators.
