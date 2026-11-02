# Skill: public_site_build

**Use when:** building or changing public pages.
**Sources:** `docs/sitemap.md`, `docs/user-flows.md` (F1–F10, E1–E8), `docs/requirements.md` FR-001…FR-017.
**Tests:** T-NAV-01…03, T-HOME-01, T-CARD-01, T-CAT-01, T-READ-01/02, T-AUTH-01, T-COL-01, T-SRCH-01…03, T-STA-01.

## Rules
- Build only routes listed in `sitemap.md`. Every visible link has a real destination; no `href="#"`, no decorative buttons.
- Content comes from the data source. No permanent hardcoded listings or fake cards. A section with no data is **hidden** (home) or shows an honest empty state (category).
- Header order: logo → हमारे बारे में · ई-पत्रिका · साहित्य · विचार · रचनाकार · गतिविधियाँ · अपनी रचना भेजें · संपर्क, search, one CTA. Breadcrumbs on all inner pages. Footer carries the 5 policy links and hides contact/social items until the owner supplies them.
- Detail pages show the full text, authors as links to profiles, date, category, share links (plain links, no tracking SDKs). Canonical for an article inside an issue is `/rachna/[slug]`.
- Unpublished or unknown slugs return a real **404** with search and category links. Renamed slugs 301.
- States on every data view: loading (skeleton, no layout shift), empty, error with retry. One failing home section must not blank the page.
- Public reads use the single published-only query helper (see `editorial_workflow`).
- Out of scope unless approved: membership button, newsletter box, registration, popularity counters, comments, reader login.

## Taste-skill additions (`taste_house_rules`, `taste_gate`)
- Argument first: each page section states a claim and is backed by real data. A section without a claim or without data is removed or hidden.
- First screen: one `h1`, a headline of at most two lines (tested with real Hindi at 390 px), one supporting sentence, and the primary action. The client lists three hero buttons (A §6); report that as a rule-19 conflict instead of choosing.
- Every section has a heading; equal outer margins; sections 120–240 px apart on desktop; no blank stretch over about half a screen. Empty states stay compact and give links.
- Copy is owner-supplied. Any sample line is labelled `DEV DATA` and listed for confirmation. Never invent proof (customers, quotes, reviews, press, statistics).
- Semantics: real links and buttons, visible focus, accessible names, alt text.
- Run `taste_gate` on each finished page type.

## Done when
A link crawl of the built site finds no broken or placeholder links (output shown), and the listed tests pass at 390 / 1366 / 1920 px.
