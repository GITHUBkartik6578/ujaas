# UJAAS — Sitemap and Route Purposes

**Status:** Draft for owner review. Every visible link needs a destination from this file. Slugs are lowercase ASCII (transliterated) so URLs stay copy-paste safe; page titles are Hindi. Slug choices are proposals for owner approval.

## 1. Principles
- Only routes listed here are built. No `href="#"`.
- Published content only on public routes; unpublished or unknown slugs return a real 404.
- Canonical URL of an article inside an issue is `/rachna/[slug]`.
- Admin pages are `noindex`, disallowed in `robots.txt`.

## 2. Public routes
| Route | Purpose | Req | Data | Notes |
|---|---|---|---|---|
| `/` | Home | FR-001 | settings, latest issue, picks, authors | blocks hidden when empty |
| `/hamare-bare-mein` | About UJAAS | FR-011 | static page | owner text |
| `/sampadkiya` | Editorial introduction | FR-012 | static page | D-28 |
| `/e-patrika` | E-magazine landing: current issue + archive | FR-020, 021, 026 | issues | `?year=`, `?page=`; "coming soon" before first issue |
| `/e-patrika/[issue-slug]` | Issue page with ordered contents | FR-022, 023, 025 | issue, issue_items | PDF hidden until D-08 |
| `/sahitya` | Literature listing | FR-003 | contents | `?type=`, `?page=` |
| `/sahitya/[category-slug]` | Category detail (includes `vichar`, `kavita`, etc.) | FR-004 | category, contents | empty state |
| `/rachna/[slug]` | Creation detail (canonical) | FR-005, 007, 016, 024 | content, authors | related works P1 |
| `/rachnakar` | Author directory | FR-006 | authors | `?startswith=`, `?type=`, `?page=` |
| `/rachnakar/[author-slug]` | Author profile and works | FR-006 | author, contents | only `is_public` |
| `/sangrah` | Curated collections list | FR-008 | collections | |
| `/sangrah/[collection-slug]` | Collection detail | FR-008 | collection items | published members only |
| `/khoj` | Search results | FR-009 | search | `?q=`, `?type=`, `?category=`, `?page=` |
| `/rachna-bhejein` | Writer submission form + guidelines + FAQ | FR-019, 027–031, 038 | form | live only after D-03 |
| `/rachna-bhejein/prapti` | Submission confirmation with reference ID | FR-029 | reference | reachable only right after submit |
| `/sampark` | Contact page and form | FR-013 | settings | details shown when supplied |
| `/gatividhiyan` | Activities (informational) | FR-018 | pending | P1; hidden per D-25 |
| `/niti/gopniyata` | Privacy policy | FR-014 | static | draft banner until approved |
| `/niti/upyog-ki-sharten` | Terms of use | FR-014 | static | same |
| `/niti/copyright-aur-rachna-niti` | Copyright and submission policy | FR-014 | static | same |
| `/sitemap.xml`, `/robots.txt` | SEO files | FR-017 | published URLs | |
| `/rss.xml` | RSS | FR-049 | latest | P1 |
| any other | Custom 404 with search and category links | FR-010 | — | status 404 |

**Header (D-29 assumption):** logo → हमारे बारे में · ई-पत्रिका · साहित्य · विचार · रचनाकार · गतिविधियाँ (hidden, D-25) · अपनी रचना भेजें · संपर्क · search · one CTA (अपनी रचना भेजें). "विचार" links to `/sahitya/vichar`.
**Footer:** quick links, the three policy pages plus two more policy links to be defined by owner (five required by the skill; the list of five is a decision for the owner, proposed: privacy, terms, copyright, submission policy, grievance/contact); contact and social hidden until supplied.

## 3. Admin routes (all require a session; deny by default)
| Route | Purpose | Req | Min role (until D-05) |
|---|---|---|---|
| `/admin/login` | Sign in | FR-034 | public |
| `/admin` | Dashboard | FR-035 | any admin |
| `/admin/content` | Content manager (filters: status, type, category) | FR-036, 037 | content_manager+ |
| `/admin/content/new`, `/admin/content/[id]` | Editor and preview | FR-036 | content_manager+ |
| `/admin/content?status=draft` and `?status=scheduled` | Drafts and scheduled content | FR-037 | content_manager+ |
| `/admin/submissions`, `/admin/submissions/[id]` | Inbox and review detail | FR-039 | editor+ |
| `/admin/messages` | Contact messages | FR-047 | editor+ |
| `/admin/authors` | Authors manager | FR-040 | content_manager+ |
| `/admin/categories` | Categories and topics | FR-041 | content_manager+ |
| `/admin/collections` | Collections | FR-042 | content_manager+ |
| `/admin/issues`, `/admin/issues/[id]` | Magazine issue manager | FR-043 | editor+ |
| `/admin/media` | Media library | FR-044 | content_manager+ |
| `/admin/homepage` | Homepage selections | FR-045 | editor_in_chief+ |
| `/admin/settings` | Contact, footer, metadata | FR-045 | site_admin |
| `/admin/users` | Admin accounts and roles (hidden until D-05) | FR-052 | site_admin |
| `/admin/audit` | Audit history (read-only) | FR-046 | site_admin, editor_in_chief |
| `/admin/ops` | Health, scheduler status, backup status | FR-050 | site_admin |

Role names: `site_admin`, `editor_in_chief`, `editor`, `content_manager` (permission tables in `editorial-workflow.md`).

## 3a. Build status (2026-11-02)
Built: `/`, `/sahitya`, `/sahitya/[category]`, `/rachna/[slug]`, `/rachnakar`, `/rachnakar/[slug]`, `/sangrah`, `/sangrah/[slug]`, `/khoj`, `/sitemap.xml`, `/robots.txt`, custom 404.
Admin built: `/admin/login`, `/admin`, `/admin/content` (+ `new`, `[id]`), `/admin/authors`, `/admin/categories`, `/admin/collections`, `/admin/media`, `/admin/homepage`, `/admin/settings`, `/admin/audit`; public `/preview/[token]`. Also built (e-magazine phase): public `/e-patrika` (current issue, archive newest first with a year filter, honest empty page before the first issue), `/e-patrika/[slug]` (cover, number, volume, period, date, introduction, publishing details, contents grouped by section label), `/rachna/[slug]?issue=...` (previous and next inside the issue; the canonical address stays `/rachna/[slug]`); admin `/admin/issues`, `/admin/issues/[id]`.
Also built (submissions phase): public `/rachna-bhejein` (the form is closed until the owner supplies the consent wording, D-03; the header and home links to it appear only when it is open), `/rachna-bhejein/prapti` (receipt, reachable only right after a send), `/sampark`; admin `/admin/submissions`, `/admin/submissions/[id]`, `/admin/messages`.
Admin not built: `/admin/users`; `/admin/ops` (health shows on the dashboard).
Not built yet: `/hamare-bare-mein`, `/sampadkiya`, `/niti/*` (need owner text, items 5, 6, 22 to 24), `/gatividhiyan` (D-25), `/rss.xml`, all `/admin/*`. Their links do not render in production (`app_build/frontend/src/lib/routes.ts`).

## 4. Link rules
- Every card links to its detail route. Author names link to `/rachnakar/[slug]` when public; otherwise plain text.
- Breadcrumb example: मुख्य पृष्ठ › साहित्य › कविता › [title].
- Redirects: renamed slugs 301 through `slug_redirects`.
