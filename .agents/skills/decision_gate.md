# Skill: decision_gate

**Use when:** a task depends on something the owner has not decided.
**Sources:** `docs/decisions/owner-decision-register.md`, `docs/decisions/open-decisions.md`, `docs/owner-review-pack.md`.

## Rules
- Never decide on the owner's behalf. A recommendation in the register is advice, not an answer.
- Never invent legal text, a retention period, consent wording, contact details, ISSN, an Editor-in-Chief bio or any content.
- A decision is answered only when the owner's answer is written in the register. Chat remarks do not count until recorded.

## Steps
1. Find the decisions the task touches (grep the task's topic in the register).
2. If any is a **P1** decision (D-07, D-08, D-09, D-23, D-24, D-25, D-26, D-27) and still open: stop, report which one, do documentation only.
3. If a P2/P3 decision is open: use its **assumption** from `open-decisions.md`. Mark the code or doc `ASSUMPTION D-xx` so it can be found later.
4. If the owner answers: update the register, the assumption table, `progress.md`, and any doc the answer changes. Do not silently change code first.
5. If a task needs a decision that is not in the register, add it with options and a recommendation, and ask.

## What the open P1 decisions block
| ID | Blocks |
|---|---|
| D-07 | everything (stack) |
| D-08 | issue page, issue admin form, file storage |
| D-09 | design tokens, templates |
| D-23, D-24, D-25 | header, footers, activities page (build without them) |
| D-26 | responsive layouts |
| D-27 | header logo, favicon, social images |

**D-31 (P2)** blocks the design direction session in `taste_design_run` (taste-rule collisions with the mockups). Until it is answered, keep the client mockup structure and brand and log each collision as an exception.

## Done when
The task either proceeds on a recorded answer or an explicit assumption, or it stopped with a clear question.
