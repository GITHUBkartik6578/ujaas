# UJAAS — API Contract

**Version:** 0.1.0-draft · **Status:** Draft for owner review. Base path `/api/v1`. JSON, UTF-8. Public DTOs are explicit allow-lists (`data-model.md` §3).
**Changelog:**
- 0.5.0-draft (Phase 2, e-magazine): public `GET /issues` (published, `show_in_archive` only; newest first; `year`, `page`, `page_size`; returns `years` for the filter and `current`, the newest published issue), `GET /issues/{slug}` (published only; ordered items, each with its section label and the creation card; a creation that is no longer published is simply absent), `GET /issues/{slug}/neighbors/{content-slug}` (previous and next published item in that issue, 404 when the creation is not a member). `GET /home` gains an `issue` block (newest published issue) and `/sitemap-data` lists issue pages. A draft or archived issue is a 404. Admin (editor and above): `GET/POST /admin/issues`, `GET/PATCH /admin/issues/{id}`, `PUT /admin/issues/{id}/items` (published creations only, section label per item, replaced in one transaction), `POST /admin/issues/{id}/transition` (draft to published and published to draft or archived need the chief; archived to draft the editor). Publishing needs a cover with alt text, an issue number, a date and at least one published item, otherwise `422 publish_blocked` lists what is missing. No file or PDF field is exposed.
- 0.4.0-draft (Phase 2, submissions): `GET /submission-config` returns `{open:false}` while no consent text exists and otherwise the version, the three consent statements and the body limit. `POST /submissions` as in section 2, with these specifics: `form_started_at` (epoch milliseconds) and the honeypot field `website` are part of the body; a honeypot hit, a missing `form_started_at` or a form filled in under 3 seconds answers `201` with a random reference and stores nothing; `503 submissions_closed` while no consent text exists; `422` field errors carry `message_hi`; `409 duplicate_submission` never names the earlier reference; `429` after 20 submissions a day from one email or 5 an hour from one address; `Idempotency-Key` returns the original reference; any storage failure is `503 service_unavailable` with nothing saved. `POST /contact` (honeypot and time check the same way, 5 an hour per address). Admin: `GET /admin/submissions` (status, q), `GET /admin/submissions/{id}` (private fields, consent record, history, and it writes an audit row), `POST .../transition` (a note is required for revision_requested, rejected and withdrawn; converted is refused here), `POST .../assign`, `POST .../notes`, `POST .../convert` (approved only, creates a draft content record, never a published one), `GET /admin/staff`, `GET /admin/messages`, `PATCH /admin/messages/{id}`. All of these need editor or above.
- 0.3.0-draft (Phase 2, CMS): admin endpoints of section 3 implemented. Where the code is more specific than the draft: `PATCH /admin/contents/{id}` needs `If-Match` (missing gives `428 precondition_required`, stale gives `409 conflict`); the transition body is `{to, note?, scheduled_at?}`; a blocked publish is `422 publish_blocked` with `fields` listing what is missing; restore is `POST /admin/contents/{id}/revisions/{n}/restore` and is refused (422) while published or scheduled; `GET /admin/dashboard`; `GET /admin/media` and `DELETE /admin/media/{id}` (site_admin, unused files only); authors, categories and topics CRUD (delete only when unused, site_admin); `GET/PATCH /admin/collections`, `PUT /admin/collections/{id}/items` (published items only, replaced in one transaction); `GET/PUT /admin/homepage` (editor_in_chief and above, at most 6 published items); `GET/PUT /admin/settings` (site_admin, whitelisted keys, unknown keys rejected); `GET /admin/audit` (read only); `GET /admin/ops/health`. Public side: `GET /preview/{token}` returns a draft through a signed 30-minute link (never indexed, never cached, same allow-list fields). Issues, submissions, contact messages and admin users are not implemented yet.
- 0.2.0-draft (Phase 2, public site): implemented §2 as written, plus `GET /categories/{slug}`, `GET /redirects/content/{slug}` (old slug to new slug, only when the target is published; the web app answers with a permanent redirect, HTTP 308) and `GET /sitemap-data` (published public URLs only). `/home` returns `{ blocks: { picks?, latest?, authors? } }`; empty blocks are omitted and the `issue` block arrives with the e-magazine phase. `startswith` on `/authors` accepts 1 to 12 characters. Search terms are AND-ed, matched as substrings of the nukta-folded text, title matches first, newest next, at most 500 candidates. `RATE_LIMIT_SCALE` multiplies public limits (tests and load checks only).
- 0.1.0-draft — initial contract (Phase 1).

