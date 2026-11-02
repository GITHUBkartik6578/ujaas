# Skill: audit_code

**Use when:** the auditor reviews a finished feature (step 4 of `startcycle`).
**Output:** PASS, or FAIL with the exact issues. Nothing is PASS on appearance alone.

## Checks (run commands; paste real output)
1. Build, lint, type check and the relevant unit/integration/E2E tests where configured. Report real pass/fail counts.
2. **Spec conformity:** the feature matches `requirements.md`, `sitemap.md`, `api-contract.md`, `data-model.md`, `editorial-workflow.md`. Any difference is a FAIL or a documented spec change.
3. **Privacy:** no private field in public responses, logs or errors; pending/rejected submissions unreachable; unpublished content returns 404 everywhere (list, search, sitemap, author, collection, issue).
4. **Permissions:** server-side check present on each admin route; role × route test exists.
5. **Security:** items from `security_review` that apply; no secrets, no default credentials, no raw SQL string building, no unsafe HTML rendering.
6. **Content:** no placeholder or mockup content, no dead links or `href="#"`, no hardcoded dummy listings (`content_safety`).
7. **Hindi:** NFC storage, line breaks kept, proofread strings, no overflow at 390 px (`hindi_content`).
8. **States:** loading, empty, error and 404 handled.
9. **Tests and docs:** matrix status cell updated with evidence; `progress.md` honest; assumptions tagged `ASSUMPTION D-xx`.
10. **Scope:** no out-of-scope feature slipped in (membership, newsletter, registration, rankings, comments, accounts).

11. **Design gate:** a `taste_gate` report exists for every UI change (lint, inspect at 1440 / 768 / 390 px, critique, screenshots opened after the last change). FAIL = 0 or each FAIL is a recorded exception with reason and owner decision. No inspector, lint or scene result is claimed unless its command output is attached. Conflicts from `taste_house_rules` are listed, not silently passed or silently fixed.

## Report format
`PASS` or `FAIL` · list of issues each with file, line, what is wrong, and the check it breaks · commands run and their output · items that could not be checked.

## Rule
A FAIL goes back to step 3 of `startcycle` with the exact issue. Do not fix and re-audit in the same pass without saying so.
