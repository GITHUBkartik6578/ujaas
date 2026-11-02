# Skill: hindi_content

**Use when:** any Hindi text is stored, searched, displayed, seeded or typed into the UI.
**Sources:** `docs/requirements.md` NFR-001, NFR-012; `docs/data-model.md` §4; `docs/reference-audit.md` §7 (M-17).
**Tests:** T-HI-01, T-HI-02, T-SRCH-02, T-READ-02.

## Rules
- Store text as Unicode **NFC**. Reject control characters except newline and tab. Keep ZWJ/ZWNJ where they change shaping.
- Verse keeps its line breaks; prose is paragraphs. Never collapse a poem into one line.
- Search uses a normaliser on both index and query: NFC, whitespace collapse, punctuation removal (।, ॥, quotes), chandrabindu/anusvara folding, nukta folding in a secondary field (ग़ → ग). A set of at least 30 Hindi queries is part of the test plan; do not claim search quality without running it.
- Fonts: self-hosted, licence-checked, full Devanagari coverage, subsetted, `font-display: swap`. Headings must not clip matras or conjuncts. Names come from the design spike (not decided yet).
- Set `lang="hi"` on pages; keep Latin brand strings in their own spans.
- Every UI string and seeded page text goes through a **Hindi proofreading gate** before release. The mockups contain typos (“ई-प्रत्रिका”, “अपती बात”); never copy mockup text.
- Spelling of the Editor-in-Chief is “विनय मिश्र” (client documents) until the owner confirms otherwise (D-28).
- Check long Hindi strings for overflow at 390 px; test copy-paste preserves text.

## Copy and type rules from the taste skill, checked for Hindi
- Headline at most two lines at every width: measure real Hindi at 390 px (the Latin "about 32 characters" estimate does not apply).
- One supporting sentence under the headline; five type sizes at most; two typefaces at most.
- Negative tracking and very tight leading (taste values for Latin display type) are **not** applied to Devanagari until tested on real conjuncts and matras.

## Done when
Screenshots at 390 / 1366 / 1920 px show no tofu or clipped conjuncts, the search relevance set runs with output shown, and the proofreading sign-off is recorded.
