# Skill: traceability_check

**Use when:** closing a requirement, adding a test, or updating `progress.md`.
**Sources:** `docs/test-plan.md` (catalogue + matrix), `docs/requirements.md`, `progress.md`.

## Rules
- A requirement is done only when its mapped tests pass and the status cell links to the evidence (CI run, command output or screenshot).
- Unimplemented or unverified items stay visibly open. Documentation that mentions a feature does not make it done.
- Every mandatory (P0) requirement maps to at least one test ID. Pending-decision items (e.g. FR-025 PDF, FR-032 extra fields) stay "Pending" until decided.
- Status legend: ⬜ not started · 🟡 in progress · ✅ verified (evidence) · ⛔ blocked · ❓ needs owner decision.

## Steps
1. For the feature, list its requirement IDs and the test IDs in the matrix.
2. Run the tests (unit, integration, E2E at 390 / 1366 / 1920 px where the test says so). Record actual pass/fail counts.
3. Update the matrix status cell: ✅ only with evidence; otherwise 🟡 with what is missing.
4. Update `progress.md` (table row and change log). Never raise a percentage without a reason that can be checked.
5. Run the consistency script/check: all requirement IDs mapped, all test IDs referenced exist in the catalogue.

## Done when
The matrix and `progress.md` match reality, and the report quotes the real command output.
