# UJAAS — Test Plan and Traceability Matrix

**Status:** Draft. No test has been written or run; every status is ⬜ or ❓. A requirement is ✅ only when its tests pass and the cell links to evidence (`traceability_check`).
Legend: ⬜ not started · 🟡 in progress · ✅ verified (evidence) · ⛔ blocked · ❓ needs owner decision.
Levels: U unit · I integration/API · E E2E (Playwright) · M manual/tool (axe, Lighthouse, taste inspector).
Viewports where marked: 390 / 768 / 1366 / 1920 px (taste inspector also 1440).

## 1. Test catalogue
| ID | What it proves | Level | Viewports | Pri |
|---|---|---|---|---|
| T-NAV-01 | Every header link reaches its sitemap route; no `href="#"` (link crawl output) | E | all | P0 |
| T-NAV-02 | Breadcrumbs correct on every inner page | E | 1366, 390 | P0 |
| T-NAV-03 | Footer shows five policy links only when approved; contact/social hidden when empty | E | 1366, 390 | P0 |
| T-HOME-01 | Home blocks come from data; empty block hidden; one failing block does not blank page | E, I | all | P0 |
| T-CARD-01 | Every content card links to the right detail route | E | all | P0 |
| T-CAT-01 | Category list/detail, pagination, empty state | E, I | all | P0 |
| T-READ-01 | Detail page: full text, authors linked, date, category, source, share links; related works (P1) | E | all | P0 |
| T-READ-02 | Reading layout: body ≥ 18 px, ~60–70 chars/line, verse line breaks, copy-paste keeps Hindi | E, M | 390, 1366 | P0 |
| T-AUTH-01 | Author directory filters; profile; non-public author 404 and no photo | E, I | all | P0 |
| T-COL-01 | Collection order; unpublished member omitted | E, I | 1366 | P0 |
| T-SRCH-01 | Search returns published matches, pagination, filters | I, E | 1366 | P0 |
| T-SRCH-02 | 30+ Hindi queries (matra, nukta, chandrabindu, punctuation variants) with output shown | I | — | P0 |
| T-SRCH-03 | No results state; unpublished never returned | I, E | 390, 1366 | P0 |
| T-STA-01 | Loading, empty, error, retry and real 404 status on public views | E | 390, 1366 | P0 |
| T-ADM-01 | Login, generic error, lockout, rate limit, no default credentials, one-time provisioning | I | — | P0 |
| T-ADM-02 | Session cookie flags, idle/absolute timeout, rotation, expiry flow restores editor content | I, E | 1366 | P0 |
| T-ADM-03 | Role × route matrix: every admin route and role allowed/denied server-side | I | — | P0 |
| T-ADM-04 | No admin API returns data to an unauthenticated request; admin pages noindex | I | — | P0 |
| T-PUB-01 | Draft → in_review → approved → published with required checks | I, E | 1366 | P0 |
| T-PUB-02 | Scheduled publish by the scheduler; failure stays scheduled with alert | I | — | P0 |
| T-PUB-03 | Unpublish removes item from list, search, sitemap, author, collection, issue, API; URL 404 | I, E | 1366 | P0 |
| T-PUB-04 | Archive and restore; illegal transitions return 422 | I | — | P0 |
| T-REV-01 | Revision created per edit; restore creates new revision; `If-Match` conflict 409 | I, E | 1366 | P0 |
| T-MED-01 | Upload: wrong magic bytes, oversize, SVG, polyglot rejected; EXIF stripped | I | — | P0 |
| T-MED-02 | Failed upload keeps form state; page without alt text cannot publish | E, I | 1366 | P0 |
| T-SUB-01 | Client and server validation; Hindi field messages; NFC; HTML stripped | I, E | 390, 1366 | P0 |
| T-SUB-02 | Consent record stored (three booleans, version, time, hashed IP/UA); all three required | I | — | P0 |
| T-SUB-03 | Honeypot, time-to-submit, rate limits, duplicate hash 409 | I | — | P0 |
| T-SUB-04 | Backend/DB failure → 503, nothing saved, form content kept; idempotency key | I, E | 390 | P0 |
| T-SUB-05 | Enumerate every public route/endpoint: no pending, under-review, rejected or private data | I | — | P0 |
| T-SUB-06 | Review workflow transitions, permissions, status history, convert to draft | I, E | 1366 | P0 |
| T-SUB-07 | Retention purge job disabled while `RETENTION_DAYS_*` unset; works when set (staging) | I | — | P0 |
| T-CON-01 | Contact form validation, limits, honeypot, message in admin inbox | I, E | 390, 1366 | P0 |
| T-MAG-01 | Landing, archive newest-first, year filter, `show_in_archive`, coming-soon state | E, I | all | P0 |
| T-MAG-02 | Ordered contents; atomic reorder; same creation in two issues without duplication | I | — | P0 |
| T-MAG-03 | Unpublished member omitted publicly and warned in admin; issue publish rules | I, E | 1366 | P0 |
| T-HI-01 | Screenshots: no tofu or clipped conjuncts/matras; headlines ≤ 2 lines at 390 px | M | 390, 1366, 1920 | P0 |
| T-HI-02 | NFC storage, control character rejection, ZWJ/ZWNJ kept, line breaks kept | U, I | — | P0 |
| T-SEC-01 | Security headers, CSP, CSRF on non-GET admin, origin check on public POST | I | — | P0 |
| T-SEC-02 | Secret scan, dependency audit, log sample has no PII or submission text, NoSQL operator injection rejected | I, M | — | P0 |
| T-SEO-01 | Title, description, canonical, OG, JSON-LD valid; sitemap lists only published; robots blocks `/admin`; real 404 | I, M | — | P0 |
| T-SEO-02 | Post-launch Search Console check | M | — | P0 |
| T-A11Y-01 | axe, keyboard-only use (header, search, form, carousels, accordions, reorder buttons), contrast measured | M | 390, 1366 | P0 |
| T-PERF-01 | Lighthouse: LCP ≤ 2.5 s on article page, layout shift, font subset | M | 390 | P0 |
| T-RES-01 | No horizontal scroll; essential controls visible; no overflow at 390/768/1366/1920 | E, M | all | P0 |
| T-BCK-01 | Backup and restore drill on a clean environment | M | — | P0 |
| T-CLN-01 | Search data and templates for `DEV DATA`, `lorem`, `example.com`, mockup strings, `TODO`: zero hits | M | — | P0 |
| T-SCOPE-01 | None of the excluded items appear (membership, newsletter, registration, rankings, counters, fake stats, faces, map) | E, M | 1366, 390 | P0 |
| T-DEP-01 | Env validation fails loudly; migrations and seed behave; seed only local/staging | I | — | P0 |

