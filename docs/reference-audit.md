# UJAAS — Reference Audit

**Status:** Draft for owner review · **Date of research:** 2026-11-02 · **Phase:** 1
**Purpose:** verified findings from the two reference sites and from the client mockups in `designs/UJAAS_HTML_Design_Reference_Pack/`. Nothing here is copied from either site; it records observed behaviour and what UJAAS should adapt.

## 1. Method and limits (read first)

- Pages were read through a **text-extraction fetch** (`WebFetch`) and one web search. No browser session, no clicking, no mobile viewport, no reader opened.
- Therefore: labels, URLs and visible structure are marked **Verified (page text)**. Anything that needs a click, a scroll, a viewport change or the reader is **Unverified**. Nothing was "tested".
- Status values: **Verified (page text)** · **Partially verified** · **Unverified** · **Recommended adaptation**.
- Both sites change often. The Hindwi homepage showed late-October to early-November 2026 content; re-check before quoting.
- A browser-based pass (mobile navigation, Rekhta reader, search behaviour, filters) is listed in §6 as open work.

## 2. Hindwi (https://www.hindwi.org/)

| ID | URL | Observation | Evidence | Status | Relevance to UJAAS |
|---|---|---|---|---|---|
| H-01 | `/` | Primary menu "रचना-निधि": बेला, कवि, कविता, गद्य, ई-पुस्तक, हाशिया, शब्दकोश, संग्रहालय, वीडियो, ब्लॉग, अकादमिक, भाषांतर, अन्य (13 items) | Fetch text, header | Verified (page text) | Too many items for UJAAS; client nav has 8 links (D-29) |
| H-02 | `/` | Home sections in order: promo carousel · बेला (latest articles) · 3 curated collections · theme tags · poet of the day · donation appeal · poetic forms · poem of the day · poets · poems by era · e-books | Fetch text | Verified (page text) | Pattern: home is assembled from curated and latest data blocks. UJAAS adapts: latest issue, editor picks, featured authors; hide any empty block |
| H-03 | `/bela` | Blog-style editorial articles with dates | Fetch text | Partially verified | Maps to UJAAS "विचार" content type |
| H-04 | `/kavita-details/…`, `/sangrahaalay/…` | Named curated collections (संग्रह) with a "full collection" link | Fetch text | Verified (page text) | Maps to curated collections (FR-008) |
| H-05 | `/tags/` | Poems grouped by theme tags | Fetch text | Verified (page text) | Optional topics on content (data model `topics`) |
| H-06 | `/poets` | Poet directory: Devanagari alphabet strip (`?startswith=`), era tabs (आधुनिक, रीतिकाल, भक्तिकाल, आदिकाल), content-form filter (`?contentFilter=`) | Fetch text | Verified (page text) | Adapt: alphabet and content-type filters on the author directory; era tabs only if the owner wants period metadata |
| H-07 | `/poets` | Poet card: portrait or generic quill icon, name, years, birthplace link, short bio, counts of works by type | Fetch text | Verified (page text) | Author card. Photo only when `authors.is_public` (media_uploads) |
| H-08 | `/kavita/<slug>` | Poem page: title, poet link, stanza line breaks kept, source book/editor/publisher/year, tags, share and favourite icons | Fetch text | Partially verified | Detail page shows full text, author link, source metadata. Verse line breaks must be kept (`hindi_content`) |
| H-09 | `/kavita/<slug>` | No breadcrumb, no previous/next poem, no related poems of the same poet (only latest/popular blog posts) | Fetch text; absence inferred from extract | Partially verified | UJAAS adds breadcrumbs (FR-002) and related works (FR-007, P1) |
| H-10 | `/kavita/<slug>` | Login/register prompt and "free pages" counter; comments icon; favourites | Fetch text (contradictory counter text) | Partially verified | **Out of scope**: no accounts, comments, favourites, paywall |
| H-11 | `/indexofebooks` | E-books listed with author and year | Fetch text | Verified (page text) | UJAAS magazine = web articles, not e-book files (D-08) |
| H-12 | `/` footer | Network links, about-site, founder, contact (`/contactus`), social links | Fetch text | Verified (page text) | UJAAS footer: 5 policy links; contact/social hidden until supplied |
| H-13 | `/` | Search is a link "खोजिए"; behaviour not visible | Fetch text | **Unverified** | Search UX must be defined by UJAAS (FR-009) |
| H-14 | all | Mobile navigation and reading experience | Not accessible by text fetch | **Unverified** | Open work (§6) |
| H-15 | `/` | Donation appeal block | Fetch text | Verified (page text) | **Out of scope** (payments) |

## 3. Rekhta e-magazines (https://www.rekhta.org/emagazines)

