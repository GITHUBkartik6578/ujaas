# Skill: taste_house_rules

**Use when:** reviewing or building any public-facing UI, and before accepting a mockup layout.
**Source of the rules:** `design-taste-frontend` (taste skill v2, `Leonxlnx/taste-skill`, `skills/taste-skill/SKILL.md`; hash in `.agents/.skills/skills-lock.json` on GitHub). The table below was written from a **condensed read** of that file, not the verbatim file. Re-check against the installed `SKILL.md` and `references/tells.md` before relying on an exact wording.

## Order of authority (see `design_principles`)
Owner decisions and approved scope → client brief and brand → these taste rules → client mockups (reference only). Taste rules improve craft; they **never override** the client's palette, logo, required pages, or an owner decision. Where they collide, mark it, tell the owner, and keep the higher authority until the owner answers.

## Status key
**ADOPT** apply as is · **ADAPT** apply with the UJAAS change shown · **CONFLICT** collides with the client mockups or brief → owner confirmation needed (the mockup/brief stays until then).

## House rules
| # | Taste rule | UJAAS status | Note |
|---|---|---|---|
| 1 | Headlines at most two lines at every width | ADAPT | The "about 32 characters" estimate is for Latin. Test real Hindi headlines at 390 px |
| 2 | One clear `h1` on the first screen; a heading on every section | ADOPT | Also an accessibility rule |
| 3 | Equal outer margins; nothing huddled to one side | ADOPT | |
| 4 | No blank stretch longer than about half a screen | ADAPT | Empty categories and "no issue yet" need a compact honest state with links, not a void |
| 5 | Statements are `<p>`/`<blockquote>`, ≤ 36 px desktop / 24 px phone, ~25 words | ADOPT | Quote cards in the mockups become blockquotes |
| 6 | No eyebrows or pill badges above headings | **CONFLICT** | Mockups use kicker lines above hero titles and genre chips on cards. Category shown as plain text in the card body is the alternative |
| 7 | No monospace outside code | ADOPT | |
| 8 | No index numbering ("01", "Step 2") | **CONFLICT** | Submit mockup shows a 4-step "01–04" process and numbered rankings. Use a real `<ol>` |
| 9 | No thin rules, hairlines, grid lines | ADAPT | The ❖ ornament dividers in the mockups are decoration; use space and tone steps |
| 10 | No gradients (except a neutral scrim on photos) | **CONFLICT** | Mockup hero overlays and maroon bands use gradients |
| 11 | No shadows at rest, no glows | **CONFLICT** | Mockup cards carry soft shadows. Shadows only for menus and dialogs |
| 12 | No yellow-cream / terracotta / rust, violet or indigo palettes | **CONFLICT** | The client palette contains rust `#793423`, copper `#925D43` and saffron `#F5BF89`. Existing brand ⇒ keep it (`--keep palette,type`) and record the exception for that rule only (D-09) |
| 13 | No tiny tracked uppercase labels | ADOPT | Mostly moot in Devanagari; applies to Latin labels |
| 14 | No icon-topped feature cards or identical card rows | **CONFLICT** | Mockups use icon-tile rows for genres and 4-up identical cards. The taste skill deals a blueprint instead |
| 15 | No glass, backdrop blur, floating pill nav | ADOPT | Mockup nav is already a plain bar |
| 16 | No emoji, blobs, decorative shapes, fake dashboards | ADAPT | Leaf/flower decoration in the mockups is photography-style decoration; keep only owner-approved imagery |
| 17 | No styled accent word in headlines | ADOPT | |
| 18 | At most two typefaces (usually one) | ADOPT | Fonts still to be chosen; Devanagari coverage first |
| 19 | One primary action on the first screen | **CONFLICT** | Client doc A §6 lists three hero buttons (रचनाएँ पढ़ें · अपनी रचना भेजें · ई-पत्रिका पढ़ें) |
| 20 | Navigation: wordmark, 3–5 links, one action | **CONFLICT** | Mockup nav has 8 links plus a CTA (D-29) |
| 21 | Motion required; inspector fails a page that moves fewer than 8 elements | ADAPT | Client: no unnecessary animation. See `motion_restraint` |
| 22 | Never invent proof (customers, quotes, reviews, press, logos, statistics) | ADOPT | Same as `content_safety`; the mockup's "50K+ पाठक" is exactly this |
| 23 | At least four real pictures | ADAPT | Only owner-supplied or approved images; type and colour alone is an accepted fallback. See `frontend_imagery` |
| 24 | Dark mode protocol | Not required | No dark theme in the brief |

## Laws of the craft (condensed) and Devanagari cautions
- Type: two or three working sizes, five at most; body 16–20 px, leading 1.45–1.6, 45–75 characters per line. **UJAAS:** body ≥ 18 px, about 60–70 characters, and verify leading on real Hindi (matras above and below the line need more room than Latin).
- Display tracking of −0.02 to −0.05 em and leading 0.85–1.05 come from Latin studies. **Do not apply them to Devanagari without testing**: tight tracking can break conjunct shaping and tight leading can clip matras. This is a UJAAS caution, not a statement from the taste skill.
- Space: one grid, outer margins 16–32 px, sections 120–240 px apart on desktop, neighbouring sections differ.
- Colour: one ground, one ink, one accent; separate surfaces with tone steps, not lines or shadows.
- Imagery: one dominant image beats several small ones; consistent crops; nothing overlays a headline.
- Components: flat buttons, one fill, shape decided once; the footer is a designed close.

## Open conflict list for the owner
Rules 6, 8, 10, 11, 12, 14, 19, 20 (and 21 if the motion minimum cannot be met subtly). They are recorded as **D-31** (P2) in `docs/decisions/owner-decision-register.md`, to be answered together with D-09. Until the owner answers, the mockup/brief wins and each collision is logged as an exception.

## Done when
Every UI review lists each rule as pass, fail, or "conflict — owner informed", with screenshots.
