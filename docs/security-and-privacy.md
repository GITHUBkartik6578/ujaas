# UJAAS — Security and Privacy

**Status:** Draft for owner review. Controls follow `security_review`; each needs evidence in Phase 2. **Pending owner/legal:** D-02 retention, D-03 consent and privacy wording. We do not write them.

## 1. Threat summary
Admin account takeover · unpublished or private data exposure · malicious uploads · spam and abuse of public forms · XSS through rich text · injection through query parameters (including NoSQL operators) · secret leakage · loss of data.

## 2. Controls (checklist; each line gets a test, scan or config excerpt)
| Area | Control | Test |
|---|---|---|
| Passwords | Argon2id (or bcrypt cost ≥ 12), min 12 chars, common-password check | T-ADM-01 |
| Login | generic error; lock 5 failures for 15 min; limit 5/15 min per IP+email | T-ADM-01 |
| Sessions | server-side store in MongoDB; HttpOnly + Secure + SameSite=Lax; 8 h idle, 24 h absolute; rotate on login; destroy on logout and password change | T-ADM-02 |
| CSRF | token on every non-GET admin call; origin check on public POSTs | T-SEC-01 |
| Authorisation | server-side, deny by default, role × route tests; no IDOR on submissions | T-ADM-03, T-ADM-04 |
| Input | schema validation (Zod) on every body and query; reject object operators (`$ne`, `$gt`) in query values; length caps; NFC; rich text allow-list sanitiser | T-SEC-02 |
| CSP and headers | `default-src 'self'` with explicit font/image sources; no inline scripts; HSTS, nosniff, Referrer-Policy, Permissions-Policy, `frame-ancestors 'none'` | T-SEC-01 |
| Rate limits | per API contract §1.3 | T-SUB-03 |
| Uploads | JPEG/PNG/WebP ≤ 5 MB, magic bytes, SVG rejected, re-encode, random keys, separate static path, no execute | T-MED-01 |
| Secrets | env only; `.env.example` names only; secret scanning in CI; nothing in git history | T-SEC-02 |
| Logging | structured, request ID, hashed IPs, no PII, no submission text | T-SEC-02 |
| Dependencies | lockfile, `npm audit` in CI, no unpinned CDN scripts, no third-party requests on page load | T-SEC-02 |
| Admin provisioning | one-time command or setup link; no default credentials | T-ADM-01 |
| 2FA | TOTP for `site_admin` and `editor_in_chief` (P1) | — |

## 3. Submissions, contact and consent (privacy)
- **No writer accounts.** Receipt is a confirmation screen with a random reference ID (D-01 assumption).
- **Collected (core only, D-12):** display name, optional pen name, email, title, type, text, optional description, three separate consents. No attachments, no photo (D-04).
- **Consent record:** the three booleans, `consent_text_version`, timestamp, **hashed** IP and user-agent. The wording is owner/legal text (D-03) and stored in `consent_texts` with version. The form does not go live without it.
- **Retention:** purge job parameterised by `RETENTION_DAYS_SUBMISSIONS`, `RETENTION_DAYS_CONTACT`, `RETENTION_DAYS_LOGS`; **disabled while unset**. No number is chosen by us (D-02).
- **Private data** (submissions, events, messages, audit, revisions, rights notes) never appears in a public serializer, log line, error report, URL or sitemap. Logs carry request IDs only.
- **Spam:** honeypot (fake success, nothing stored), time-to-submit, rate limit, duplicate hash (409 without revealing the existing reference).
- **Failure:** DB or backend error → 503 and nothing partially saved (one transaction); form content kept in the browser for retry; `Idempotency-Key` supported.
- **Writer removal and correction requests:** `editorial-workflow.md` §1.2.
- **Emails** off until D-06.
- **Policy pages:** carry a visible draft banner and stay unlinked from the footer until legal text is approved (`legal_approved_at`).

### 3a. Implemented in Phase 2 (evidence in `test-plan.md` section 2d)
Form closed without owner consent text; three separate consents stored with the text version, time and salted hashes of IP and user agent (never raw); honeypot and time-to-submit answer with a fake success and store nothing; duplicate check (30 days, no reference revealed); 5 an hour per address and 20 a day per email; idempotency key; one transaction per submission and a 503 on any storage failure; no body, title, name or email in any log line (tested by capturing output); the receipt reference is kept in session storage, not in the address; the inbox is editors and above, every view writes an audit row, and the list shows no body or email. The purge job is scheduled daily and does nothing while `RETENTION_DAYS_*` are unset (D-02).

## 4. Data classification
| Class | Examples | Exposure |
|---|---|---|
| Public | published content, public authors, issues | public API allow-list |
| Private | submissions, contact messages, notes, rights notes, revisions, audit, sessions | admin only, role checked |
| Secret | passwords, session secrets, DB URL, TOTP secrets | environment / encrypted at rest |

## 5. Operations
HTTPS only in staging and production; error monitoring with a test event; backups and restore drill (`deployment.md`); `RETENTION_*` and `MAIL_*` handling confirmed before launch; staging `noindex` with basic-auth and synthetic data.

## 6. Open items
Retention periods (D-02), consent and privacy wording (D-03), RPO/RTO (owner), error-monitoring vendor, hosting region and data-residency preference.