## 2. Traceability matrix
Columns: requirement · UI page/component · DB/API dependency · tests · priority · status · owner-supplied dependency.

| Req | UI | DB / API | Tests | Pri | Status | Owner dependency |
|---|---|---|---|---|---|---|
| FR-001 | `/` | `GET /home`, settings | T-HOME-01, T-CARD-01 | P0 | 🟡 | content, imagery |
| FR-002 | header, footer, breadcrumbs | settings | T-NAV-01, T-NAV-02, T-NAV-03 | P0 | 🟡 | D-29, policy links |
| FR-003 | `/sahitya` | `GET /contents` | T-CAT-01, T-CARD-01 | P0 | 🟡 | category list |
| FR-004 | `/sahitya/[category]` | categories | T-CAT-01, T-STA-01 | P0 | 🟡 | category list |
| FR-005 | `/rachna/[slug]` | `GET /contents/{slug}` | T-READ-01, T-READ-02, T-HI-02 | P0 | 🟡 | content |
| FR-006 | `/rachnakar*` | authors | T-AUTH-01 | P0 | 🟡 | authors, permissions |
| FR-007 | related works block | `…/related` | T-READ-01 | P1 | ⬜ | — |
| FR-008 | `/sangrah*` | collections | T-COL-01 | P0 | 🟡 | collections |
| FR-009 | `/khoj` | `GET /search` | T-SRCH-01, T-SRCH-02, T-SRCH-03 | P0 | 🟡 | — |
| FR-010 | 404 page | slug_redirects | T-STA-01, T-PUB-03 | P0 | 🟡 | — |
| FR-011 | `/hamare-bare-mein` | static | T-NAV-01, T-CLN-01 | P0 | ⬜ | item 5 |
| FR-012 | `/sampadkiya` | static | T-NAV-01, T-CLN-01 | P0 | ⬜ | item 6, D-28 |
| FR-013 | `/sampark` | `POST /contact` | T-CON-01 | P0 | 🟡 | item 17 |
| FR-014 | `/niti/*` | static | T-NAV-03, T-CLN-01 | P0 | ⬜ | items 22–24 |
| FR-015 | all data views | — | T-STA-01, T-HOME-01 | P0 | 🟡 | — |
| FR-016 | share links | — | T-READ-01 | P1 | ⬜ | — |
| FR-017 | sitemap, robots | helper | T-SEO-01 | P0 | 🟡 | — |
| FR-018 | `/gatividhiyan` | pending | — | P1 | ❓ | D-25 |
| FR-019 | submit guidelines | static | T-SUB-01, T-CLN-01 | P0 | 🟡 | item 16 |
| FR-020 | `/e-patrika` | `GET /issues` | T-MAG-01 | P0 | 🟡 | item 15 |
| FR-021 | archive filter | `GET /issues?year=` | T-MAG-01 | P0 | 🟡 | — |
| FR-022 | `/e-patrika/[slug]` | `GET /issues/{slug}` | T-MAG-02, T-MAG-03 | P0 | 🟡 | items 11, 12 |
| FR-023 | article from issue | contents | T-MAG-02, T-READ-01 | P0 | 🟡 | — |
| FR-024 | prev/next | issue_items | T-MAG-02 | P1 | 🟡 | — |
| FR-025 | PDF | pending | — | Pending | ❓ | D-08 |
| FR-026 | coming-soon | — | T-MAG-01 | P0 | 🟡 | item 15 |
| FR-027 | `/rachna-bhejein` | `POST /submissions` | T-SUB-01, T-SUB-02 | P0 | 🟡 | D-03 |
| FR-028 | form protections | submissions | T-SUB-03, T-SUB-04 | P0 | 🟡 | — |
| FR-029 | `/rachna-bhejein/prapti` | reference_id | T-SUB-01 | P0 | 🟡 | D-01 |
| FR-030 | consent | submissions, consent_texts | T-SUB-02 | P0 | 🟡 | D-03 |
| FR-031 | purge job | job | T-SUB-07 | P0 | 🟡 | D-02 |
| FR-032 | extra fields | pending | — | Pending | ❓ | D-12, D-04 |
| FR-033 | emails | pending | — | Pending | ❓ | D-06 |
| FR-034 | `/admin/login` | `/auth/*` | T-ADM-01, T-ADM-02, T-ADM-04, T-SEC-01 | P0 | 🟡 | item 27 |
| FR-035 | `/admin` | counts | T-ADM-03, T-PUB-02 | P0 | 🟡 | — |
| FR-036 | content editor | contents, revisions | T-PUB-01, T-REV-01, T-MED-02 | P0 | 🟡 | — |
| FR-037 | status controls | transition | T-PUB-01, T-PUB-02, T-PUB-03, T-PUB-04 | P0 | 🟡 | — |
| FR-038 | FAQ | static | T-A11Y-01 | P1 | ⬜ | item 16 |
| FR-039 | inbox | submissions | T-SUB-05, T-SUB-06 | P0 | 🟡 | — |
| FR-040 | authors manager | authors | T-ADM-03, T-AUTH-01 | P0 | 🟡 | item 9 |
| FR-041 | categories manager | categories | T-ADM-03, T-CAT-01 | P0 | 🟡 | item 7 |
| FR-042 | collections manager | collections | T-COL-01 | P0 | 🟡 | — |
| FR-043 | issue manager | issues | T-MAG-02, T-MAG-03 | P0 | 🟡 | — |
| FR-044 | media library | media | T-MED-01, T-MED-02 | P0 | 🟡 | item 14 |
| FR-045 | homepage, settings | homepage_slots, settings | T-HOME-01, T-ADM-03 | P0 | 🟡 | item 17 |
| FR-046 | audit page | audit_logs | T-ADM-03, T-PUB-04 | P0 | 🟡 | — |
| FR-047 | messages inbox | contact_messages | T-CON-01 | P0 | 🟡 | — |
| FR-048 | 2FA | — | — | P1 | ⬜ | — |
| FR-049 | RSS | helper | T-SEO-01 | P1 | ⬜ | — |
| FR-050 | ops page | health, backups | T-BCK-01, T-DEP-01 | P0 | 🟡 | item 29 |
| FR-051 | withdrawal | submissions | T-SUB-06 | P0 | 🟡 | D-02, D-03 |
| FR-052 | users page | `/users` | — | Pending | ❓ | D-05 |
| DR-01 | all UI | — | T-SCOPE-01 | P0 | ⬜ | direction approval |
| DR-02 | tokens | — | T-RES-01, T-A11Y-01 | P0 | ⬜ | D-09 |
| DR-03 | reading pages | — | T-READ-02, T-HI-01 | P0 | ⬜ | fonts |
| DR-04 | layouts | — | T-RES-01 | P0 | ⬜ | D-26 |
| DR-05 | motion | — | T-A11Y-01, T-PERF-01 | P0 | ⬜ | — |
| DR-06 | imagery | media | T-CLN-01, T-MED-02 | P0 | ⬜ | item 14 |
| DR-07 | taste gate | — | T-RES-01, T-HI-01 | P0 | ⬜ | D-31 |
| DR-08 | excluded items | — | T-SCOPE-01 | P0 | ⬜ | D-23, D-24, D-25, D-30 |
| NFR-001 | all text | NFC helper | T-HI-02, T-HI-01 | P0 | 🟡 | — |
| NFR-002 | all public pages | helpers | T-SEO-01, T-SEO-02 | P0 | 🟡 | — |
| NFR-003 | all | — | T-A11Y-01 | P0 | 🟡 | — |
| NFR-004 | all | — | T-PERF-01 | P0 | 🟡 | — |
| NFR-005 | all | — | T-RES-01 | P0 | ✅ | — |
| NFR-006 | all | — | T-SEC-01, T-SEC-02, T-ADM-01 | P0 | 🟡 | — |
| NFR-007 | all | — | T-SUB-05, T-SEC-02 | P0 | ✅ | — |
| NFR-008 | ops | backups | T-BCK-01 | P0 | 🟡 | item 29 |
| NFR-009 | logs | — | T-SEC-02 | P0 | 🟡 | monitoring vendor |
| NFR-010 | CI | — | T-DEP-01 | P0 | 🟡 | — |
| NFR-011 | all | — | T-RES-01 | P0 | ⬜ | browser list |
| NFR-012 | fonts | — | T-HI-01, T-PERF-01 | P0 | 🟡 | fonts |
| NFR-013 | all | — | T-CLN-01 | P0 | 🟡 | — |
| NFR-014 | config | env | T-DEP-01, T-SEC-02 | P0 | 🟡 | — |

