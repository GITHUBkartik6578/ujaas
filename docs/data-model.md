# UJAAS — Data Model (MongoDB / Mongoose)

**Status:** Draft for owner review. Database: MongoDB Atlas replica set (ADR 0001). Collections replace tables; "row" in skills = document. All collections carry `_id`, `created_at`, `updated_at`. Types: S string · N number · B boolean · D date · O ObjectId ref · A array.

## 1. Overview and relationships
```
admin_users 1─* audit_logs            authors *─* contents (credits[])
contents *─1 categories               contents *─* topics
contents 1─* content_revisions        collections 1─* collection_items *─1 contents
magazine_issues 1─* issue_items *─1 contents      media_assets referenced by cover/photo fields
submissions 1─* submission_events     submissions 0..1─1 contents (converted)
contact_messages · site_settings · homepage_slots · slug_redirects · consent_texts · sessions · idempotency_keys
```
A creation can be in the literature listing and in many issues without duplicating its record (`issue_items` is the join).
**Unified content model with typed validation:** one `contents` collection with `content_type`; each type has its own validation rules (verse keeps line breaks; prose is paragraphs; length caps differ). Types that would damage validation (for example a future video) get their own collection.

## 2. Entities

### 2.1 admin_users
| Field | Type | Req | Rule |
|---|---|---|---|
| email | S | Y | unique, lowercase |
| display_name | S | Y | ≤ 80 |
| password_hash | S | Y | Argon2id; min password length 12; common-password check |
| role | S | Y | `site_admin`, `editor_in_chief`, `editor`, `content_manager`; enabled roles per D-05 |
| is_active | B | Y | |
| failed_logins, locked_until | N, D | | lockout 5 failures / 15 min |
| totp_secret | S (encrypted) | | P1 |
| last_login_at | D | | |
Index: `email` unique. Deletion: deactivate; never hard-delete (audit references).

### 2.2 contents
| Field | Type | Req | Rule |
|---|---|---|---|
| title | S | Y | ≤ 160, NFC |
| slug | S | Y | unique, lowercase ASCII/hyphen, stable; rename creates `slug_redirects` |
| content_type | S | Y | enum (approved types pending: proposed kavita, ghazal, geet, kahani, laghukatha, nibandh, sansmaran, vichar, vimarsh, samiksha, other) |
| body | S | Y | NFC; verse keeps line breaks; sanitised rich-text allow-list |
| body_format | S | Y | `verse` or `prose` |
| excerpt | S | Y | ≤ 300 |
| category_id | O | Y | ref categories |
| topic_ids | A(O) | | ref topics |
| credits | A({author_id, role}) | Y | ≥ 1 for publishing; role: author, translator |
| source_note, translator_note | S | | |
| rights_note | S | Y to publish | owner-approved permission text (private) |
| cover_media_id | O | | needs alt text before publish |
| status | S | Y | see `editorial-workflow.md` |
| lang_checked, proof_checked, final_approved | B | Y | all true to publish |
| scheduled_at, published_at, unpublished_at, archived_at | D | | `published_at <= now` for public |
| featured, feature_order | B, N | | homepage featuring |
| seo_title, seo_description, canonical_url | S | | |
| revision_no | N | Y | for `If-Match` |
| search_text | S | Y | normalised (§4) |
| search_text_folded | S | Y | same as `search_text` with nukta folded (§4); added in Phase 2 foundation |
| submission_id | O | | origin if converted (private) |
Indexes: `slug` unique; `(status, published_at)`; `(category_id, status, published_at)`; `credits.author_id`; text index on `search_text` and `search_text_folded`. Deletion: hard delete only for never-published drafts by `site_admin`; otherwise archive.

### 2.3 content_revisions
`content_id`, `revision_no`, `snapshot` (full editable fields), `actor_id`, `note`, `created_at`. Unique `(content_id, revision_no)`. Never deleted from the UI. Restore creates a **new** revision.

### 2.4 authors
| Field | Type | Req | Rule |
|---|---|---|---|
| name | S | Y | NFC |
| slug | S | Y | unique |
| bio | S | | owner-approved |
| photo_media_id | O | | credit + permission needed |
| is_public | B | Y | profile and photo public only when true |
| birth_year, birthplace | N, S | | optional |
| private_contact | S | | **private** |
Index: `slug` unique; `name` for alphabet filter. Deletion: archive; cannot delete with credits.

### 2.5 categories, topics
`name`, `slug` unique, `description`, `sort_order`, `is_active`. Delete only when empty and by `site_admin`.

### 2.6 collections, collection_items
`collections`: `title`, `slug` unique, `description`, `cover_media_id`, `status`, `published_at`. `collection_items`: `collection_id`, `content_id`, `position`; unique `(collection_id, content_id)`; reorder atomic in a transaction.

