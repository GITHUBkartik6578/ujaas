# Skill: seo_a11y_perf

**Use when:** finishing any public page, and in the hardening phase.
**Sources:** `docs/requirements.md` NFR-002…NFR-005, `docs/test-plan.md`.
**Tests:** T-SEO-01/02, T-A11Y-01, T-PERF-01, T-RES-01.

## SEO
- Server-rendered pages. Unique `<title>`, description and canonical per page; Open Graph tags; JSON-LD (`Article`, `Person`, `PublicationIssue`) validated.
- `sitemap.xml` lists only published public URLs; `robots.txt` blocks `/admin`; admin pages `noindex`; staging `noindex`.
- Human-readable stable slugs; 301 on rename; 404 status for missing pages (no soft 404).
- Do not claim search-engine visibility: check it after launch with Search Console (T-SEO-02).

## Accessibility (WCAG 2.2 AA target)
- Visible focus, keyboard-only use of header, search, submit form, carousels, accordions, drag-and-drop reordering (provide up/down buttons).
- Contrast at least AA, **measured** on text over photos (not yet measured for the mockups).
- Alt text for informative images, empty alt for decorative; image credits readable.
- Semantic headings, landmarks, form labels and error messages tied to fields; `lang="hi"`.
- Motion: no heavy animation; respect reduced-motion. Carousels need pause and keyboard controls.

## Responsive and performance
- Check **390, 768, 1366 and 1920 px**: no horizontal scroll, Hindi text does not overflow, readable measure (about 60–70 characters), essential controls visible.
- Performance budget: LCP ≤ 2.5 s on a mid-range phone over 4G for article pages, low layout shift, subset Devanagari fonts, optimised images.

## Taste gate (see `taste_gate`)
- `inspect.mjs` runs at 1440, 768 and 390 px on the production build; keep our own 1366 and 1920 px checks as well.
- Headlines at most two lines at every width, equal margins, no blank stretch, an `h1` on the first screen, a heading on every section.
- Accessible names for links and buttons; visible focus; alt text. Treat every inspector WARN as wrong unless a defence is written down.

## Done when
axe, Lighthouse and viewport screenshots are attached for home, article, issue and submit pages, with measured numbers.