## 2a. Evidence log (Phase 2 foundation, 2026-11-02)
Commands run from the repo root: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm audit --omit=dev`.
Results: lint clean; typecheck clean; **backend 60/60 tests passed (3 files), frontend 3/3 passed (1 file)**; build succeeded; production audit 0 vulnerabilities.

| Test ID | Status | What is covered so far | Missing |
|---|---|---|---|
| T-DEP-01 | 🟡 | env validation, retention default off, https in production, one-time admin command, migrations idempotent | seed behaviour, CI run |
| T-HI-02 | 🟡 | NFC, line breaks, control chars, ZWJ, search normaliser | applied to real content fields |
| T-ADM-01 | ✅ for the API | no default credentials, generic error, lockout, rate limit, one-time provisioning | none for API; UI login page not built |
| T-ADM-02 | 🟡 | cookie flags, rotation, CSRF, absolute timeout, deactivation, password change | idle-timeout test, expired-session editor restore (UI) |
| T-ADM-03 | 🟡 | role enabled/denied on existing routes | role × route matrix for all admin routes (they do not exist yet) |
| T-ADM-04 | 🟡 | existing admin routes return 401 without a session | all future routes |
| T-MED-01 | ✅ | wrong bytes, SVG, oversize, polyglot, EXIF, random key, nosniff | none |
| T-MED-02 | 🟡 | alt text set via PATCH, tags stripped | block publish without alt (content phase) |
| T-SEC-01 | 🟡 | headers, CSP, CSRF, origin check; frontend CSP nonce checked with curl | CSP violation report check in browser |
| T-SEC-02 | 🟡 | NoSQL operator injection in login rejected; audit has no secrets; prod audit clean | secret scan in CI, log sample review |
| T-SUB-07 | ✅ | disabled while unset; deletes only old finished submissions when set | scheduling the job |
| T-PUB-04 | 🟡 | transition tables and permission rules (unit) | API endpoints and audit rows |
| T-SCOPE-01 / T-RES-01 / T-HI-01 | ⬜ | one screenshot each at 390 and 1366 px taken manually, no overflow or tofu | taste inspector, 768 and 1920 px, real pages |

Not run at all: taste `lint.mjs` / `inspect.mjs`, axe, Lighthouse, Playwright, backup drill.

## 2b. Evidence log: public site phase (2026-11-02)
Commands from the repo root: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm audit --omit=dev`; `node app_build/frontend/scripts/crawl.mjs http://localhost:3000` against the production build with DEV DATA seeded (`npm run seed:dev`).
Results: lint and typecheck clean; **backend 80/80 tests passed (4 files), frontend 11/11 (2 files)**; build succeeded (12 routes); production audit 0 vulnerabilities; crawl **400 pages, 0 broken links, 0 placeholder links, every page one `h1`, `lang="hi"` and a title** (the crawl is capped at 400; the alphabet and type filters produce many combinations).
HTTP status checks on the running build: unknown slug, unpublished, draft, scheduled-in-future, non-public author, unknown category, unknown collection and an unknown path all return **404**; a published page returns 200; a renamed slug returns a permanent redirect (308) to the new address. `robots.txt` blocks everything and pages carry `noindex` while `ALLOW_INDEXING` is off; `sitemap.xml` lists published public URLs only.

