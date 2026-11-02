# Skill: submission_privacy

**Use when:** building or changing the public submission form, contact/grievance form, submission inbox, consent or retention handling.
**Sources:** `docs/api-contract.md` (POST /submissions, /contact), `docs/data-model.md` (submissions, submission_events, contact_messages), `docs/security-and-privacy.md` §3, decisions D-01…D-04, D-12, D-02, D-03.
**Tests:** T-SUB-01…06, T-CON-01.

## Rules
- No writer accounts, no public submission dashboard. Receipt = confirmation screen with a random reference ID (`UJ-` + 8 random characters; not sequential).
- Core fields only until D-12 is decided. Three **separate** checkboxes: original-work declaration, publication permission, privacy acknowledgement. All must be true.
- Store consent as booleans + `consent_text_version` + time + **hashed** IP/user-agent. The consent wording is **owner/legal text (D-03)**; never write it yourself. The form does not go live without it.
- Retention: build the purge job parameterised by `RETENTION_DAYS_*` and **disabled while unset**. Never choose a number (D-02).
- Validation on both sides. Trim, strip HTML, NFC, length caps (`SUBMISSION_BODY_MAX` setting). Return field-level Hindi messages.
- Spam: honeypot + time-to-submit + rate limit (5/hour/IP, 20/day/email) + duplicate hash (same email + same hash in 30 days → 409 without revealing the existing reference). A honeypot hit returns a fake success and stores nothing.
- No document upload, photo, map embed or contact attachment until D-12/D-04 say so.
- Emails and notifications stay **off** until D-06 (use manual replies).
- Private data (submissions, events, messages, audit, revisions) never appears in a public serializer, log line, error report or URL. Log request IDs only.
- Writer removal requests follow `editorial-workflow.md` §1.2.

## Failure behaviour
Backend down or DB error → 503, nothing partially saved (one transaction), form content kept in the browser for retry. Support `Idempotency-Key`.

## Done when
T-SUB tests pass, a scan of the public API proves no private field is exposed, and a log sample contains no submission text.
