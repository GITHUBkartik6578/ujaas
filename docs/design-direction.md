# UJAAS — Design Direction (taste_design_run report)

**Status:** Draft for owner review · **Date:** 2026-11-02 · **Skill:** `design-taste-frontend` (installed copy under `.agents/.skills/`), run with `--keep palette,type`.
**Evidence:** `.taste-skill/direction-sheet.txt`, `.taste-skill/direction.json`, `.taste-skill/inspect/` (screenshots and `report.json`), `.taste-skill/inspect-run-final.txt`, `.taste-skill/shots/` (all git-ignored; regenerate with the commands in §9).

## 1. Reading of the brief (one line)
Hindi literary magazine and publishing platform: readers browse and read, writers submit through a form (no accounts), one web issue at a time. Required action on the home page: read a creation or submit work. Stack: MERN with Next.js. Brand: client palette (`docs/design-tokens.md`), six logo candidates, none chosen. Imagery: none supplied.

## 2. Inventory of what is UJAAS's own (from the documents only)
1. The name **उजास** (light, glow). 2. The tagline **अपनी बात — अपना मंच**, where **मंच** means *stage*. 3. A web issue of readable articles. 4. Writers submit without accounts and every piece is reviewed. 5. Devanagari reading as the core experience. 6. The ten-odd categories and the magazine section names (owner list pending). 7. Logo motifs in the candidates (diya, open book, sun rays). 8. Maroon, cream and saffron from the client designs. Nothing else is assumed.

## 3. Argument for the home page (claim → proof, real data fields)
| Section | Claim | Proof from data |
|---|---|---|
| First screen | This is the Hindi literary stage; read or send your own | tagline, one sentence, "अपनी रचना भेजें" |
| विशेष रचनाएँ | There is something worth reading now | editor-picked contents: title, type, author, opening lines |
| नवीनतम ई-पत्रिका | A real issue is out | latest published issue: cover, period, intro |
| रचनाकार | Real writers are here | public authors |
| Closing action | Your piece can be here too | the submission route |
Any section with no data is hidden (home rule).

## 4. Direction chosen and why
Dealt three: `uneven-photographs`, `split-stage`, `place-carries-it`. The first and third depend on many pictures; the project has none and may not invent any. **`split-stage`** was chosen because it works with type and colour alone and because the brand's own tagline names it. Seed 1656145512.
Redraws with the `--redraw` command: **none**. Adaptations of dealt blueprints, each with its reason:
| Blueprint | Built as | Reason |
|---|---|---|
| Hero: sticky photograph | Sticky maroon stage with the word मंच and the chosen piece | No owner photographs; frontend_imagery allows type and colour alone |
| Showcase: square photograph plate | Flat blush plate marked `DEV COVER` | Real cover comes from the owner |
| List: scalloped menu sheet | Plain list on a panel | Scallops are decoration; list is the content |
| Gallery: drag row of photographs | Wrapped grid of text modules for authors | No photographs; the inspector warned that sideways rows read as clipped |
| CTA: last photograph | Flat maroon field | No photographs |
| Footer: a single quiet line | Client's maroon footer, currently name and tagline only | Client design; policy links, contact and social must appear once approved or supplied (public_site_build) |

## 5. The idea (competitor test passed)
> On this page, **"अपना मंच" (our stage), the tagline's own word,** becomes **the fixed half-screen stage** that stays in view while the reading column scrolls and shows the piece the reader is pointing at.

Nearest competitors (Hindwi, Rekhta) have no stage in their name or taglines; the sentence stops working for them.
**Live thing:** hovering, focusing or tapping a piece in the list puts its title, opening lines and author on the stage. Fallback without script or on a phone: each entry shows its own opening lines inline and the stage shows the first piece. Works from the keyboard (titles are real buttons inside headings).

## 6. Words (copy deck)
Fixed by the brief: the name and the tagline. Everything else is **DEV DATA** to be replaced: the sentence "हिंदी साहित्य का मंच: पढ़िए, लिखिए और भेजिए।", all titles, names and lines in `src/fixtures/dev-home.ts`, the closing paragraph under "आपकी रचना, हमारे पाठकों तक", and the section headings. The closing paragraph states the review rule from the spec ("हर रचना संपादकीय समीक्षा के बाद ही प्रकाशित होती है"). **Hindi proofreading gate not done:** every string needs a proofreader before release. Headline: two lines at 390, 768 and 1440 px (measured).

## 7. Gate results (`taste_gate`)
Commands: `lint.mjs app_build/frontend/src` → **0 FAIL, 0 WARN**. `inspect.mjs http://localhost:3000/` on the production build at 1440, 768, 390 px, four runs (the rule says three rounds; the extra run is disclosed). Final: **1 FAIL, 4 WARN**.

| Finding | Status | Defence or plan |
|---|---|---|
| `few-pictures` FAIL (0 pictures) | **Recorded exception** | No owner pictures exist; frontend_imagery says the four-picture floor is not enforced until they do and forbids padding with stock or AI faces. Found pictures need the owner's approval per picture. Owner decision: D-28 and imagery supply |
| `palette-cream` WARN | Recorded exception | Client palette, taste rule 12, D-09 (answered by owner instruction), D-31 |
| `no-footage` WARN | Defended | No honest clip exists; none supplied |
| `mixed-font-headline` @390, 6 headings | **Open** | Not identified; suspected the two-face pairing (serif title, sans meta) or the em dash. Investigate before the next page |
| `blank-gap` @390, 364 px at y 1620 | **Open** | Phone section gaps are 120 px; target 72–112 px. Fix in the next phase |
Fixed during the rounds: eyebrow above a heading, text at the screen edge, unequal margins, a CTA button that rendered maroon on maroon (CSS order), a reveal that left the page blank in capture, a sideways-scrolling row, still page (motion now meets the inspector minimum with a 16 px rise).
Taste rules logged as exceptions or open: 12 (palette), 19 (one primary action: one button on the first screen plus the header link; owner A§6 lists three), 20 (seven header links, D-29). Rules 6, 8, 10, 11, 14: not built (no eyebrows, numbering, gradients, resting shadows or icon tiles).
Not run: `scenes.mjs` (no scroll scenes), reduced-motion and scripts-off screenshots, axe, Lighthouse, 1366 and 1920 px inspector (own screenshots only; see §9).