| Test ID | Status | Covered | Missing |
|---|---|---|---|
| T-SRCH-02 | ✅ | 39 Hindi queries (nukta, chandrabindu, anusvara, danda, spacing, author and category words, hidden words) all return exactly the expected published records | owner-supplied real corpus later |
| T-SRCH-01, T-SRCH-03 | 🟡 | ranking, pagination, type and category filters, 422 on bad input, operator injection, empty result, rate limit 429 | E2E in a browser at 390/1366 px |
| T-PUB-03 | 🟡 | unpublish removes an item from lists, search, author, category, collection, home, sitemap data and detail (API) | the same through the CMS action; web pages checked by curl only |
| T-SUB-05 | 🟡 | every public route scanned for private fields and hidden slugs; no submission route exists publicly | submissions do not exist yet |
| T-AUTH-01 | ✅ for the API and pages | non-public author is 404 and has no link; works counts exclude unpublished work | none |
| T-COL-01 | 🟡 | order kept, unpublished member omitted | E2E |
| T-CAT-01, T-READ-01 | 🟡 | API and page behaviour, line breaks, authors, cover only with public asset and alt | E2E, related works (P1) |
| T-READ-02 | 🟡 | verse breaks and prose paragraphs (unit), no HTML injection | font size, measure and copy-paste in a browser |
| T-NAV-01 | 🟡 | crawl as above, route registry unit test | header and footer link check once all routes exist |
| T-STA-01 | 🟡 | real 404 status everywhere, error page with retry, 429 and down states on search | loading skeleton: removed because streaming caused soft 404s (see below) |
| T-SEO-01 | 🟡 | titles, canonical, JSON-LD Article and Person, sitemap, robots, noindex | structured-data validator, Open Graph check, description lengths |
| T-RES-01, T-A11Y-01, T-PERF-01, T-HI-01 | ⬜ | taste inspector at 1440/768/390 px only | 1366/1920 px, axe, Lighthouse, Hindi proofreading |
Real bugs found by these checks and fixed: a root `loading.tsx` made every missing page return HTTP 200 (soft 404); the JSON-LD escape was a no-op because of shell escaping (caught by a unit test); `$ne` filters broke under `sanitizeFilter`; the crawl exposed that server-side requests shared one rate-limit bucket (fixed by forwarding the visitor address).