## 1. Conventions

### 1.1 Errors (shared shape)
```json
{ "error": { "code": "validation_failed", "message": "…", "message_hi": "…",
  "fields": [ { "field": "email", "code": "invalid_email", "message_hi": "…" } ],
  "request_id": "req_…" } }
```
| HTTP | code | Meaning |
|---|---|---|
| 400 | `bad_request` | malformed JSON/query |
| 401 | `unauthenticated` / `session_expired` | no or expired session |
| 403 | `forbidden` / `csrf_failed` | role denied or CSRF/origin check failed |
| 404 | `not_found` | missing **or unpublished** (never 403 for unpublished) |
| 409 | `conflict` (`If-Match`), `duplicate_submission` | stale edit; duplicate within 30 days (reference not revealed) |
| 413 | `payload_too_large` | body/file too big |
| 415 | `unsupported_media_type` | wrong magic bytes or type |
| 422 | `validation_failed`, `state_transition_invalid` | invalid input; illegal transition |
| 429 | `rate_limited` | with `Retry-After` |
| 503 | `service_unavailable` | backend or DB down; nothing partially saved |
Field messages are Hindi (`message_hi`). No stack traces, no private data in errors.

### 1.2 Pagination, filtering, headers
`?page=1&page_size=20` (max 50). Response: `{ "items": [...], "page": 1, "page_size": 20, "total": N }`. Filters named per endpoint. Sort whitelist per endpoint.
Headers: `X-Request-Id` on every response; admin non-GET requires `X-CSRF-Token`; edits require `If-Match: <revision_no>`; public POST may carry `Idempotency-Key`.
Security headers per `security_review` (HSTS, nosniff, Referrer-Policy, Permissions-Policy, `frame-ancestors 'none'`, CSP).

### 1.3 Rate limits
General public 120/min/IP · search 30/min/IP · submissions 5/hour/IP and 20/day/email · contact 5/hour/IP · admin login 5/15 min per IP+email.

## 2. Public endpoints (no authentication)
All return only `published` with `published_at <= now` through one query helper.

| Method + URL | Params | Success | Errors | Limit |
|---|---|---|---|---|
| `GET /contents` | `type`, `category`, `topic`, `author`, `page`, `sort=newest` | page of content cards `{slug,title,excerpt,type,category,authors[{name,slug?}],cover{url,alt,credit},published_at}` | 400, 429 | general |
| `GET /contents/{slug}` | — | full public content incl. `body` | 404 | general |
| `GET /contents/{slug}/related` | — | up to 6 cards (P1, FR-007) | 404 | general |
| `GET /categories` · `GET /categories/{slug}` · `GET /categories/{slug}/contents` | page | category(ies), contents | 404 | general |
| `GET /authors` | `startswith`, `type`, `page` | public authors only | 400 | general |
| `GET /authors/{slug}` · `GET /authors/{slug}/contents` | page | profile; works | 404 (also when not public) | general |
| `GET /collections` · `GET /collections/{slug}` | — | collection with ordered published members | 404 | general |
| `GET /search` | `q` (1–100 chars), `type`, `category`, `page` | results + `total`; empty array when none | 400, 429 | 30/min |
| `GET /issues` | `year`, `page` | newest-first cards with `show_in_archive` | 400 | general |
| `GET /issues/{slug}` | — | issue + ordered published items `{position,section_label,content card}` | 404 | general |
| `GET /home` | — | map of blocks; each block independent; empty blocks omitted | — | general |
| `GET /settings/public` | — | non-empty contact/footer/social fields only | — | general |
| `POST /submissions` | body: `display_name`, `pen_name?`, `email`, `title`, `creation_type`, `body`, `description?`, `consent_original`, `consent_publication`, `consent_privacy`, `consent_text_version`, `form_started_at`, `website` (honeypot) | `201 {reference_id}`; honeypot hit returns the same shape and stores nothing | 422 field errors (Hindi); 409 `duplicate_submission`; 429; 503 | 5/h/IP, 20/day/email |
| `POST /contact` | `name`, `email`, `subject`, `message`, honeypot | `201 {ok:true}` | 422, 429, 503 | 5/h/IP |
Feeds: `GET /sitemap.xml`, `GET /robots.txt`, `GET /rss.xml` (P1) served by the web app from the same helper.
No endpoint returns unpublished content by slug guess; unknown and unpublished are indistinguishable (404).

## 3. Admin endpoints (session required; deny by default)
Prefix `/api/v1/admin`. Every route checks the role server-side; non-GET needs CSRF. Roles from `editorial-workflow.md`.

