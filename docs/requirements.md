# UJAAS — Requirements

**Status:** Draft for owner review · **Priority:** P0 required for secure functional launch · P1 valuable after launch · P2 optional future.
**Pending** = depends on an open decision (see `decisions/owner-decision-register.md`); stays Pending until answered.
Every P0 requirement maps to at least one test in `test-plan.md`.

## 1. Scope

**In:** Hindi (Devanagari) public reading site; admin CMS; public writer submissions via form (no writer accounts, every submission reviewed); e-magazine as readable web articles.
**Out at launch (not approved):** reader accounts, payments, donations, comments, ratings, favourites, social feeds, membership button (D-23), newsletter (D-24), event registration/competitions/Zoom (D-25), reader counters and rankings (D-30), PDF reader or scans (D-08), maps, contact attachments, writer dashboard.
**Stack:** MERN with Next.js (D-07; ADR 0001 Proposed).

## 2. Functional requirements

### 2.1 Public site
| ID | Requirement | Pri | Source |
|---|---|---|---|
| FR-001 | Home page built from real data blocks (latest issue, editor picks, featured authors, latest creations); a block with no data is hidden | P0 | Phase 1 §3, public_site_build |
| FR-002 | Header (logo, nav, search, one CTA), breadcrumbs on all inner pages, footer with five policy links; contact/social hidden until supplied | P0 | public_site_build |
| FR-003 | Literature listing with filters (type, category), sort (newest), pagination with stable URLs | P0 | Phase 1 §4 |
| FR-004 | Category listing and category detail pages; empty category shows honest state with links | P0 | Phase 1 §4 |
| FR-005 | Creation detail: full text with verse line breaks kept, credited authors linked to profiles, date, category, source/translator metadata when present, plain share links | P0 | Phase 1 §5 |
| FR-006 | Author directory (alphabet strip, type filter, pagination) and author profile with works; only `is_public` authors | P0 | H-06, H-07 |
| FR-007 | Related works on a detail page (same author, same category) | P1 | startcycle cut list |
| FR-008 | Curated collections list and collection detail with ordered works | P0 | H-04 |
| FR-009 | Search over title, excerpt, text, author name, category with Hindi normalisation; filters; pagination; empty and error states | P0 | hindi_content |
| FR-010 | Unpublished or unknown slug returns real 404 with search and category links; renamed slug returns 301 | P0 | public_site_build |
| FR-011 | About UJAAS page (owner text) | P0 | Phase 1 §4 |
| FR-012 | Editorial introduction page (owner text, Editor-in-Chief; D-28) | P0 | Phase 1 §4 |
| FR-013 | Contact page with form (name, email, subject, message); no map, attachment, newsletter; contact details shown only when supplied | P0 | submission_privacy |
| FR-014 | Policy pages: privacy, terms, copyright and submission policy; draft banner and unlinked until legal text approved | P0 | content_safety |
| FR-015 | Loading (skeleton), empty and error-with-retry states on every data view; one failing home block must not blank the page | P0 | public_site_build |
| FR-016 | Share links as plain links, no tracking scripts | P1 | public_site_build |
| FR-017 | `sitemap.xml` (published public URLs only), `robots.txt` (blocks `/admin`), canonical URLs | P0 | seo_a11y_perf |
| FR-018 | Activities page, informational only, no registration (D-25) | P1 / Pending | D-25 |
| FR-019 | Submission guidelines on the submit page (owner text) | P0 | Phase 1 §7 |
| FR-038 | FAQ accordion (owner text), keyboard operable | P1 | startcycle cut list |
| FR-049 | RSS feed of latest published creations | P1 | startcycle cut list |

### 2.2 E-magazine
| ID | Requirement | Pri |
|---|---|---|
| FR-020 | E-magazine landing: current issue plus newest-first archive | P0 |
| FR-021 | Archive with year filter and pagination | P0 |
| FR-022 | Issue page: cover (with alt), number, optional volume, period, date, editorial intro, publication details, ordered contents with section labels; shows only currently published items | P0 |
| FR-023 | Reading articles of an issue on the web; canonical URL stays `/rachna/[slug]`; issue context shown on the article | P0 |
| FR-024 | Previous/next article within an issue | P1 |
| FR-025 | PDF download or viewer | Pending D-08 |
| FR-026 | Honest "coming soon" state before the first issue exists; no fake covers | P0 |

### 2.3 Submissions
| ID | Requirement | Pri |
|---|---|---|
| FR-027 | Public submission form: display name, email, optional pen name, title, type, full text, optional short description, three separate consents (original work, publication permission, privacy acknowledgement) | P0 |
| FR-028 | Client and server validation; honeypot, time-to-submit, rate limit, duplicate hash; honeypot hit returns fake success and stores nothing | P0 |
| FR-029 | Confirmation screen with random reference ID `UJ-` + 8 random characters (D-01 assumption) | P0 |
| FR-030 | Consent record: booleans, consent text version, time, hashed IP and user-agent | P0 |
| FR-031 | Retention purge job parameterised by `RETENTION_DAYS_*`, disabled while unset (D-02) | P0 |
| FR-032 | Extra fields or attachments in the form | Pending D-12 / D-04 |
| FR-033 | Confirmation or notification emails | Pending D-06 |
| FR-051 | Writer withdrawal / removal request recorded as a controlled transition | P0 |