## 2c. Evidence log: editorial CMS phase (2026-11-02)
Commands from the repo root: `npm run lint`, `npm run typecheck`, `npm test`, `npm audit --omit=dev`, taste `lint.mjs`; and `node app_build/frontend/e2e/admin-flow.mjs` in real Chrome (playwright-core, no browser download) against the production build with the local replica set, API and web server running.
Results: lint and typecheck clean; **backend 106/106 tests (5 files, 26 of them the CMS suite), frontend 11/11**; production audit 0 vulnerabilities; taste lint 0 FAIL, 0 WARN (documented ignores for 1px row rules and the dialog shadow, which are allowed on app screens); **browser flow 21/21 checks**.

| Test ID | Status | Covered | Missing |
|---|---|---|---|
| T-ADM-03 | ✅ for built routes | role by route matrix over 19 admin routes and all four roles, checked server-side (allowed roles get past the gate, every other role gets 403) | routes added later (submissions, issues, users) must join the matrix |
| T-ADM-04 | ✅ for built routes | every admin route returns 401 without a session; the admin pages redirect to login and the login is `noindex` | |
| T-ADM-02 | ✅ | cookie flags, rotation, CSRF, timeouts (earlier) plus **in-browser expiry: the relogin dialog appears, the save is retried and the typed text is kept** | idle timeout with a real wait |
| T-ADM-01 | ✅ for the API; login screen checked in the browser (generic error) | | TOTP (P1) |
| T-PUB-01 | ✅ | draft, review, approve, publish blocked with named reasons, publish; an editor cannot publish; in the API and in the browser | |
| T-PUB-02 | 🟡 | future-only scheduling, the job publishes due items as `system`, a failing item stays scheduled with a dashboard alert | the one-minute timer firing by itself was not observed (the job function was called directly) |
| T-PUB-03 | ✅ | unpublish removes the item from public detail, list, search and sitemap; confirmed in the browser with a real 404 | |
| T-PUB-04 | ✅ | illegal transitions give 422, archive and restore to draft, hard delete only for never-published drafts by site_admin | |
| T-REV-01 | ✅ | a revision per edit, restore as a new revision with checks cleared, `If-Match` 428 and 409, restore refused while published | a conflict compare screen (only a message is shown) |
| T-MED-02 | ✅ | a cover without alt text blocks publishing; publishing makes a cover with alt public | upload failure message in the browser |
| T-RES-01 | 🟡 | content list and editor have no sideways scroll at 390 px in the browser; tables stack on phones | 768 and 1920 px, the other admin screens |
| T-A11Y-01 | ⬜ | labels, focus styles and button reordering are built | axe and a keyboard walkthrough not run |
Not run: taste `inspect.mjs --app` (the admin is behind a login the inspector cannot pass), Lighthouse, 768/1366/1920 px screenshots of every admin screen (only dashboard and editor at 1366, list and editor at 390).
Known gaps: the editor is plain text with paste cleaning, not rich text; a stale-edit conflict shows a message but no side-by-side compare; there is no screen for admin users (D-05) or the contact inbox.

