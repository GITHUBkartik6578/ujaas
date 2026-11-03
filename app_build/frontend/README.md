# UJAAS frontend

Next.js (App Router) + React + TypeScript. Server-rendered; `lang="hi"`.

## What exists (foundation)
- `src/styles/tokens.css` the only place hex colours live (palette: `docs/design-tokens.md`); a test enforces it
- `src/app/layout.tsx` shell with a `DEV` wordmark (D-27), skip link, self-hosted Noto Serif/Sans Devanagari (OFL-1.1, `font-display: swap`)
- `src/app/page.tsx` name and tagline only; `not-found.tsx` (real 404); `error.tsx` (retry)
- `src/proxy.ts` per-request CSP with nonce
- `next.config.ts` `/api` and `/media` rewrites to the Express API (`API_URL`), security headers

Navigation, footer and real pages are added only when their routes exist (no dead links).

## Commands
`npm run dev` · `npm run build` · `npm run start` · `npm run lint` · `npm run typecheck` · `npm test`
