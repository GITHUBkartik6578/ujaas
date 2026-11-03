# UJAAS backend

Express + TypeScript + MongoDB (Mongoose). See `docs/decisions/0001-technology-stack.md`.

## What exists (foundation)
- `src/config/env.ts` validated configuration (fails loudly; retention unset means purge disabled, D-02)
- `src/models/*` all collections from `docs/data-model.md` (one explicit-interface workaround for Mongoose 9 typing)
- `src/lib/*` Hindi normaliser, sanitisers, Argon2id passwords, salted hashes, workflow transition tables, published-only filter
- `src/middleware/*` request IDs, security headers, origin check, CSRF, rate limiters, session auth, role checks (roles enabled by `ENABLED_ROLES`, D-05)
- `src/routes/auth.ts` login (generic error, lockout), `/me`, logout, change-password
- `src/routes/media.ts` image upload (magic bytes, re-encode, EXIF strip, random keys) and metadata
- `src/jobs/retention.ts` purge job, disabled while `RETENTION_DAYS_*` unset
- `src/db/migrate.ts` versioned migrations; `scripts/create-admin.ts` one-time admin; `scripts/dev-db.ts` local replica set

Not built yet: content, submissions, issues, search and public endpoints (later phases).

## Commands
`npm run dev` · `npm test` · `npm run lint` · `npm run typecheck` · `npm run build` · `npm run create-admin`
Tests need `MONGOMS_SYSTEM_BINARY` (path to a local mongod) or a network download.

## Notes
- `mongoose.set('sanitizeFilter', true)` is on; internal operators must be wrapped in `mongoose.trusted()`.
- Rate limiters use an in-memory store (ASSUMPTION: one API instance).
- Email is off (D-06): no `MAIL_*` variables.
