# UJAAS — Open Decisions and Working Assumptions

Used while a decision in [owner-decision-register.md](./owner-decision-register.md) is open. In code or docs mark each use as `ASSUMPTION D-xx` so it can be found later (`grep -r "ASSUMPTION D-"`). An assumption is not an answer.

| ID | Assumption used until decided | Risk if wrong | Decision owner |
|---|---|---|---|
| D-01 | Confirmation screen with a random reference ID (`UJ-` + 8 random characters). No later updates to writers | Writers get no status update | Owner |
| D-02 | **No retention period.** Purge job is built, parameterised by `RETENTION_DAYS_*`, and **disabled while unset** | Legal and privacy exposure | Owner / Legal |
| D-03 | **No consent or privacy text is written by us.** Form cannot go live; staging shows a clearly marked placeholder slot | Submissions cannot launch | Owner / Legal |
| D-04 | No image upload in the submission form | Scope creep if added | Owner |
| D-05 | Only `site_admin` is enabled; the schema keeps four roles | Permission model rework | Owner |
| D-06 | Email off; replies are manual | No email channel | Owner |
| D-08 | **No PDF**: no upload field shown, no download button, no viewer. Issue model keeps an optional file field | Rework of issue page | Owner |
| D-09 | **Answered by owner instruction (2026-11-02):** palette taken from the design pack; see `docs/design-tokens.md`. Remaining assumption: hex values are measured from AI mockups until the brand sheet arrives | Small token adjustments | Owner |
| D-12 | Core submission fields only; no attachment | Form rework | Owner |
| D-16 | Frequency stored as issue/series metadata; copy never states a frequency | Wrong copy | Owner |
| D-19 | ISSN hidden unless supplied | — | Owner |
| D-23 | No membership button | Header rework | Owner |
| D-24 | No newsletter box | Footer rework | Owner |
| D-25 | No registration, competitions or Zoom. `/gatividhiyan` is a P1 informational page; nav link shown only when a published page has content | Home and nav rework | Owner |
| D-26 | Mobile and tablet layouts derived from desktop and put to the owner at 390 and 768 px before content load | Responsive rework | Owner |
| D-27 | Plain text wordmark marked `DEV`; no logo file, no favicon from the mockups | Branding rework | Owner |
| D-28 | Editor name written "विनय मिश्र" only inside owner-supplied content; no mockup photo reused | Wrong name or image on site | Owner |
| D-29 | Nav as in `sitemap.md` (client's list); `गतिविधियाँ` hidden per D-25 | Header rework | Owner |
| D-30 | No counters or "लोकप्रिय" lists | Home rework | Owner |
| D-31 | Mockup structure and brand win; each taste collision logged as an exception | Late visual rework | Owner |
| D-10, D-11, D-13, D-14, D-15, D-17, D-18, D-20, D-21, D-22 | **Not defined in the repo.** No assumption can be made | Unknown. D-13 and D-18 are listed as launch-blocking | Owner |

## Content the agent will never invent (reminder)
Legal text, retention days, consent wording, contact details, ISSN, Editor-in-Chief biography or message, author lists, article text, statistics, dates, quotes.
