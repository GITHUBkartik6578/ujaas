# UJAAS — Phase 1: Product Discovery, Deep Research & Repository Specification

> **Phase:** 1 of 2 — Specification (no major feature code until this is approved)
> **Output:** Documentation inside the repository
> **Next phase:** [02-implementation-and-verification.md](./02-implementation-and-verification.md)

## Role

Act as a senior product architect, UX researcher, information architect, full-stack architect, database designer, security engineer, and QA lead.

Your mission is to produce an evidence-based, repository-ready specification for UJAAS, a professional Hindi literary publishing platform.

Reference websites:

- https://www.hindwi.org/
- https://www.rekhta.org/emagazines

Do not merely describe the visual design. Investigate the observable user journeys, information architecture, content relationships, administrative publishing operations, data requirements, and edge cases.

## 1. Fixed project requirements

- **Project:** UJAAS (उजास)
- **Tagline:** अपनी बात — अपना मंच
- **Primary language:** Hindi using Devanagari.
- **Product:** Hindi literary website with an editorial publishing system and readable digital e-magazine.
- **Reader access:** Public visitors can browse and read published content without requiring an account.
- **Writer participation:** Public writers can submit original creations through a form without creating writer accounts.
- **Editorial control:** Submissions must be reviewed before publication.
- **Admin CMS:** Authorised administrators/editors must be able to create, edit, preview, publish, schedule, unpublish, and organise content without modifying application code.
- **Magazine format:** Readable articles displayed on the website. Scanned magazine pages and PDF-reader features are not launch requirements unless the owner approves them.
- **Out of scope by default:** No unnecessary public accounts, subscriptions, payments, memberships, comments, ratings, or social feeds. Treat these as optional future features.

Preserve these decisions unless an explicit owner-approved change is recorded.

## 2. Research both references

Inspect each website separately and document verified observations.

### Hindwi research

Investigate:

- Homepage content sections and navigation.
- Editorial articles and collections.
- Featured and latest content.
- Literary categories and forms.
- Poet/author discovery and profiles.
- Historical-period or alphabet-based discovery, where available.
- Individual poem/article pages.
- Related works and contextual links.
- Search and filtering.
- E-books or additional content formats where relevant.
- Footer, contact, and site information.
- Mobile navigation and reading experience.

### Rekhta e-Magazines research

Investigate:

- Magazine discovery and frequency filters.
- Curated magazine collections.
- Magazine detail and index pages.
- Available issue counts.
- Issue number, volume, year, month, and publication metadata.
- Publisher, editor, contributor, and language metadata where available.
- Year and issue-number sorting.
- Searchable filters and archive navigation.
- Individual issue detail and table of contents, where applicable.
- Reading controls and page navigation in the existing reader.
- Related issues and recommendations.
- Reader experience on mobile.

For every observation, record the **URL, observed behaviour, evidence, and relevance to UJAAS**.

Classify each item as:

- Verified.
- Partially verified.
- Unverified.
- Recommended adaptation.

Never claim to have tested an interaction that you only saw in a static page snapshot. Use browser interaction or further inspection when available.

Do not copy proprietary code, text, branding, or copyrighted assets from either reference.

## 3. Produce a complete user-flow specification

Document every step in these journeys:

1. Reader discovers content on the homepage.
2. Reader explores literature by category.
3. Reader opens and reads a complete creation.
4. Reader opens an author profile and related works.
5. Reader explores a curated collection.
6. Reader searches and filters content.
7. Reader browses magazine issues.
8. Reader opens an issue and reads its attached articles.
9. Writer reads submission guidelines and submits a creation.
10. Admin reviews, approves, rejects, or requests revisions.
11. Admin creates and publishes editorial content.
12. Admin creates a magazine issue and orders its contents.
13. Admin edits, schedules, unpublishes, archives, or restores content.
14. Admin manages authors, categories, media, and homepage selections.

For each flow specify:

