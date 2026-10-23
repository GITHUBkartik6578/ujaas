# UJAAS — Phase 2: Repository Implementation and Verification

> **Phase:** 2 of 2 — Implementation
> **Prerequisite:** Phase 1 specification approved ([01-discovery-and-specification.md](./01-discovery-and-specification.md))
> **Source of truth:** the approved specification, sitemap, ADRs, API contract, data model, and acceptance-test matrix

## Step 1: Inspect before modifying

Inspect the existing project, repository status, current branch, directory structure, package manager, environment configuration, dependencies, routes, tests, and uncommitted changes.

Do not overwrite existing work or create a duplicate project inside the project folder.

If the approved specification and current repository conflict, document the conflict and choose the least disruptive compatible implementation. Record any necessary architecture change.

## Step 2: Establish the foundation

Implement the approved:

- Application structure and routing.
- Design system and responsive page layouts.
- Database schema and migrations.
- Validated environment configuration.
- Backend/API conventions.
- Secure admin authentication.
- Error handling and logging.
- Test and build scripts.

Provide a working README and `.env.example` without real credentials.

Use only approved content. Any sample seed records must be clearly identified as development data and must not be presented as genuine published UJAAS content.

## Step 3: Implement the public website

Build the approved homepage, literature listing, category pages, article details, authors, collections, search, magazine archive, issue details, submission form, About, Contact, and policy pages.

Connect every functional control to its real destination or behaviour.

Load content from the approved data source. Do not leave permanent hardcoded dummy listings, dead buttons, fake forms, or placeholder links in the production experience.

## Step 4: Implement the editorial CMS

Build the approved admin dashboard, content editor, preview, draft and publishing controls, category/author/collection management, submission inbox, magazine issue manager, media library, and site settings.

Enforce authentication and permission checks on the server, not only in the user interface.

Handle publication status transitions consistently. An approved creation should not become public until its publication state permits it.

## Step 5: Implement the submission workflow

Validate public submissions on the frontend and backend.

Store original text, private contact information, and consent records according to the approved data model.

Implement duplicate/spam handling, status history, review actions, confirmation responses, and approved notification behaviour.

Never return private submission details or unpublished content through public APIs.

## Step 6: Test all workflows

Use the approved traceability matrix.

Run relevant unit tests, integration tests, and end-to-end tests. Verify every route, form, admin permission, content transition, and magazine relationship.

Test the responsive experience at minimum widths of:

- 390px mobile.
- 1366px desktop.
- 1920px wide desktop.

Verify that Hindi content does not overflow, cards link correctly, images retain suitable proportions, and no layout hides essential controls.

Check loading, success, empty, failed-request, authentication-expiry, and not-found states.

Run the project's build, lint, type checks, and tests where configured.

## Step 7: Production readiness

Verify:

- Environment variable validation.
- Database migration and seed behaviour.
- Secure initial admin provisioning.
- No credentials committed to source control.
- Required security controls.
- SEO metadata and sitemap.
- Error logging.
- Backup and restore documentation.
- Deployment configuration.
- Rollback instructions.
- Owner content and legal approvals.
- Outstanding P0 requirements.

Do not claim full production readiness if a required check could not be performed.

## Step 8: Final delivery report

Provide:

1. Files created or modified.
2. Features completed.
3. Database and API changes.
4. Test results, including actual pass/fail counts.
5. Build and lint results.
6. Verified routes and user journeys.
7. Unimplemented requirements.
8. Known defects and limitations.
9. Missing owner-supplied content or approvals.
10. Exact instructions for running locally and deploying safely.

Keep the requirement-to-test matrix updated throughout implementation.

Do not commit, push, merge, or deploy unless explicitly authorised.

The definition of done is successful functional verification against the approved requirements — not merely a visually complete homepage.
