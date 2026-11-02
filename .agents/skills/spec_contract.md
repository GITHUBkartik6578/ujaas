# Skill: spec_contract

**Use when:** a route, API endpoint, entity, field or workflow is added or changed.
**Sources:** `docs/requirements.md`, `docs/sitemap.md`, `docs/api-contract.md`, `docs/data-model.md`, `docs/editorial-workflow.md`, `docs/user-flows.md`.

## Rules
- The docs are the contract. Code follows docs; if code needs to differ, change the docs first.
- One source per fact: status names live in `editorial-workflow.md`, fields in `data-model.md`, endpoints in `api-contract.md`, routes in `sitemap.md`.
- Public DTOs are explicit allow-lists. Private fields (see `data-model.md` §3) never appear in a public response.
- Errors use the shared shape and codes in `api-contract.md` §1.

## Steps
1. Locate the requirement ID. If none exists, add it to `requirements.md` with priority and source; if it enlarges scope, flag it to the owner.
2. Update `sitemap.md` (route), `api-contract.md` (method, URL, params, validation, auth, success, error, rate limit), `data-model.md` (field, type, rule, index, visibility).
3. Add or adjust tests in `docs/test-plan.md` and the traceability row.
4. On the first contract change in Phase 2, add a `Version` line and a `Changelog` section at the top of `api-contract.md` and bump it for every later change. Tell the other side (frontend or backend) in the report.
5. Run a consistency check: every route in `user-flows.md` exists in `sitemap.md`; every API call in flows exists in the contract; every requirement ID appears in the traceability matrix.

## Done when
Docs, code and tests agree, the change is in the `progress.md` change log, and the consistency check passes with output shown.