## 8. Critique (references/critique.md format)
- Pass 1–2: one thing wins the first second: the saffron **मंच** on maroon; the h1 and the button answer "what is this, what do I do". Two large masses (sheet, stage).
- Pass 3, 14: tagline-as-stage passes the competitor test. The idea reaches the showcase and closing action only weakly (they are conventional blocks).
- Pass 5: stage on desktop has a large empty maroon stretch between the word and the piece (deliberate rest, one per page).
- Pass 7: maroon holds the stage, closing action and footer; saffron appears once (the word). Accent proportion is sound.
- Pass 8: **zero pictures**; the page is type and colour only.
- Pass 9: sections are split, panel, split, grid, full-bleed field.
- Pass 10: phone is a composition of its own (stage first, titles with inline lines).
- Pass 11–12: content is sample text; the page looks like a finished layout with placeholder substance.
Scores: design 6, usability 7, creativity 7, content 4 (placeholders cap content at 5). Arithmetic 6.3; **the remaining FAIL caps overall at 6.0**. Top three problems: no real pictures or owner content; the stage's empty middle; phone section gaps.

## 9. Review it yourself
```bash
cd app_build/frontend
NEXT_PUBLIC_DESIGN_REVIEW=1 npm run build && npm start      # design review shows unbuilt links as dotted text
node ../../.agents/.skills/.agents/skills/design-taste-frontend/scripts/inspect.mjs http://localhost:3000/
```
Production builds (without the variable) show only built routes, so no dead links ship.

## 10. Needs the owner (D-26)
Approve or change: the direction (split stage), the 390 px and 768 px screens (`.taste-skill/inspect/mobile-*.jpg`, `tablet-*.jpg`), keeping the maroon stage in place of photographs, and whether pictures should be sourced from open collections (each needs approval, credit and licence). The logo (D-27) is still a text wordmark marked `DEV`.

## 11. Public site pages gate (2026-11-02)
Page types inspected on the production build with DEV DATA: reading page (`/rachna/[slug]`), literature list, authors list, search results, home. `lint.mjs`: 0 FAIL, 0 WARN across 29 files.
Inspector results (1440/768/390 px): home 1 FAIL; list, search and reading pages 3 FAIL each. **Recorded exceptions, with reason and owner decision:**
| Rule | Pages | Reason |
|---|---|---|
| `few-pictures` (FAIL) | all | No owner pictures exist; the floor is not enforced until they do (frontend_imagery). One DEV cover is a flat colour field |
| `still-page` (FAIL) | reading page | Reading text must not animate (motion_restraint, DR-05). List and search pages animate their cards (6 elements, below the inspector minimum of 8) |
| `focal-point` (FAIL) | reading, list, search | Utility pages have a 55 px h1 and no dominant picture by design; a larger h1 would risk three-line Hindi titles, which the headline rule forbids |
| `hero-void` (WARN) | reading page | The sample poem is three lines; real poems fill the column. The page already uses a two-column reading layout |
| `palette-cream`, `no-footage` (WARN) | all | Client palette (D-09, D-31 rule 12); no honest clip |
| `mixed-font-headline` @390 (WARN) | all | Open: one block pairing the serif wordmark and the `DEV` flag is the likely cause; not confirmed |
Fixed during this phase: broken image (DEV seed now writes real image files), name-only titles (one-line description under each list h1), a missing first-screen action is not an issue on these pages. Not run: scenes, axe, Lighthouse, 1366 and 1920 px inspector, reduced-motion and scripts-off screenshots, Hindi proofreading.

## 13. Writer, contact and inbox screens (2026-11-02)
Public forms (`/rachna-bhejein`, `/sampark`) were inspected at 1440, 768 and 390 px with the form open: 3 FAIL, 4 WARN, the same exceptions as the other utility pages (section 11: no pictures, no motion on a form, no dominant first-screen element) plus `hero-void` (a 44rem form column leaves the right side empty; a narrow form is deliberate for usability, and the contact page fills it with contact details only when the owner has entered them). `lint.mjs`: 0 FAIL, 0 WARN. Admin inbox screens follow section 12 (app screen) and were checked in the browser, not by the inspector (login-gated). Screenshots: `.taste-skill/e2e/` (`submit-1366`, `submit-390`, `receipt-1366`, `submission-detail-1366`, `submissions-390`).

## 12. Admin screens (2026-11-02)
Built as an app screen under `references/app-screens.md`: sidebar on the page ground (not coloured), noun titles at 24 px, quiet 1px borders and row rules, no zebra or header band, one filled primary per screen (maroon), status as a pale tint plus the word, counts as large figures not tiles, honest empty, loading and error states, destructive actions behind a confirmation. `lint.mjs`: 0 FAIL, 0 WARN, with `taste-skill-ignore` comments on the allowed 1px borders and the dialog shadow. `inspect.mjs --app` was **not run** (login-gated). Screenshots: `.taste-skill/e2e/` (dashboard and editor at 1366, list and editor at 390). Found by looking at the screenshots: Hindi words broke letter by letter in narrow table cells at 390 px; fixed by stacking table rows on phones. Not yet checked: pill contrast beyond the ratios in `design-tokens.md`, keyboard-only use, 768 px.