## 2d. Evidence log: submissions phase (2026-11-02)
Commands from the repo root: `npm run lint`, `npm run typecheck`, `npm test`, `npm audit --omit=dev`, taste `lint.mjs`; `node app_build/frontend/e2e/submission-flow.mjs` in real Chrome against the production build (the script inserts a clearly marked development consent text and removes it afterwards).
Results: lint and typecheck clean; **backend 144/144 tests (6 files; 38 are the submissions suite), frontend 11/11**; production audit 0 vulnerabilities; taste lint 0 FAIL, 0 WARN; **browser flow 24/24**.

| Test ID | Status | Covered | Missing |
|---|---|---|---|
| T-SUB-01 | ✅ | 12 server-side validation cases each name the field with a Hindi message; tags stripped, line breaks kept, NFC; the browser blocks an unticked consent | the same checks at 768 px |
| T-SUB-02 | ✅ | three consents, text version, time, salted hashes only (the raw address and user agent are absent from the stored record); a development consent text is ignored in production | owner wording (D-03) |
| T-SUB-03 | ✅ | honeypot, fast form and missing start time store nothing and look like success; duplicates 409 without the reference, allowed again after 30 days; 20 a day per email and 5 an hour per address give 429 with Retry-After | |
| T-SUB-04 | ✅ | idempotency key returns the same reference with one record; a storage failure is 503 with nothing saved and the retry works; in the browser a 503 keeps the typed text and it survives a reload | |
| T-SUB-05 | ✅ | a stored submission appears in no public list, search, home, sitemap or author route, and no public route exposes it by id or reference; the form-open answer is `open:false` without consent text | |
| T-SUB-06 | ✅ | state table by role, notes required, illegal and final states, history in order with actors, assign, conversion to a draft only (`submission_id` private, not public), withdrawal with a recorded reason; the whole path in the browser | |
| T-SUB-07 | 🟡 | purge logic tested earlier; now scheduled daily and idle while unset | a scheduled run was not observed |
| T-CON-01 | ✅ | validation, honeypot, 5 an hour, private storage, inbox read and mark handled, content managers refused; sent from the browser | |
| T-SEC-02 | ✅ | a log capture of a full submission contains the request path but none of the name, email, title or text | |
| T-ADM-03 | ✅ | the new admin routes join the role matrix (content managers get 403, unauthenticated 401) | |
Not run: taste `inspect.mjs --app` on the inbox (login-gated); axe; Lighthouse; 768 and 1920 px of the new screens. The form was inspected on the public side (see `design-direction.md` section 13).
Known gaps: no email to writers (D-06), no status lookup for writers (D-01), no attachments (D-04/D-12). Withdrawal is recorded by an editor on a writer's request; there is no writer-facing way to ask other than the contact form.

