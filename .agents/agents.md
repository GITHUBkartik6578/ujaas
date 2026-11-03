# UJAAS — Agent Instructions

UJAAS (उजास) — "अपनी बात, अपना मंच" is a professional **Hindi (Devanagari) literary publishing platform**: a public reading site, an editorial CMS, public writer submissions (no writer accounts, every submission reviewed before publication) and a readable web e-magazine. It is a respected, well-known magazine; the product must feel like a contemporary literary institution, not a blog or news portal.

Read this file first, then `README.md`, `progress.md` and `.agents/workflows/startcycle.md`.

## Source of truth and authority order

1. **Owner decisions** (`progress.md` → Open Owner Decisions; `docs/decisions/`). Never decide for the owner.
2. **The approved spec** in `docs/` (requirements, sitemap, user flows, data model, API contract, editorial workflow, security and privacy, test plan, deployment).
3. **Client brief and brand**, then the **taste skill** rules (craft only).
4. **Mockups and files in `designs/`** — reference, not specification (see "Designs folder" below).

If two layers disagree, the higher one wins and the conflict is reported to the owner. Never resolve a conflict silently in code or docs.

## Project phases

| Phase | Work | Instructions |
|---|---|---|
| 1 | Research + full specification (docs only, no major feature code) | `docs/workflow/01-discovery-and-specification.md` |
| 2 | Build, test, verify against the approved spec | `docs/workflow/02-implementation-and-verification.md` |

**Do not write application code until the gate in `.agents/workflows/startcycle.md` is fully met** (Phase 1 owner sign-off, P1 decisions answered, tech-stack ADR accepted, Phase 2 authorised in writing). If anything is missing, say which item and do documentation work only.

## Fixed scope

- Hindi (Devanagari) first; Unicode NFC; fonts must render Devanagari correctly.
- No reader accounts, payments, comments, ratings or social feeds at launch.
- Writers submit via a form; no writer accounts. Every submission is reviewed before publication.
- Magazine = readable web articles. No PDF or scan reader unless the owner approves (D-08).
- Admin can create, edit, preview, publish, schedule, unpublish and organise content without code changes.
- No placeholder, mockup or lorem text on the live site. Seed data must be clearly labelled development data.

## Roles

- **Spec author** — produces and maintains `docs/`. Changes the spec before the code, and flags any scope change to the owner.
- **Backend** — schema, migrations, API, auth, permissions, audit log, media, submissions. Proves behaviour with tests on the real data model. Server-side checks always, never UI-only.
- **Frontend** — public site and admin UI. Builds against fixtures first, then the live API. Follows the design rules below.
- **Auditor** — runs `audit_code` after each feature (including the design gate). Any FAIL goes back to the implementer with the exact issue. The Auditor is never the agent that wrote the feature.

## Skills (`.agents/skills/`)

Load only the skills a task needs. The per-feature cycle is `.agents/workflows/startcycle.md`.

| Area | Skills |
|---|---|
| Process | `decision_gate` (before any task touching an open decision), `spec_contract` (route/endpoint/entity/workflow changes), `traceability_check` (closing a requirement, updating tests and `progress.md`), `audit_code`, `release_readiness` |
| Content | `editorial_workflow`, `submission_privacy`, `hindi_content`, `magazine_issues`, `media_uploads`, `content_safety` |
| Build | `public_site_build`, `admin_cms_build` |
| Quality | `security_review`, `seo_a11y_perf` |
| Design | `design_principles`, `taste_house_rules`, `taste_design_run`, `taste_gate`, `frontend_imagery`, `motion_restraint` |

Third-party skill: `design-taste-frontend` (source `Leonxlnx/taste-skill`) lives under `.agents/.skills/` (copies for `.agents`, `.claude`, `.hermes`, `.kiro`, `.qwen`; pinned in `skills-lock.json`). Re-read its `SKILL.md`, `references/` and `scripts/` before relying on exact rules or flags. If Node 18+ (lint), Node 22 + Chrome (inspector) are missing, say so; never claim results that were not run.

## Designs folder (`designs/`) — required for all UI work

Before any visual or UI work (pages, components, layouts, admin screens, emails, the e-magazine), **inspect `designs/` first**.

### Required design reference path

**`designs/UJAAS_HTML_Design_Reference_Pack/`** is the primary design reference and must be consulted for every UI task.

| Path | What it is |
|---|---|
| `designs/UJAAS_HTML_Design_Reference_Pack/README.md` | Usage notes, limitations, data-accuracy and responsive guidance, and the inventory of all 42 references (page type, size, source image). **Read first.** |
| `designs/UJAAS_HTML_Design_Reference_Pack/index.html` | Gallery of all references |
| `designs/UJAAS_HTML_Design_Reference_Pack/pages/` | 42 viewer pages (`01-…` to `42-…`), one per image |
| `designs/UJAAS_HTML_Design_Reference_Pack/assets/` | 42 original mockup images (`.png`/`.jpg`): homepage, literary page, contact page, hero, logo/brand sheets, collages. **Open the images directly to inspect them.** |

