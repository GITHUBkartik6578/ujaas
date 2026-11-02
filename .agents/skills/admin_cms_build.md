# Skill: admin_cms_build

**Use when:** building the admin (`/admin/*`).
**Sources:** `docs/sitemap.md` §3, `docs/api-contract.md` §3, `docs/editorial-workflow.md`, `docs/user-flows.md` (F11–F16, E5–E8), decisions D-05, D-10.
**Tests:** T-ADM-01…04, T-PUB-01…04, T-REV-01, T-MED-01/02, T-SUB-06.

## Rules
- Authentication and permissions are enforced on the **server** for every route; the UI only hides things. Deny by default. Test every role × route.
- Admin pages are `noindex`. Initial admin is created by a one-time command or setup link; **no default credentials** anywhere.
- Roles: `site_admin`, `editor_in_chief`, `editor`, `content_manager` exist in the schema. Which are enabled is D-05; use the permission tables in `editorial-workflow.md` until the owner changes them.
- Editor: Hindi-friendly rich text with paste cleaning, excerpt, type, category, authors, cover with alt text and credit, rights note. Preview through a signed time-limited link (`noindex`). Unsaved-change prompt on leave. Field-level validation messages.
- Destructive actions (unpublish, archive, reject, delete, restore revision) ask for confirmation. `DELETE` only for never-published drafts, empty categories/collections and unused media, by `site_admin`.
- Expired session: `401 session_expired` → re-login in place, editor content kept and restored.
- Concurrent edit: `If-Match` mismatch → 409 with reload/compare.
- Homepage manager can select only published items. Issue manager attaches published creations and reorders atomically.
- Audit log is append-only, read-only in the UI.

## Visual rules for the admin
The admin is an app screen: follow the taste skill's `references/app-screens.md` and run `inspect.mjs --app` (`taste_design_run`, `taste_gate`). If the chosen CMS supplies its own admin UI, apply this only to the custom screens. Function and permissions come before polish.

## Done when
Role matrix tests pass, expired-session and conflict flows are demonstrated, and no admin API answers an unauthenticated request with data.
