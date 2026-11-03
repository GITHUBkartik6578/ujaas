# UJAAS — User Flows

**Status:** Draft for owner review. F1–F10 public, F11–F16 admin, E1–E8 error flows. Every route exists in `sitemap.md`; every API call exists in `api-contract.md`. States for every data view: **loading** (skeleton, no layout shift), **empty** (honest, compact, with links), **error** (message + retry). Acceptance criteria (AC) are testable.

## Public flows

### F1 — Reader discovers content on the homepage (FR-001, FR-002)
Entry `/` → sees blocks built from data (latest issue, picks, authors, latest creations) → clicks a card → destination detail route.
API `GET /home`, `GET /settings/public`. Permission: public.
States: loading skeleton per block; a block with no data is hidden; one failing block shows its own retry and never blanks the page.
AC: no hardcoded listings; every card link resolves (T-HOME-01, T-CARD-01, T-NAV-01).

### F2 — Reader explores literature by category (FR-003, FR-004)
Entry nav "साहित्य" or `/sahitya` → picks category `/sahitya/[category]` → paginates (`?page=`) → opens a creation.
API `GET /categories`, `GET /categories/{slug}/contents`. States: empty category shows compact state with links to other categories and search.
AC: URL stable on reload; pagination links work; breadcrumbs correct (T-CAT-01, T-NAV-02).

### F3 — Reader opens and reads a creation (FR-005, FR-007, FR-016)
Entry any card → `/rachna/[slug]` → full text (verse line breaks kept), author links, date, category, source metadata, plain share links, related works (P1).
API `GET /contents/{slug}`. States: loading; 404 if unpublished; error with retry.
AC: body ≥ 18 px, 60–70 characters per line, copy-paste preserves Hindi text, no entrance animation on text (T-READ-01, T-READ-02).

### F4 — Reader opens an author profile and related works (FR-006)
Entry author name link → `/rachnakar/[slug]` → profile and works list; or directory `/rachnakar` with alphabet strip and type filter.
API `GET /authors`, `GET /authors/{slug}`, `…/contents`. Non-public author: profile 404, name shown as plain text.
AC: only public authors listed; photo only with `is_public` (T-AUTH-01).

### F5 — Reader explores a curated collection (FR-008)
Entry `/sangrah` → `/sangrah/[slug]` → ordered published items → opens item.
API `GET /collections`, `GET /collections/{slug}`. Unpublished members omitted.
AC: order matches admin order; unpublished item absent (T-COL-01).

### F6 — Reader searches and filters (FR-009)
Entry header search → `/khoj?q=…` → filters by type/category → paginates.
API `GET /search`. Query normalised (matras, nukta, chandrabindu, punctuation). 
States: empty → "कोई परिणाम नहीं" with suggestions and category links (E2); error with retry; 429 message.
AC: 30-query relevance set runs with output shown; no unpublished item returned (T-SRCH-01…03).

### F7 — Reader browses magazine issues (FR-020, FR-021, FR-026)
Entry nav "ई-पत्रिका" → `/e-patrika` → current issue + archive newest-first → year filter `?year=` → opens issue.
API `GET /issues`. Before the first issue: "coming soon" page, no fake covers.
AC: archive respects `show_in_archive` (T-MAG-01).

### F8 — Reader opens an issue and reads its articles (FR-022, FR-023, FR-024)
Entry issue card → `/e-patrika/[issue-slug]` → cover, intro, publication details, ordered contents with section labels → opens article `/rachna/[slug]` (canonical) → previous/next in issue (P1).
API `GET /issues/{slug}`. Only currently published items shown. PDF control hidden until D-08.
AC: same creation visible in two issues and in the general listing; unpublished member omitted (T-MAG-02, T-MAG-03).

### F9 — Writer reads guidelines and submits (FR-019, FR-027–031)
Entry nav "अपनी रचना भेजें" → `/rachna-bhejein` (guidelines, form) → fills fields, ticks **three** consents → submit → `/rachna-bhejein/prapti` with reference ID.
API `POST /submissions` (`Idempotency-Key`). Required data: core fields only. Client and server validation; Hindi field messages; honeypot, time-to-submit, rate limits, duplicate hash.
States: submitting (button disabled); success shows `UJ-XXXXXXXX` and what happens next (owner text); 422 field errors inline; 409 duplicate message; 429; 503 keeps the form content in the browser.
AC: all three consents required; no private data in any public response; consent record stored (T-SUB-01…04).