- Entry point.
- User action.
- Expected response.
- URL or destination.
- Required data.
- API/backend operation.
- Permission rules.
- Success, loading, empty, and error states.
- Acceptance criteria.

Include the complete flow for invalid links, no search results, failed submissions, failed image uploads, expired admin sessions, and unavailable backend services.

## 4. Design the information architecture

Prepare the sitemap and explain the purpose of every route.

**Public pages:**

- Home.
- Literature listing.
- Category listing and detail.
- Individual creation detail.
- Author directory and profile.
- Curated collections and collection detail.
- Search results.
- E-magazine landing page.
- Magazine issue archive and issue detail.
- Writer submission form.
- About UJAAS.
- Editorial introduction.
- Contact.
- Privacy policy.
- Terms of use.
- Copyright and submission policy.
- Custom 404 page.

**Private admin pages:**

- Admin login.
- Dashboard.
- Content manager.
- Content editor and preview.
- Drafts and scheduled content.
- Submission inbox and review detail.
- Authors manager.
- Categories manager.
- Collections manager.
- Magazine and issue manager.
- Media library.
- Homepage and site settings.
- Admin roles, if multiple editors are authorised.
- Audit history and operational tools.

Avoid creating redundant pages. Every visible link must have a defined destination and behaviour.

## 5. Define the complete content model

Evaluate an appropriate database model for the actual relationships.

**Entities to consider:**

- Admin accounts and roles.
- Published content.
- Authors.
- Categories and optional tags.
- Curated collections.
- Public submissions.
- Magazine series, if required.
- Magazine issues.
- Ordered relationships between issues and published content.
- Media assets.
- Content revisions.
- Submission status history.
- Admin audit logs.
- Site settings.

**For each entity specify:**

- Field name and data type.
- Required/optional status.
- Validation rules.
- Relationships.
- Indexes and uniqueness constraints.
- Public/private field visibility.
- Deletion or archival behaviour.

**Content requirements include:**

- Title and unique URL slug.
- Full Hindi text.
- Short excerpt.
- Content type.
- Category and optional topics.
- One or multiple credited authors when applicable.
- Cover image, image credit, and alt text.
- Source, translator, and copyright/permission metadata where relevant.
- Draft and publication timestamps.
- Publication status.
- Homepage featuring and ordering.
- SEO title, description, and canonical URL.
- Revision and restoration support.

**Magazine issues must support:**

- Issue title and unique slug.
- Issue number and optional volume.
- Publication date or period.
- Cover image.
- Editorial introduction.
- Publication metadata.
- An ordered list of attached published creations.
- Archive visibility.

A creation may appear in the general literature listing and in a magazine issue without duplicating the content record.

Use a unified content model where appropriate, but do not force incompatible content types into one structure if that damages validation or maintainability.

## 6. Define the editorial state machines

**Content status transitions:**

Draft → In Review (if editorial review is needed) → Approved → Scheduled or Published → Unpublished or Archived.

**Submission transitions:**

Pending Review → Under Review → Revision Requested, Approved, or Rejected → Published, where applicable.

Withdrawal must be a controlled state transition with a documented process.

Define who can perform each transition, what gets recorded, and what the public can see.

**Important:**

- Approved does not automatically mean Published.
- Pending or rejected submissions must never be exposed through public endpoints.
- Unpublishing content must remove it from public listing, search, and ordinary public APIs.
- Retain necessary audit history without exposing private writer information.
- Avoid deleting published material or revisions without the authorised deletion policy.

## 7. Define the submission workflow

The initial submission form should collect only approved necessary information:

- Writer's display name.
- Contact email.
- Optional pen name.
- Creation title.
- Approved creation type.
- Full original text.
- Optional short description.
- Optional image, if supported.
- Original-work declaration.
- Explicit publication permission.
- Privacy-policy acknowledgement.

Define frontend and backend validation, spam protection, rate limiting, duplicate handling, and secure storage.