## 2e. Evidence log: e-magazine phase (2026-11-02)
Commands from the repo root: `npm run lint`, `npm run typecheck`, `npm test`, `npm audit --omit=dev`, taste `lint.mjs`; `node app_build/frontend/e2e/magazine-flow.mjs` in real Chrome (it creates its own issues and removes them).
Results: lint and typecheck clean; **backend 157/157 tests (7 files; 13 are the issue suite), frontend 11/11**; production audit 0 vulnerabilities; taste lint 0 FAIL, 0 WARN; **browser flow 23/23**.

| Test ID | Status | Covered | Missing |
|---|---|---|---|
| T-MAG-01 | ✅ | empty archive and no home block before the first issue; newest first; year filter and the list of years; an issue kept out of the archive is still readable at its address; `current` is the newest published issue; bad year and page size give 422; a draft and an archived issue are real 404s; in the browser: honest "coming soon", landing, year filter, empty year | |
| T-MAG-02 | ✅ | only published creations can be attached; duplicates refused; a failed replace keeps the old order (one transaction); the same creation sits in two issues and in the general list as one record; reorder with buttons saved and shown; previous and next stay inside the issue; reading through an issue keeps the canonical address on the article | drag and drop is not offered (buttons only, by design) |
| T-MAG-03 | ✅ | a creation that is no longer published vanishes from the public issue page and neighbours, shows a warning in the admin, and an issue with no live member cannot be published; publishing needs a cover with alt text, number, date and one live item; only the chief may publish | |
| T-ADM-03 | ✅ | the issue routes join the role matrix | |
| T-SEO-01 | 🟡 | issue page: title, canonical, `PublicationIssue` markup, sitemap entry | structured-data validator |
| T-RES-01 | 🟡 | issue page, magazine landing and issue list have no sideways scroll at 390 px | 768 and 1920 px |
Not run: axe, Lighthouse, taste `inspect.mjs` on the magazine pages and the issue admin (the magazine pages carry the same recorded exceptions as the other utility pages), screenshots at 768 and 1920 px.
Not built by design: any PDF upload, download or viewer; the frequency of the magazine is not written anywhere on the site, only each issue's own period text; the standard section headings are left to the editors, who type a label per item.