### F10 — Visitor contacts the editors (FR-013)
Entry nav "संपर्क" → `/sampark` → form → `POST /contact` → confirmation. Contact details shown only when supplied; no map or attachment.
AC: honeypot and limit work; message appears in `/admin/messages` (T-CON-01).

## Admin flows

### F11 — Admin reviews a submission (FR-039)
Entry `/admin/submissions` → opens `/admin/submissions/[id]` → assigns, adds private note → requests revision / approves / rejects → converts approved to a draft content.
API `GET /admin/submissions`, `POST …/transition`, `…/notes`, `…/convert`. Permission per `editorial-workflow.md` §2.1. Each transition logs event + audit.
Destructive (reject, withdraw) asks confirmation. AC: status history shown; approved is not public (T-SUB-05, T-SUB-06).

### F12 — Admin creates and publishes content (FR-036, FR-037)
Entry `/admin/content/new` → edits Hindi text, excerpt, type, category, authors, cover with alt and credit, rights note → preview link → in_review → approved → publish or schedule.
API `POST /admin/contents`, `PATCH` (If-Match), `…/preview-link`, `…/transition`.
Unsaved-change prompt on leave; validation messages per field; publish blocked until checks, rights note, author and alt text exist.
AC: T-PUB-01, T-PUB-02, T-REV-01.

### F13 — Admin creates a magazine issue and orders contents (FR-043)
Entry `/admin/issues` → new issue (number, period, date, cover with alt, intro, details) → attach published creations → reorder with drag **or** up/down buttons → section labels → publish.
API `POST /admin/issues`, `PUT …/items` (atomic). Publishing needs cover alt, number, date, ≥ 1 published item. Warning for unpublished members.
AC: T-MAG-01…03.

### F14 — Admin edits, schedules, unpublishes, archives, restores (FR-037, FR-036)
Entry content manager → action → confirmation dialog for unpublish, archive, restore revision → success toast.
Unpublish removes the item from lists, search, sitemap, author, collection and issue pages; URL gives 404. Restore creates a **new** revision.
AC: T-PUB-03, T-PUB-04, T-REV-01.

### F15 — Admin manages authors, categories, collections, media, homepage, settings (FR-040–045)
Entry respective `/admin/*` pages. Homepage can pick published items only. Media: type/size validated, alt required. Delete only for empty categories/collections, unused media and never-published drafts (`site_admin`).
AC: T-MED-01, T-MED-02, T-ADM-03.

### F16 — Admin signs in and out (FR-034)
Entry `/admin/login` → credentials → dashboard `/admin`. Generic error on failure; lockout after 5 failures. Logout destroys the session.
AC: T-ADM-01, T-ADM-02.

## Error flows

| ID | Flow | Behaviour | AC |
|---|---|---|---|
| E1 | Invalid or unpublished link | Real **404** page with search and category links; renamed slug → 301 | T-STA-01, T-PUB-03 |
| E2 | No search results | Compact empty state, suggestions, categories | T-SRCH-03 |
| E3 | Failed submission | 422 inline Hindi errors; 409 duplicate; 429; 503 keeps form content; nothing partially saved | T-SUB-01, T-SUB-04 |
| E4 | Backend unavailable (public) | Error state with retry; static pages stay up; one failing block does not blank home | T-STA-01 |
| E5 | Expired admin session | `401 session_expired` → re-login in place; editor content kept and restored | T-ADM-02 |
| E6 | Failed image upload | Specific message (size, type, network), form state kept, retry | T-MED-02 |
| E7 | Concurrent edit | `409 conflict` → reload/compare screen | T-REV-01 |
| E8 | Forbidden action | `403 forbidden`; UI hides the control; server denies by default | T-ADM-03, T-ADM-04 |
