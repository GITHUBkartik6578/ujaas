# UJAAS (उजास) — अपनी बात, अपना मंच

Professional Hindi literary publishing platform: public reading site, editorial CMS, public writer submissions, and a readable digital e-magazine.

## How this project works (read this first)

The work is split into **two phases**. Do not start Phase 2 until Phase 1 is approved by the owner.

| Phase | Goal | Instructions |
|---|---|---|
| 1 | Research + full specification (docs only, no major feature code) | [docs/workflow/01-discovery-and-specification.md](docs/workflow/01-discovery-and-specification.md) |
| 2 | Build, test and verify against the approved spec | [docs/workflow/02-implementation-and-verification.md](docs/workflow/02-implementation-and-verification.md) |

Live status of every task: **[progress.md](progress.md)**

## Team rules

1. The approved spec is the single source of truth.
2. Inspect the repo before changing anything; never overwrite existing work.
3. Never commit credentials. Use `.env.example` only.
4. Do not commit, push, merge, or deploy without explicit authorisation.
5. Owner/legal items (privacy wording, retention period, consent text) are never invented — mark them pending in `progress.md`.
6. Nothing is "done" until it is verified by a test — update `progress.md` honestly.

## Fixed scope

- Hindi (Devanagari) first
- No reader accounts, payments, comments, ratings or social feeds at launch
- Writers submit via form, no writer accounts
- Every submission is reviewed before publication
- Magazine = readable web articles (no PDF/scan reader at launch)

## Documentation map

```
README.md
progress.md
docs/
  workflow/        ← the two phase instruction files
  reference-audit.md
  requirements.md
  sitemap.md
  user-flows.md
  data-model.md
  api-contract.md
  editorial-workflow.md
  content-handover.md
  security-and-privacy.md
  test-plan.md
  deployment.md
  decisions/
```

Files other than `docs/workflow/` are produced during Phase 1.

## Setup, commands, architecture overview, troubleshooting

_To be filled once the stack is chosen (ADR in `docs/decisions/`) and Phase 2 begins._