Because writers have no accounts, define how receipt confirmation works. Compare these options:

- Confirmation screen and reference ID.
- Confirmation email.
- Editorial status updates through email.
- Private status lookup using a securely designed token, only if owner-approved.

Do not create writer login accounts or a public submission dashboard.

**Administrative actions:**

- Opening a submission.
- Assigning it to an editor if needed.
- Adding private review notes.
- Requesting revisions.
- Approving.
- Rejecting.
- Publishing.
- Recording withdrawal or deletion requests.
- Maintaining a status history.

Identify every outstanding decision requiring the owner's approval.

## 8. Define the admin publishing experience

Specify how an editor will:

- Create and edit a creation.
- Format Hindi text.
- Preview content before publishing.
- Select author, categories, collections, and images.
- Set featured status and ordering.
- Schedule publication.
- Unpublish and restore archived content.
- Review earlier revisions.
- Restore an earlier revision safely.
- Create an author profile.
- Create a category.
- Create a curated collection.
- Add multiple creations to a magazine issue.
- Reorder issue contents.
- Change homepage selections.
- Update contact, footer, and site metadata.

Include confirmation dialogs for destructive actions, unsaved-change handling, validation messages, and success/error feedback.

Avoid an editor interface that requires a developer to change application code for normal content operations.

## 9. Define public API contracts

Propose routes for:

- Published content listings and detail.
- Categories and category content.
- Authors and author works.
- Curated collections and their contents.
- Search.
- Magazine and issue listings.
- Issue details and ordered contents.
- Public submission creation.
- Admin authentication.
- Admin content CRUD and publication.
- Admin submissions and state changes.
- Author and category management.
- Collection management.
- Magazine issue management.
- Media management.
- Site settings.

For every route specify:

- HTTP method and URL.
- Request parameters and body.
- Validation.
- Authentication and authorisation.
- Success response.
- Error response.
- Pagination and filtering.
- Rate-limiting requirements.
- Whether the route is public or restricted.

Use consistent errors and status codes.

Do not expose unpublished content by guessing its slug or URL.

Document the API contract before implementing dependent frontend screens.

## 10. Repository architecture and engineering decisions

Before proposing code, inspect the existing workspace and determine:

- Whether a repository already exists.
- Current framework and package manager.
- Existing routes, components, dependencies, scripts, tests, and environment variables.
- Uncommitted changes and untracked files.
- Existing architecture that must be preserved.

Do not overwrite or delete existing files without examining their purpose.

If the repository is empty, recommend the most suitable architecture for a content-rich Hindi website with strong SEO requirements, an admin CMS, and relational publishing data.

Compare the viable stack options and justify one recommendation. Do not automatically introduce WordPress, a complex microservice architecture, or unnecessary dependencies.

Record the selected stack in an Architecture Decision Record.

**Plan:**

- Application structure.
- Frontend routing and layouts.
- Backend boundaries.
- Database schema and migrations.
- Authentication.
- Media storage.
- Email service, if approved.
- Validation.
- Logging and error handling.
- Environment configuration.
- Deployment architecture.

Do not start major feature implementation until the architecture, sitemap, content model, and launch scope are documented.

## 11. Security, privacy, and operational requirements

Include:

- Secure admin authentication.
- Password hashing.
- Server-side authorisation.
- Initial administrator provisioning without insecure default credentials.
- Rate limiting.
- Input validation and sanitisation.
- CSRF protection where applicable to the authentication/session model.
- Secure session/token handling.
- File-type and size validation.
- Safe media URLs.
- Private submission access restrictions.
- Consent records and approved privacy wording.
- Data-retention and deletion policy.
- Admin audit history.
- Database backup and restoration.
- Error monitoring.
- Environment secret protection.
- HTTPS and production configuration.
- Dependency and build checks.

Do not invent a retention period, legal policy, or publication permission. Mark owner/legal decisions as pending.

## 12. Search, Hindi, SEO, and accessibility

