# Skill: release_readiness

**Use when:** preparing staging, launch or handover.
**Sources:** `docs/deployment.md`, `docs/content-handover.md`, `docs/test-plan.md`, `docs/security-and-privacy.md`.
**Tests:** T-BCK-01, T-CLN-01, T-SEC-01, T-PERF-01, T-SEO-01.

## Rules
- Do not claim production readiness if a required check was not performed; list what was skipped.
- **Never push, merge, tag, deploy or change DNS without explicit written authorisation.** Approval for one release does not cover the next.
- Staging: synthetic data only, `noindex`, basic-auth in front.

## Pre-launch checklist (each with evidence)
- [ ] All launch-blocking handover items received (items 22–25, 5, 6, 10, 15 or an agreed “no issue yet” page, 27) and decisions D-27, D-28, D-02, D-03, D-13, D-18 recorded.
- [ ] All P0 tests pass; matrix updated; outstanding P0 items listed.
- [ ] Sample data removed (T-CLN-01).
- [ ] Admin accounts created with strong passwords; no defaults; initial provisioning documented.
- [ ] HTTPS and HSTS; security header scan; dependency and secret scans clean.
- [ ] Environment validation fails loudly when config is missing; `RETENTION_DAYS_*` and `MAIL_*` handling confirmed.
- [ ] Backups configured; **restore drill passed** on a clean environment (T-BCK-01); RPO/RTO confirmed by the owner.
- [ ] Error monitoring receives a test event; logs contain no PII.
- [ ] Privacy and consent wording live and versioned; policy pages approved (no draft banners).
- [ ] `sitemap.xml`, `robots.txt`, `/admin` noindex verified.
- [ ] Rollback instructions written and tried on staging.
- [ ] Editor training done; credentials and ownership handed to the authorised UJAAS representative.
- [ ] Owner sign-off recorded.

## Final report must contain
Files changed, features completed, DB/API changes, real test counts, build and lint results, verified routes and journeys, unimplemented requirements, known defects, missing owner content/approvals, exact run and deploy instructions.
