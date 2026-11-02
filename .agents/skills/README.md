# UJAAS agent skills

Each file is one focused skill. Load only the ones a task needs. The cycle that ties them together is `.agents/workflows/startcycle.md`.

| Skill | Use when |
|---|---|
| `decision_gate.md` | Before any task that touches an open owner decision |
| `spec_contract.md` | Adding or changing a route, endpoint, entity or workflow |
| `traceability_check.md` | Closing any requirement; updating tests or `progress.md` |
| `editorial_workflow.md` | Anything involving status changes, publishing, scheduling, unpublishing |
| `submission_privacy.md` | Public submission form, inbox, consent, private data |
| `hindi_content.md` | Any Hindi text, search, fonts, seeds, UI strings |
| `public_site_build.md` | Public pages, links, empty/error states |
| `admin_cms_build.md` | Admin screens, permissions, revisions, audit |
| `magazine_issues.md` | E-magazine issues, ordering, archive, PDF question |
| `media_uploads.md` | Image/file upload, alt text, storage |
| `security_review.md` | Auth, sessions, CSRF, rate limits, headers, secrets |
| `seo_a11y_perf.md` | Metadata, sitemap, accessibility, responsive checks, performance |
| `design_principles.md` | UI work, order of authority (owner → client → taste → mockups), tokens, excluded features |
| `taste_house_rules.md` | Taste-skill rules checked against UJAAS: adopt / adapt / conflict with client mockups |
| `taste_design_run.md` | Starting the visual design: brief, argument, direction, idea, build order (needs the taste skill installed) |
| `taste_gate.md` | Lint, inspect at 1440/768/390 px, critique, report, before the Auditor |
| `frontend_imagery.md` | Any picture: sources, credit, permission, placeholders |
| `motion_restraint.md` | Any animation: subtle motion that still meets the taste budget |
| `content_safety.md` | Seeds, fixtures, mockup content, launch cleanup |
| `audit_code.md` | Auditor pass after each feature |
| `release_readiness.md` | Pre-launch checks, backups, handover |

Taste skill
- `design-taste-frontend` (taste skill v2, source `Leonxlnx/taste-skill`) was added by the owner on GitHub under `.agents/.skills/` (copies for `.agents`, `.claude`, `.hermes`, `.kiro`, `.qwen`; lock file `skills-lock.json`). It is **not present in this local folder**, so the `taste_*` skills here were written from a condensed read of its `SKILL.md`. Re-read the installed file, `references/` and `scripts/` before relying on exact rules or flags.
- Taste rules shape craft; they never override the client brand, approved scope or an owner decision.

Notes
- Skills are stack-agnostic until D-07 is decided; they name behaviour, not libraries.
- The empty placeholders `.agents/.skills/README.md` and `.agents/workflow/README.md` from the scaffold were left untouched.