## 2f. Evidence log: hardening (2026-11-02)
Full detail, commands and every limit: `docs/hardening-report.md`.

| Test ID | Status | Covered | Missing |
|---|---|---|---|
| T-A11Y-01 | 🟡 | axe-core 0 violations on 31 pages at 390 and 1366 px; skip link, focus rings, keyboard search, reduced motion, scripts off; Lighthouse accessibility 100 | screen-reader pass; keyboard walk of the admin editor |
| T-RES-01 | ✅ | 31 pages at 390, 768, 1366 and 1920 px: no sideways scroll | |
| T-PERF-01 | 🟡 | CLS 0 everywhere; Lighthouse best practices 100; reading page LCP 2.1 to 3.0 s | LCP over 2.5 s on home, list and issue pages under the throttled profile |
| T-SEC-01 | ✅ | headers, CSP with nonce (no inline script), zero CSP violations, CSRF, origin check; same-origin only | HTTPS and HSTS over real TLS |
| T-SEC-02 | 🟡 | secret scan clean, production audit 0, log capture, no foreign hosts | git history scan; 17 moderate findings in development tooling; error monitoring not connected |
| T-BCK-01 | 🟡 | backup, restore into an empty database and compare: counts, indexes, checksum, password hashes; 3.6 s restore | drill on the real host; agreed recovery objectives |
| T-CLN-01 | ⛔ | tooling built (`launch-check`, source and database modes) | 4 source hits (development wordmark, sample hero sentence, development note) and development records remain: must be zero |
| T-HI-01 | 🟡 | no missing glyphs or clipped matras in the screenshots reviewed | a proofreader's sign-off on `docs/proofreading-list.md` |
| T-SEO-01 | 🟡 | Lighthouse SEO 100 with indexing on; sitemap, robots, canonical, JSON-LD | structured-data and Open Graph validators |
| T-ADM-02 | ✅ | idle timeout now tested (the store drops the session; `session_expired`) | |

## 3. Consistency check
Run before closing Phase 1 and after every spec change; output goes into `progress.md`.
1. Every requirement ID in `requirements.md` appears in §2.
2. Every P0 requirement maps to ≥ 1 test ID.
3. Every test ID used in §2 exists in §1.
4. Every route in `user-flows.md` exists in `sitemap.md`.
