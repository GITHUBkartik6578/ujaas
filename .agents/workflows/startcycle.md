# Workflow: startcycle

Source of truth: `docs/` (approved spec), `progress.md` (live status), `docs/decisions/owner-decision-register.md` (open decisions). Skills live in `.agents/skills/`; roles in `.agents/agents.md`.
Design craft follows the taste skill (`design-taste-frontend`) through the `taste_*` skills, **below** the owner's decisions and the client brand.

## Gate: do not write application code until ALL are true
1. The owner has signed off Phase 1 (`docs/owner-review-pack.md` §7 E).
2. The 8 P1 decisions (D-07, D-08, D-09, D-23, D-24, D-25, D-26, D-27) are answered and recorded in the register.
3. `docs/decisions/0001-technology-stack.md` is **Accepted** (spike result written in it).
4. The owner has authorised Phase 2 in writing.

For UI work there is one more precondition: the taste skill must be installed in this working folder (today it exists only in the GitHub copy under `.agents/.skills/`) with Node 18+ for lint and Node 22 + Chrome for the inspector. If a tool is missing, say so and do not claim its results.

If any item is missing: stop, say which one, and do documentation work only. Never decide for the owner (skill `decision_gate`).

## Steps for every feature
1. Spec check: the feature has a requirement ID (`requirements.md`), a route (`sitemap.md`), endpoints (`api-contract.md`), entities (`data-model.md`) and tests (`test-plan.md`). If not, update the docs first (skill `spec_contract`) and flag any scope change to the owner.
2. Decision check: read `open-decisions.md`. Use the stated assumption and mark it `ASSUMPTION D-xx`; never invent a legal, retention or content answer.
3. Owning side implements using the matching skills. Backend proves behaviour with tests on the real data model; frontend builds against fixtures first, then the live API. Server-side checks always, never UI-only. UI work follows `design_principles`, `taste_house_rules`, `frontend_imagery` and `motion_restraint`; the first UI feature also runs `taste_design_run`.
4. Design gate (every UI feature): run `taste_gate` (lint, inspect at 1440 / 768 / 390 px, critique, three rounds at most). FAIL = 0, or each FAIL is a recorded exception with its owner decision. Any conflict listed in `taste_house_rules` is reported to the owner, never silently fixed or ignored.
5. Auditor runs `audit_code` (including its design-gate check). Any FAIL goes back to step 3 with the exact issue.
6. Update the `test-plan.md` status cell and `progress.md` with evidence (command output or screenshot) (skill `traceability_check`).
7. Stop and report. Do not start the next feature without confirmation.

## Build order (from `docs/deployment.md` §6)
1. Foundation: repo, CI, schema + migrations, env validation, admin auth and roles, audit log, media, Devanagari fonts. Contract and fixtures first, both sides together. **Design direction session** (`taste_design_run`): brief reading, argument per page, three directions with `--keep palette,type`, idea sentence, design tokens, then the owner approves direction, palette roles (D-09), taste-rule collisions (D-31), logo (D-27) and the 390 / 768 px screens (D-26) before content load.
2. Public site: home, literature, category, detail, authors, collections, search, static and policy pages, 404, SEO, breadcrumbs.
3. Editorial: content workflow, revisions, preview, scheduling, homepage manager.
4. Submissions: form, consent record, spam and rate limits, inbox, review states, contact and grievance. Needs D-03 text before going live.
5. E-magazine: issues, ordered contents, archive, issue pages. PDF only if D-08 approves it.
6. Hardening: accessibility, performance, security scan, backup restore drill, content load, owner UAT.
7. Launch and handover (only with explicit authorisation).

If time runs out, cut P1 items first (related works FR-007, previous/next issue FR-024, FAQ FR-038, 2FA, RSS). Never cut: server-side permissions, consent storage, unpublish purge, backups, privacy of submissions.

## Ground rules
- Documentation and code follow the approved spec. Change the spec first, then the code.
- Hindi (Devanagari) first. Unicode NFC. No placeholder or mockup text on the live site.
- Authority order for design: owner decisions → client brief and brand → taste rules → mockups (reference only). Taste rules never override the client's palette, logo, required pages or an owner decision; collisions are reported to the owner.
- Never claim a lint, inspector, scene, test or build result that was not run; attach the output.
- Pictures are owner-supplied or owner-approved with credit and permission; no AI faces, no real-person lookalikes, no invented proof or statistics (`frontend_imagery`, `content_safety`).
- Motion stays subtle and optional for the reader (`motion_restraint`).
- Reader accounts, payments, comments, ratings, social feeds, membership, newsletter, activity registration and popularity rankings are out of scope unless the owner approves (D-23, D-24, D-25, D-30).
- Every submission is reviewed before publication. Pending and rejected submissions never reach any public endpoint. Approved is not Published.
- Submission data, contact details, consent records, revisions and audit logs are private. Never log submission bodies, passwords or raw IPs.
- No default credentials; no secrets in the repo; `.env.example` has names only.
- No silent fallbacks: missing config or a failed dependency fails loudly at startup.
- Sample or seed data is labelled as development data and is removed before launch (T-CLN-01).
- Do not commit, push, merge or deploy without explicit written authorisation.
- Never write "done" without command output or a screenshot. Update `progress.md` honestly: ✅ only with evidence.

## Current state (snapshot 2026-11-02; `progress.md` is authoritative)
Phase 1 documents drafted and cross-audited (about 63 % by the method in `progress.md`). Owner review pack prepared, not yet reviewed. 31 decisions open, including the 8 P1 ones. Stack not chosen. No application code. The owner added the taste skill (`design-taste-frontend`) on GitHub; it is not yet in this working folder and has not been run. Open design conflicts between taste rules and client mockups are listed in `.agents/skills/taste_house_rules.md` and recorded as D-31 (P2) in the decision register, still open. **Phase 2 is not authorised.**