| ID | URL | Observation | Evidence | Status | Relevance to UJAAS |
|---|---|---|---|---|---|
| R-01 | `/emagazines` | Frequency filters: All, Yearly, Half Yearly, Quarterly, Bi Monthly, Monthly, Fortnightly, Weekly, Daily, Other (`?frq=`); language switch (`?lang=hi`/`ur`) | Fetch text | Verified (page text) | Frequency is metadata (D-16); UJAAS has one magazine, so a series filter is not needed. Year filter is |
| R-02 | `/emagazines` | Curated collections: Most Popular, Recommended, Children's, Entertainment, Literary, Household, each with "See All" | Fetch text | Verified (page text) | Not needed for one magazine. "Popular" ranking is excluded (D-30) |
| R-03 | `/emagazines` | Magazine card: cover, title, publisher, editor, year, issue count, READ NOW, See Magazine Index | Fetch text | Verified (page text) | Issue card: cover, number, period, link. Publisher/editor shown in the issue's publication details |
| R-04 | `/emagazines/<slug>` | Issue list: cover, issue number ("Shumara"), month/year; some numbers repeat across years | Fetch text | Verified (page text) | UJAAS issue number is unique; slug holds number |
| R-05 | `/emagazines/<slug>` | Sort: Recommended, Publish Year, Issue Number; filters: number, year, month, editor, publisher, rating, library, special number | Fetch text | Verified (page text) | Adapt: year filter and newest-first sort only (FR-021) |
| R-06 | `/emagazines/<slug>` | No publisher/editor/frequency/count on the listing page; no related magazines; no preview or download on the card | Fetch text; absence inferred | Partially verified | UJAAS issue page carries full publication details |
| R-07 | `/ebooks/detail/<slug>`, `?toc=1` | Per-issue detail page and a magazine index (table of contents) link | URLs in fetch | Partially verified (target pages not opened) | Issue page with ordered contents (FR-022) |
| R-08 | reader | Reading controls, page navigation, mobile reader | Not opened | **Unverified** | UJAAS reads articles as web pages; no page-image reader at launch |

## 4. Comparison matrix

| Capability | Hindwi | Rekhta e-magazines | UJAAS decision |
|---|---|---|---|
| Home built from curated and latest blocks | Yes (H-02) | n/a | Yes; empty blocks hidden |
| Author directory with alphabet filter | Yes (H-06) | No | Yes (FR-006) |
| Curated collections | Yes (H-04) | Yes (R-02) | Yes (FR-008) |
| Topics/tags | Yes (H-05) | No | Optional topics |
| Full text with line breaks | Yes (H-08) | Reader (unverified) | Yes (FR-005) |
| Breadcrumbs | No (H-09) | Unverified | Yes (FR-002) |
| Related works | Limited (H-09) | No (R-06) | P1 (FR-007) |
| Issue archive with year filter | n/a | Yes (R-05) | Yes (FR-021) |
| Issue contents (index) | n/a | Link only (R-07) | Yes, ordered join (FR-022) |
| Accounts, favourites, comments | Yes | Yes (rating, library) | **No** |
| Donations | Yes (H-15) | Yes | **No** |
| Writer submissions | Not seen | Not seen | Yes, no accounts (FR-027) |

## 5. Recommended adaptations (summary)

1. Home assembled from real data blocks; any block with no data is hidden.
2. Author directory: Devanagari alphabet strip and content-type filter; pagination with stable URLs.
3. Detail page: preserve verse line breaks; show source/translator/rights metadata when present.
4. Issue archive: newest first, year filter, no ratings or "popular" lists.
5. Add what both references lack: breadcrumbs, honest empty states, accessible reading layout, a controlled submission workflow.
6. Do not copy any Hindwi/Rekhta text, layout, branding or assets (`design_principles`).

## 6. Not verified, open work

- Mobile navigation and reading on both sites; Rekhta reader controls; search behaviour; pagination; keyboard use.
- Individual issue detail pages on Rekhta; Hindwi poet profile page.
- Plan: browser-based pass with the Chrome tools, if the owner approves site interaction. Until then these stay **Unverified**.

## 7. Client mockup audit (`designs/UJAAS_HTML_Design_Reference_Pack/`)

The pack has 42 flattened images (desktop, 724–2172 px wide, AI-generated). It has no DOM, CSS, mobile or tablet screens. Reviewed images this round: homepage (`a_highly_detailed_polished_hindi_literary_website.png`), submit page (`a_clean_modern_warmly_lit_hindi_website_homepage.png`, titled "अपनी रचना भेजें"), contact page (`a_clean_modern_responsive_website_contact_page_de.png`), and the six-logo sheet (`a_wide_clean_high_resolution_collage_branding_sh.png`). The other 38 images still need to be opened and catalogued (open work, §7.4).

### 7.1 Devices seen and treatment