### 2.7 magazine_issues, issue_items
`magazine_issues`: `title`, `slug` unique, `issue_number` (N, unique), `volume` (S, optional), `period_label` (S, Hindi), `publication_date` (D), `cover_media_id` (alt required), `editorial_intro`, `publication_details` (S: publisher, editor, ISSN only if supplied D-19), `pdf_media_id` (optional; unused until D-08), `status`, `show_in_archive` (B), `published_at`. `issue_items`: `issue_id`, `content_id`, `position`, `section_label`; unique `(issue_id, content_id)`. Publishing an issue needs cover with alt, number, date and ≥ 1 published item. Magazine series: single series assumed (no `magazine_series` collection) — ASSUMPTION; add later if the owner wants several magazines.

### 2.8 submissions
| Field | Type | Req | Rule |
|---|---|---|---|
| reference_id | S | Y | `UJ-` + 8 random chars, unique, non-sequential |
| display_name | S | Y | ≤ 80 |
| pen_name | S | | |
| email | S | Y | **private**, lowercase |
| title | S | Y | ≤ 160 |
| creation_type | S | Y | approved types |
| body | S | Y | ≤ `SUBMISSION_BODY_MAX` |
| description | S | | ≤ 300 |
| consent_original, consent_publication, consent_privacy | B | Y | all true |
| consent_text_version | S | Y | from `consent_texts` (D-03) |
| consent_at | D | Y | |
| ip_hash, ua_hash | S | Y | salted hash only; never raw IP |
| dedupe_hash | S | Y | hash of NFC(email + body) |
| status | S | Y | see workflow |
| assigned_to | O | | |
| converted_content_id | O | | |
Indexes: `reference_id` unique; `(status, created_at)`; `(dedupe_hash, created_at)`. Retention: purge by `RETENTION_DAYS_*`, disabled while unset (D-02).

### 2.9 submission_events
`submission_id`, `from_status`, `to_status`, `actor_id` (or `system`), `note` (private), `created_at`. Append-only.

### 2.10 contact_messages
`name`, `email`, `subject`, `message`, `ip_hash`, `status`, `created_at`. Private. Retention per D-02.

### 2.11 media_assets
`storage_key` (random), `original_filename` (not trusted), `mime` (from magic bytes), `width`, `height`, `bytes` (≤ 5 MB), `alt_text` (required before public use), `credit`, `permission_note`, `uploaded_by`, `is_public`. Types JPEG/PNG/WebP only; SVG rejected; EXIF stripped by re-encode. Delete only when unused, by `site_admin`.

### 2.12 audit_logs
`actor_id` or `system`, `action`, `entity`, `entity_id`, `from`, `to`, `note`, `request_id`, `created_at`. Append-only; no update or delete path in code or UI.

### 2.13 site_settings, homepage_slots, slug_redirects, consent_texts
- `consent_texts`: `version` (unique), `text_original`, `text_publication`, `text_privacy` (three separate statements, owner/legal text, D-03), `approved_at`, `dev_data`. No row means the submission form is closed.
- `site_settings`: key/value (site title, description, contact email, phone, address, social links). Empty values render nothing.
- `homepage_slots`: `slot`, `content_id` or `issue_id`, `position`; only published targets.
- `slug_redirects`: `old_slug`, `entity`, `target_id`; unique `old_slug`.

### 2.14 operational collections
`sessions` (server-side store; 8 h idle, 24 h absolute), `idempotency_keys` (TTL index), `rate_limits` (TTL index).

## 3. Public / private field visibility
Public responses are explicit allow-lists (`spec_contract`). **Never public:**
- contents: `rights_note`, `submission_id`, `lang_checked`, `proof_checked`, `final_approved`, `revision_no`, `search_text`, status other than `published`.
- authors: `private_contact`; photo and bio when `is_public = false`.
- all of: submissions, submission_events, contact_messages, content_revisions, audit_logs, admin_users, sessions, consent records.
- media: `original_filename`, `permission_note`, `uploaded_by`.
Public-safe: title, slug, excerpt, body, type, category, topics, credited authors (public only), cover (url, alt, credit), published date, SEO fields.

## 4. Hindi text handling (`hindi_content`)
- Store NFC. Reject control characters except newline and tab. Keep ZWJ/ZWNJ.
- `search_text` = NFC + whitespace collapse + remove ।, ॥ and quotes + fold chandrabindu/anusvara + secondary folded field for nukta (ग़ → ग). The same function normalises query and index.
- At least 30 Hindi queries in the test plan (T-SRCH-02). Search quality is not claimed until run.
- Verse: keep line breaks, never collapse a poem into one line.
- `lang="hi"` on pages; Latin brand strings in their own spans.

## 5. Invariants (tested)
1. Public reads use one query helper: `status = published AND published_at <= now`.
2. Unpublished content is absent from lists, search, sitemap, author pages, collections, issue pages and API; its URL gives 404.
3. Pending or rejected submissions are unreachable through any public route.
4. Reordering `issue_items` or `collection_items` is atomic.
5. No document is returned whole from any public route.