Specify:

- Correct Devanagari Unicode input, storage, and rendering.
- Search across the approved fields.
- Pagination and useful filters.
- Safe handling of punctuation, matras, and Hindi text.
- Empty and error states.
- Stable human-readable URLs.
- Metadata and canonical URLs.
- Sitemap and robots.txt.
- Suitable structured data.
- Social sharing metadata.
- SEO-friendly page rendering.
- Readable Hindi typography.
- Keyboard navigation.
- Visible focus states and sufficient contrast.
- Alt text and meaningful image credits.
- Responsive article-reading layouts.
- Image optimisation.
- Performance monitoring.

Recommend server-side rendering or prerendering if required by the selected architecture and SEO goals. Verify rather than assume search-engine visibility.

## 13. Repository documentation

Create a documented project specification with:

| File | Purpose |
|---|---|
| `README.md` | Setup, commands, architecture overview, and troubleshooting |
| `docs/reference-audit.md` | Verified findings and source links |
| `docs/requirements.md` | Functional and non-functional requirements |
| `docs/sitemap.md` | Routes and page responsibilities |
| `docs/user-flows.md` | User journey diagrams |
| `docs/data-model.md` | Database entities and relationships |
| `docs/api-contract.md` | API details |
| `docs/editorial-workflow.md` | Status transitions and publishing rules |
| `docs/content-handover.md` | Owner-supplied content checklist |
| `docs/security-and-privacy.md` | Security and privacy decisions |
| `docs/test-plan.md` | Verification requirements |
| `docs/deployment.md` | Environments, backups, and release procedure |
| `docs/decisions/` | Architecture decisions and unresolved trade-offs |

Adapt this structure to an existing repository rather than duplicating existing documentation unnecessarily.

## 14. Testing and acceptance criteria

Create a traceable test matrix for:

- Every page and navigation route.
- Every content card and internal link.
- Search, categories, collections, and authors.
- Article details and related works.
- Magazine issues and content ordering.
- Draft, schedule, publish, unpublish, and archive.
- Public submission validation.
- Spam and duplicate attempts.
- Consent storage.
- Admin authentication and access control.
- Private submissions and revision history.
- Media uploads.
- Responsive layouts.
- Hindi Unicode.
- Loading, empty, error, and 404 states.
- SEO metadata.
- Backup and restore.
- API security.

Use appropriate unit, integration, and end-to-end tests.

Define a requirement-to-test traceability matrix with:

- Requirement ID.
- Description.
- UI component/page.
- Database/API dependency.
- Test ID.
- Priority.
- Status.
- Owner-supplied dependency.

Every mandatory requirement must be mapped to a test. Unimplemented or unverified items must remain visibly open; never mark them complete merely because documentation mentions them.

## 15. Prioritisation

- **P0** — Required for a secure, functional initial launch.
- **P1** — Valuable enhancement after launch.
- **P2** — Optional future capability.

Do not let optional features expand the initial scope without approval.

The P0 scope must cover the actual reader experience, admin publishing, public submissions, editorial review, magazine issues, privacy/security essentials, responsive behaviour, and production verification.

## 16. Required output and execution rules

First deliver:

1. Research findings with evidence.
2. Reference comparison matrix.
3. Sitemap and user flows.
4. Functional specification.
5. Data model and API contract.
6. Owner requirements checklist.
7. Security and operational checklist.
8. Acceptance-test matrix.
9. Repository architecture recommendation.
10. Traceability matrix.
11. Open decisions and risks.
12. A phased implementation plan.

Then prepare the documentation in the repository if safe to do so.

Do not make unapproved production changes, push commits, merge branches, or deploy. Do not expose credentials or overwrite existing user work.

If a question remains unresolved, record the assumption, risk, and decision owner. Continue with independent tasks where safe.

The outcome must enable a developer or development group to implement UJAAS without relying on undocumented assumptions or overlooking essential user journeys.