### 2.4 Admin CMS
| ID | Requirement | Pri |
|---|---|---|
| FR-034 | Admin login, server-side sessions, roles, lockout, one-time initial admin provisioning with no default credentials | P0 |
| FR-035 | Dashboard: counts by status, scheduled items, scheduler failures, submissions awaiting review | P0 |
| FR-036 | Content create/edit with Hindi rich text and paste cleaning, excerpt, type, category, topics, authors, cover with alt and credit, rights note, SEO fields; signed time-limited preview (`noindex`); revisions and restore (as new revision); unsaved-change prompt; `If-Match` conflict handling | P0 |
| FR-037 | Status workflow: draft → in review → approved → scheduled or published → unpublished or archived; schedule; unpublish; archive; restore to draft | P0 |
| FR-039 | Submission inbox and review: open, assign, private notes, request revision, approve, reject, convert to content, record withdrawal, status history | P0 |
| FR-040 | Authors manager (profile, public flag, photo with credit and permission) | P0 |
| FR-041 | Categories and topics manager | P0 |
| FR-042 | Collections manager with ordered, published-only members | P0 |
| FR-043 | Issue manager: attach published creations, section labels, atomic reorder (up/down buttons as well as drag), publish rules | P0 |
| FR-044 | Media library: JPEG/PNG/WebP ≤ 5 MB, alt text required, credit and permission | P0 |
| FR-045 | Homepage manager (published items only) and site settings (contact, footer, metadata) | P0 |
| FR-046 | Audit log, append-only, read-only in UI | P0 |
| FR-047 | Contact message inbox | P0 |
| FR-048 | TOTP 2FA for `site_admin` and `editor_in_chief` | P1 |
| FR-050 | Backup, restore and operational tools (health check, scheduler status) | P0 |
| FR-052 | Admin users and roles page | Pending D-05 |

## 3. Design and UX requirements
| ID | Requirement | Pri |
|---|---|---|
| DR-01 | Direction: premium, literary, warm; not a blog or news portal; own original look; comfortable reading | P0 |
| DR-02 | Colours defined once as design tokens (D-09); no hex values in components | P0 |
| DR-03 | Reading pages: body ≥ 18 px, 60–70 characters per line, two typefaces at most, five type sizes at most | P0 |
| DR-04 | Layouts verified at 390, 768, 1366 and 1920 px (390/768 designed and approved by owner, D-26) | P0 |
| DR-05 | Restrained motion: transform/opacity only, reduced-motion respected, content visible without scripts, no motion on reading text | P0 |
| DR-06 | Images only from owner or approved sources with alt, credit, permission; `DEV DATA` placeholders removed before launch | P0 |
| DR-07 | Taste gate (lint, inspector at 1440/768/390) passes with FAIL = 0 or recorded exceptions (D-31) | P0 |
| DR-08 | Excluded items never appear (see §1 Out) | P0 |

## 4. Non-functional requirements
| ID | Requirement | Pri |
|---|---|---|
| NFR-001 | Hindi: Unicode NFC storage, control characters rejected except newline/tab, ZWJ/ZWNJ kept, `lang="hi"` | P0 |
| NFR-002 | SEO: server-rendered pages, unique title, description, canonical, Open Graph, JSON-LD (`Article`, `Person`, `PublicationIssue`), no soft 404 | P0 |
| NFR-003 | Accessibility: WCAG 2.2 AA target, visible focus, keyboard use, contrast measured, alt text | P0 |
| NFR-004 | Performance: LCP ≤ 2.5 s on mid-range phone over 4G for article pages; low layout shift; subset fonts | P0 |
| NFR-005 | Responsive: no horizontal scroll, no overflow of Hindi text at 390 px | P0 |
| NFR-006 | Security controls per `security-and-privacy.md` and `security_review` | P0 |
| NFR-007 | Privacy: private data never in public serializers, logs, errors or URLs | P0 |
| NFR-008 | Backups with a restore drill passed; RPO/RTO confirmed by owner | P0 |
| NFR-009 | Observability: structured logs with request ID and no PII, error monitoring | P0 |
| NFR-010 | Quality gates: build, lint, type check, unit/integration/E2E tests in CI | P0 |
| NFR-011 | Browsers: current Chrome, Edge, Firefox, Safari (iOS and desktop); exact versions to be confirmed | P0 |
| NFR-012 | Fonts self-hosted, licence-checked, full Devanagari coverage, `font-display: swap` | P0 |
| NFR-013 | No placeholder, mockup or `DEV DATA` content in production (T-CLN-01) | P0 |
| NFR-014 | Config: env validation fails loudly; secrets only in environment; `.env.example` lists names only | P0 |

## 5. Pending and open
FR-018, FR-025, FR-032, FR-033, FR-052 stay **Pending** until their decisions are recorded.
