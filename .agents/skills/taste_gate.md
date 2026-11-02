# Skill: taste_gate

**Use when:** a UI feature is built and before the Auditor pass (startcycle step 4).
**Sources:** `design-taste-frontend` scripts `lint.mjs`, `inspect.mjs`, `scenes.mjs` and `references/critique.md` (read them when installed; the notes here come from a condensed read of the skill).
**Evidence for:** T-RES-01, T-A11Y-01, T-PERF-01, T-HI-01, T-SCOPE-01.

## Rules
- Never report a check that was not run. If Node 22 or Chrome is missing, run `lint.mjs` (Node 18+), take screenshots manually, and say the inspector could not run.
- Test the **production build**, not only the dev server.
- Every FAIL is fixed. Every WARN is treated as wrong unless a defence is written down.
- A rule collision from `taste_house_rules` is recorded as an exception (rule, page, reason, owner decision), never hidden.
- Screenshots and reports live in `.taste-skill/` (`before`, `after`, `inspect`). Do not commit them without authorisation; link the evidence from `docs/test-plan.md` and `progress.md`.

## Steps
1. `lint.mjs` on the source: banned patterns and stock phrases.
2. `inspect.mjs` at **1440, 768 and 390 px** (screenshots saved). In addition run our own checks at 1366 and 1920 px (`seo_a11y_perf`). Add `--app` for admin screens.
3. `scenes.mjs` only if scroll scenes exist (desktop, phone, reduced motion).
4. Open **every screenshot after the last change** and critique it with `references/critique.md` (fourteen passes, weighted score). Fix the top three problems, re-inspect, re-look. **Three rounds at most.** Judge only what is visible.
5. Hindi pass: no overflow or clipped matras at 390 px, headlines within two lines, long names and titles wrap safely.
6. Scope pass: none of the excluded items appear (membership button, newsletter, registration, rankings, counters, fake stats, faces, map).
7. Write the report: direction, redraws, idea sentence, live thing, final scores and remaining gaps, credits, placeholders, sample content to swap, exceptions list.

## Pass conditions
0 FAIL at all three widths on the final version · every screenshot opened after the last change · a stranger can say what the page is and what to do within five seconds · every section has a heading and equal margins · no empty stretch · last critique written in the `critique.md` format.

## Expected UJAAS exceptions (to record, not to assume)
Palette (rust/copper/saffron), motion minimum, single primary action, navigation link count, numbered submit steps. Each is a `taste_house_rules` conflict recorded as D-31, waiting for the owner.

## Done when
The report and screenshots are attached, FAIL = 0 or each remaining FAIL is a recorded exception, and the Auditor can re-run the same commands.
