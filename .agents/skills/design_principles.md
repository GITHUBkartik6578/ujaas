# Skill: design_principles

**Use when:** any UI or visual work.
**Companions:** `taste_design_run`, `taste_house_rules`, `taste_gate`, `frontend_imagery`, `motion_restraint`, `hindi_content`, `seo_a11y_perf`.
**Sources:** client documents A/B/C (as in `UJAAS_PageWise_Guide.pdf`), `docs/reference-audit.md` §7, `docs/requirements.md` §3, decisions D-09, D-23…D-27, D-30; taste skill `design-taste-frontend`.

## Order of authority
1. Owner decisions (D-09 palette and versions, D-26 mobile, D-27 logo, D-23/D-24/D-25/D-30 exclusions) and the approved scope.
2. The client brief and brand (documents A/B/C).
3. Taste skill rules (craft: type, space, fullness, copy, imagery, motion, gate).
4. Client mockups: **reference, not specification** (desktop only, AI-generated, placeholder content, some taste "tells").
If two layers disagree, the higher one wins and the conflict is reported to the owner (`taste_house_rules` lists them; the open question is **D-31**). Do not resolve a conflict silently in code.

## Direction (from the client)
Premium, literary, warm; a contemporary literary institution, **not** a blog or news portal; not commercial or cluttered; no heavy animation; comfortable reading; its own original look (do not copy Hindwi or any reference).

## Tokens (measured from the mockups; palette still to be confirmed in D-09)
cream `#FDF9F3` · maroon `#620206` · blush `#F4E2D1` · sand `#CEB194` · dark brown `#362815` · copper `#925D43` · rust `#793423` · saffron `#F5BF89`. No green. Define once as design tokens (CSS custom properties); never scatter hex values.
Proposed roles for design review (not approved): ground cream, ink dark brown, accent maroon, tone steps blush and sand. Rust, copper and saffron are brand colours that the taste skill's palette rule flags, so they are an owner-confirmed brand exception (`taste_house_rules` #12).

## What the mockups show, and how to treat it
| Mockup device | Treatment |
|---|---|
| Full-bleed photo hero with paper-note quote card | Keep only with owner-supplied imagery; quote as `<blockquote>` |
| Icon-tile row for genres, 4-up identical cards | Taste conflict (#14). Owner decides; until then use the simplest list of categories |
| Gradients, soft card shadows, ❖ ornaments, kicker lines, genre chips | Taste conflicts (#6, #9, #10, #11). Do not build by default; flag |
| 4-step "01–04" process on Submit | Real `<ol>` instead of decorative numbers (#8) |
| Maroon 4-column footer, breadcrumbs, filter chips, year dropdown | Keep (footer as designed close) |
| Carousels | Allowed with pause and keyboard control (`motion_restraint`) |

## Do not build (not in scope or not approved)
"सदस्यता जुड़ें" button (D-23) · newsletter box (D-24) · activity registration, competitions, Zoom (D-25) · reader counters and "लोकप्रिय" rankings (D-30) · Google Map and contact attachments · statistics such as "50K+ पाठक" · real-person portraits or AI faces · mockup hero or message text.

## Rules
- Mockups are desktop only (724–1400 px). Phone and tablet layouts are an open decision (D-26): derive from desktop and put 390 and 768 px up for owner approval before loading content.
- Logo: six candidates, none chosen, no vector file (D-27). Use a plain text wordmark in development, marked `DEV`, until supplied.
- Use the neutral avatar of Home v3 in development, never faces or names.
- Reading pages: body ≥ 18 px, about 60–70 characters per line, clear Devanagari typography, leading checked on real Hindi, two typefaces at most.
- Mockup copy is placeholder text; do not paste it into pages (`content_safety`).
- Restrained motion (`motion_restraint`).

## Done when
Screens at 390 / 768 / 1366 / 1920 px use the tokens, show none of the excluded items, pass `taste_gate` (or list recorded exceptions), and are approved by the owner at the staging checkpoint.
