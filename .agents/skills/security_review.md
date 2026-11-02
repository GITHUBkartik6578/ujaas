# Skill: security_review

**Use when:** touching authentication, sessions, forms, uploads, headers, config, logging or dependencies.
**Sources:** `docs/security-and-privacy.md`, `docs/api-contract.md` §1, §3.
**Tests:** T-ADM-01…03, T-SEC-01/02, T-SUB-03/05, T-MED-01.

## Checklist (every item needs evidence)
- Passwords: Argon2id (or bcrypt cost ≥ 12), min length 12, common-password check. If the chosen CMS has built-in auth, verify each control below against it; gaps are fixed in code or the stack is rejected.
- Login: generic error, lockout after 5 failures for 15 minutes, rate limit 5/15 min per IP+email.
- Sessions: HttpOnly + Secure + SameSite=Lax cookie, server-side store, 8 h idle / 24 h absolute, rotated on login, killed on logout/password change.
- CSRF token on every non-GET admin call; origin check on public POSTs.
- Authorisation: server-side, deny by default, role × route tests; no IDOR on submissions.
- Input: schema validation on every body and query, length caps, NFC; sanitise rich text with an allow-list; CSP `default-src 'self'` with explicit font/image sources; no inline scripts.
- Rate limits as listed in the API contract (search 30/min, submissions 5/hour/IP, general public 120/min).
- Headers: HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, `frame-ancestors 'none'`. HTTPS only.
- Secrets: env only, `.env.example` names only, secret scanning in CI, no credentials in repo history.
- Logging: structured, request ID, no PII, no submission text, hashed IPs. Error monitoring configured.
- Dependencies: lockfile, audit in CI, no unpinned CDN scripts, no third-party requests on page load.
- Optional P1: TOTP 2FA for `site_admin` and `editor_in_chief`.

## Done when
Each checklist line has a test name, scan output or config excerpt. Say plainly which lines could not be checked.