### 3.1 Authentication
| Method + URL | Body | Success | Errors |
|---|---|---|---|
| `POST /auth/login` | `email`, `password` | `200` session cookie, rotated; `{user}` | generic `unauthenticated`; 429 lockout |
| `POST /auth/logout` | — | 204, session destroyed | — |
| `GET /auth/me` | — | `{user, csrf_token}` | 401 `session_expired` |
| `POST /auth/change-password` | old, new | 200 `{csrf_token}`; current session rotated (new id and CSRF token), other sessions killed | 422 |
| `GET /users` | site_admin | `{items:[{id,email,display_name,role,is_active,last_login_at}]}` | 403 |
| `PATCH /users/{id}` | site_admin; `{is_active}` | 200; deactivation ends that admin's sessions at once; refuses self and the last active site_admin (422) | 403, 404, 422 |
First admin: one-time CLI command or single-use setup link; no default credentials.

### 3.2 Content and revisions
| Method + URL | Purpose | Role |
|---|---|---|
| `GET /contents` (`status`, `type`, `category`, `q`, `page`) | list | content_manager+ |
| `POST /contents` | create draft | content_manager+ |
| `GET /contents/{id}` · `PATCH /contents/{id}` (`If-Match`) | read, edit; new revision | content_manager+ |
| `POST /contents/{id}/transition` `{to, note, scheduled_at?}` | state change via single function | per table |
| `GET /contents/{id}/revisions` · `POST /contents/{id}/revisions/{n}/restore` | list; restore as new revision | editor+ |
| `POST /contents/{id}/preview-link` | signed, time-limited `noindex` link | content_manager+ |
| `DELETE /contents/{id}` | never-published drafts only | site_admin |

### 3.3 Submissions and contact
| Method + URL | Purpose | Role |
|---|---|---|
| `GET /submissions` (`status`, `q`, `page`), `GET /submissions/{id}` | inbox, detail incl. private fields | editor+ |
| `POST /submissions/{id}/transition` `{to, note}` | review actions per §2.1 | per table |
| `POST /submissions/{id}/notes` | private note | editor+ |
| `POST /submissions/{id}/convert` | creates draft content | editor+ |
| `GET /messages`, `PATCH /messages/{id}` | contact inbox, mark handled | editor+ |

### 3.4 Taxonomy and structure
| Resource | Endpoints | Role |
|---|---|---|
| authors | `GET/POST /authors`, `GET/PATCH /authors/{id}` | content_manager+ |
| categories, topics | `GET/POST /categories`, `PATCH/DELETE /categories/{id}` (delete only if empty) | content_manager+; delete site_admin |
| collections | `GET/POST /collections`, `PATCH /collections/{id}`, `PUT /collections/{id}/items` (atomic order of published ids) | content_manager+ |
| issues | `GET/POST /issues`, `PATCH /issues/{id}`, `PUT /issues/{id}/items` (atomic order and section labels), `POST /issues/{id}/transition` | editor+ |
| homepage | `GET/PUT /homepage` (published targets only) | editor_in_chief+ |
| settings | `GET/PUT /settings` | site_admin |

### 3.5 Media
`POST /media` (multipart, field `file`): JPEG/PNG/WebP ≤ 5 MB, magic-byte check, re-encode; returns `{id,url,width,height}`; alt required later. Errors 413, 415, 422 with specific Hindi message (size, type, network handled by client with retry). `PATCH /media/{id}` (alt, credit, permission). `DELETE /media/{id}` only when unused, site_admin; removes the file as well. Serving `GET /media/{key}`: a file without a media record is 404; public images are served to anyone (`Cache-Control: public`); private images only to a signed-in admin or with the short-lived `?t=` link a preview carries (`private, no-store`), otherwise 404.

### 3.6 Audit and ops
`GET /audit` (filters `entity`, `actor`, `from`, `to`, `page`) read-only. `GET /ops/health`, `GET /ops/scheduler`. Admin users `GET/POST/PATCH /users` hidden until D-05.

## 4. Endpoint ↔ requirement
FR-001 `/home` · FR-003 `/contents` · FR-005 `/contents/{slug}` · FR-006 `/authors*` · FR-008 `/collections*` · FR-009 `/search` · FR-020–022 `/issues*` · FR-027–029 `/submissions` · FR-013 `/contact` · FR-034 `/auth/*` · FR-036–037 admin contents · FR-039 admin submissions · FR-040–045 admin structure/media · FR-046 `/audit`.
