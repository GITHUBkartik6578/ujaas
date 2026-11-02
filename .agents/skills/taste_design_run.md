# Skill: taste_design_run

**Use when:** starting the visual design of the public site (once per site), and when a new page type needs its own direction.
**Needs:** `design-taste-frontend` installed (it currently exists only in the GitHub copy of this repo, under `.agents/.skills/.agents/skills/design-taste-frontend/`), `references/*.md` and `scripts/*.mjs` from that skill, Node 18+ for lint and Node 22 + Chrome for the inspector. If a tool is missing, say so and do not claim its results.
**Gate:** Phase 2 is authorised and D-09, D-26, D-27 and D-31 are answered (`decision_gate`). Until then this skill is read-only planning.

## The run, adapted to UJAAS
1. **Read the brief and project.** State the reading in one line and get it confirmed. Draft reading (not approved): *Hindi literary magazine and publishing platform; readers browse and read, writers submit through a form; required action: read a creation or submit work; stack: undecided (D-07); brand: client palette, six logo candidates; imagery: none supplied yet.*
2. **Inventory what is unique to UJAAS** (8–12 items), from the documents only: the meaning of "उजास" (light, glow) and its tagline "अपनी बात — अपना मंच"; a quarterly digital issue (monthly possible); the 10 main categories and the 12 magazine section names (काव्य उजास, कथा के रंग, …); Devanagari reading as the core experience; submission without accounts; the editor-in-chief's literary field (ghazal and poetry); logo motifs (diya, open book, rays); the weekly rhythm of poetry, prose, activities, free expression. Add nothing that the owner has not stated.
3. **Write the argument.** For each page list the claim and the proof, using real data fields as proof (for Home: latest issue, editorial picks, featured authors). Delete a section that has no claim or no data. Never fill a proof with invented numbers or quotes.
4. **Draw the direction.** Run `draw.mjs` with `--keep palette,type` (existing brand), the sector and tone values the script accepts (check `--help`; do not guess), `--sections` from `sitemap.md`, `--have` for what exists, `--options 3`. Choose one with the owner or designer, then deal the full sheet. Record every redraw and its reason.
5. **Find the idea.** Fill: "On this page, [something belonging to UJAAS] becomes [the device]." Apply the competitor test. Any "live thing" must use an **in-scope** function (for example search, or reading an issue's contents), work on a phone, and have a no-script fallback. Do not invent features (no accounts, comments, counters).
6. **Write the words.** Copy comes from the owner and editors. Headline at most two lines at every width (test with real Hindi at 390 px), one supporting sentence, one primary action on the first screen (conflict with client A §6: see `taste_house_rules` #19). Sample text is allowed only if labelled `DEV DATA` and listed for confirmation.
7. **Build** (tokens first). Tokens as CSS custom properties; map the client palette to roles, as a **proposal for design review, not approved (D-09)**: ground cream `#FDF9F3`, ink dark brown `#362815`, accent maroon `#620206`, tone steps from blush `#F4E2D1` and sand `#CEB194`; gold and saffron only if the direction uses a second accent. Then hero at desktop and phone, each section from its blueprint, imagery (`frontend_imagery`), the live thing, motion (`motion_restraint`), and semantics (real links, visible focus, alt text, keyboard use).
8. **Gate and look** with `taste_gate`.
9. **Report** the direction (name and seed), redraws with reasons, the idea sentence, the live thing, scores and gaps, credits for any found picture, which images are placeholders, and the sample content to swap.

## Fullness and frame (checks the inspector makes)
No mostly empty desktop screens (at most one deliberate rest); equal margins; no blank stretch over about half a screen; sections 120–240 px apart; one `h1` on the first screen; a heading on every section.

## Existing brand
Brand assets may keep a device the inspector bans, but only by recording the exception for that one rule (`inspect.mjs --allow <rule>` with the rule name it prints). Each exception needs a reason, the page, and the owner decision it relies on (D-31 for taste-rule collisions, D-09 for the palette). Never edit the inspector to silence it.

## Admin and app screens
The admin is an **app screen**, not a page: use the skill's `references/app-screens.md`, `draw.mjs --app` and `inspect.mjs --app`. If the chosen stack supplies its own admin UI, apply this only to custom screens.

## Done when
The owner has approved the direction and the 390 / 768 px screens at the staging checkpoint (D-26), and the gate report is attached.