How to use the pack:
1. Read the pack `README.md` inventory, then open the images in `assets/` relevant to the page being built (e.g. homepage, contact, literary page, logo and brand collages, hero). Many files are labelled only "UJAAS डिज़ाइन संदर्भ", so compare several before choosing.
2. The pack is **flattened screenshots**: there is no DOM, CSS, breakpoints, form logic or editable text. Rebuild real semantic HTML/CSS/JS (or the components of the ADR-chosen stack) from them. Never embed a screenshot as a page or background image.
3. **Names, portraits, dates, statistics, phone numbers, emails, addresses and issue dates in the mockups are not verified UJAAS data.** Use clearly labelled placeholders until the editorial team supplies confirmed content.
4. Mockups are mostly desktop-only portrait images, so mobile (390 px) and tablet (768 px) layouts must be designed (D-26) and flagged for owner review.
5. Test at 390 px, 768 px, 1366–1440 px and 1920 px. Prevent horizontal overflow, clipped Devanagari, overlapping sections and distorted images. Use real responsive `<img>` elements, and respect `prefers-reduced-motion`.
6. Keep each page's hero composition and section hierarchy distinct; do not clone one layout across all pages.
7. Do not edit, rename, move or delete anything in the pack. Copy only the assets the owner approves (e.g. the logo, D-27) into `app_build/frontend/`.

### General rules for `designs/`

1. **List and read everything in `designs/`** (the pack above plus `README.md` and anything added later): mockups, screenshots, logos, palettes, type specimens, page-wise guides and any exported PDFs/images. Note which pages and viewports each file covers.
2. **Treat them as reference, not specification.** Mockups are desktop-only, may be AI-generated, may contain placeholder content and taste "tells". Take layout intent, hierarchy, tone and brand cues from them. Do not copy placeholder text, stock imagery or the Hindwi/Rekhta look.
3. **Map each design file to the spec**: the page it shows must exist in `docs/sitemap.md` and have a requirement ID. A design with no matching route or requirement is reported to the owner, not built.
4. **Fill the gaps explicitly.** Where `designs/` has no 390 px or 768 px screens (D-26), or no state for empty/error/loading, design them from the tokens and `design_principles`, and flag them for owner review.
5. **Use design tokens only.** Define brand colours once as tokens (cream `#FDF9F3`, maroon `#620206`, blush `#F4E2D1`, sand `#CEB194`, dark brown `#362815`, copper `#925D43`, rust `#793423`, saffron `#F5BF89`; palette roles pending D-09; no green). Never scatter hex values in components.
6. **Resolve conflicts by authority order.** Where a mockup conflicts with an owner decision, the brief or a taste rule, follow `taste_house_rules` and report the collision (D-31). Do not silently fix or ignore it.
7. **Record what you used.** In your report and `progress.md`, cite the exact `designs/` files each screen was built from (e.g. `designs/UJAAS_HTML_Design_Reference_Pack/assets/<file>`).
8. **Do not modify, rename or delete files in `designs/`** unless asked. New design output (direction boards, screenshots from `taste_gate`) goes in `designs/` only when the owner wants it kept; otherwise use `production_artifacts/`.
9. If `designs/UJAAS_HTML_Design_Reference_Pack/` is missing or empty, or has nothing for the page in question, say so, do not invent a design, and run `taste_design_run` (brief, argument, direction, idea sentence, build order) for owner approval first.

Design skills to load with it: `design_principles`, `taste_house_rules`, `taste_design_run` (first UI feature), `taste_gate` (every UI feature: lint, inspect at 1440 / 768 / 390 px, critique, max three rounds), `frontend_imagery`, `motion_restraint`, `hindi_content`, `seo_a11y_perf`.

Design direction: premium, literary, warm; comfortable reading; no heavy animation; no clutter or commercial feel; its own original identity.

## Folder map

| Path | Purpose |
|---|---|
| `README.md`, `progress.md` | Overview and rules; live status, open decisions, change log |
| `docs/` | Spec (Phase 1 output) and `docs/workflow/` phase instructions |
| `designs/` | Client mockups, brand and design references (read before UI work) |
| `designs/UJAAS_HTML_Design_Reference_Pack/` | 42 mockup images, viewer pages, gallery and README: the primary design reference |
| `app_build/backend/`, `app_build/frontend/` | Phase 2 code |
| `production_artifacts/` | Build outputs, reports, evidence |
| `.agents/` | This file, `skills/`, `workflows/`, third-party `.skills/` |

## Working rules

1. Inspect the repo before changing anything; never overwrite existing work.
2. Never commit credentials; use `.env.example` only.
3. Do not commit, push, merge or deploy without explicit authorisation.
4. Owner/legal items (privacy wording, retention period, consent text) are never invented. Use the stated assumption, mark it `ASSUMPTION D-xx`, and keep it pending in `progress.md`.
5. Nothing is "done" until a test or inspection verifies it. Attach command output or screenshots, and update `progress.md` honestly.
6. Finish one feature, stop and report. Do not start the next without confirmation.
7. Never cut: server-side permissions, consent storage, unpublish purge, backups, privacy of submissions.