| ID | Device seen | Where | Treatment (see `design_principles`, `taste_house_rules`) |
|---|---|---|---|
| M-01 | Header: logo + 8 links + search + maroon CTA "सदस्यता जुड़ें" | all | Membership button excluded (D-23). Link count is a taste conflict (#20, D-29) |
| M-02 | Hero: photo scene, kicker line, large title, two buttons, paper-note quote | home | Keep only with owner imagery; three-or-two buttons conflict (#19); kicker conflict (#6) |
| M-03 | Icon-tile row of genres (10 on home, 7 on submit and contact) | all | Conflict #14; use simple category list until owner decides |
| M-04 | "नवीनतम ई-पत्रिका" card with cover, "ऑनलाइन पढ़ें", "PDF डाउनलोड करें", page and article counts | home | PDF button hidden until D-08; counts only if computed from data |
| M-05 | "संपादक की ओर से" with portrait and quote | home | Needs owner text and photo (D-28); AI portrait not reused |
| M-06 | "विशेष रचनाएँ" cards with genre chips and filter chips | home | Chips conflict (#6); category as plain text |
| M-07 | "विशिष्ट रचनाकार" carousel with named well-known writers | home | Names are not approved; carousel needs pause/keyboard |
| M-08 | "आगामी कार्यक्रम एवं घोषणाएँ" with dated events | home | Excluded until D-25; no invented dates |
| M-09 | "अपनी रचना भेजें" band; submit form with genre, title, name, email, short bio (≤300), text (≤10000), **file upload (.doc/.docx/.pdf, 5 MB)**, one declaration checkbox | submit | Upload excluded until D-04/D-12. Spec requires **three** separate consents (submission_privacy) |
| M-10 | Guidelines panel, 6-question FAQ accordion | submit | FAQ is P1 (FR-038); wording is owner text |
| M-11 | Contact page: 7 contact tiles, form with phone and subject, email/phone/address/hours, Google-style map, FAQ, "newsletter" box | contact | Map, phone, address, hours, newsletter excluded (D-24, `content_safety`) |
| M-12 | Maroon 4-column footer with logo, quick links, contact, social icons, newsletter, © 2024 | all | Keep as designed close; contact/social hidden until supplied |
| M-13 | Gradients, soft card shadows, ❖ ornament dividers | all | Taste conflicts #9, #10, #11 (D-31) |
| M-14 | Six logo candidates (diya + sun + book; book + flame + birds; sun + book + quill; sunrise path + book; sun + leaf; flame + book) | logo sheet | No vector file, none chosen (D-27). Plain text wordmark marked `DEV` until supplied |
| M-15 | Breadcrumb under header on inner pages | submit, contact | Keep (FR-002) |

### 7.2 Page coverage in the pack (partial)

| Page | Seen in mockups | Sitemap route |
|---|---|---|
| Home | Yes | `/` |
| Submit | Yes | `/rachna-bhejein` |
| Contact | Yes | `/sampark` |
| Literature listing, category, article, authors, collections, search, issue, about, policy, admin | **Not yet confirmed in the 38 unopened images** | see `sitemap.md` |

No mockup shows the admin, 404, empty or error states, or any 390/768 px layout. These are designed in Phase 3 (D-26).

### 7.3 Content risks in the mockups

| ID | Risk | Examples seen | Rule |
|---|---|---|---|
| M-16 | Placeholder or invented data presented as fact | Named well-known writers and AI portraits; "60 पृष्ठ · 12+ रचनाएँ"; "info@ujaas.in", "info@ujaassahitya.in" (two different emails); "+91 98765 43210"; "नई दिल्ली"; working hours; "© 2024"; event dates; "अक्टूबर – दिसंबर 2024" | None of it is UJAAS data; never copied (`content_safety`) |
| M-17 | Hindi typos in mockup text | Footer heading reads "व्वरित लिंक" in the submit mockup (likely "त्वरित"); the skill notes also record "ई-प्रत्रिका" and "अपती बात" | Never copy mockup text; proofread every string (`hindi_content`) |
| M-18 | Inconsistent facts between mockups | Two different emails; nav shows "ई-पत्रिका" vs "ई-प्रत्रिका" | Owner supplies one set of contact data (handover items) |
| M-19 | Two different contact/CTA patterns | Header CTA "सदस्यता जुड़ें" vs "अपनी रचना भेजें" | One CTA, decided by owner (D-23, D-29) |

### 7.4 Open work on the pack
Open and catalogue the remaining 38 images (page type, viewport, devices), then update §7.2. Not done in this round.

## 8. Sources
- https://www.hindwi.org/ , https://www.hindwi.org/poets , https://www.hindwi.org/kavita/nai-barsat-prayagnarayan-tripathi-kavita , https://www.hindwi.org/kavita-details
- https://www.rekhta.org/emagazines , https://www.rekhta.org/emagazines/aiwan-e-urdu-delhi
