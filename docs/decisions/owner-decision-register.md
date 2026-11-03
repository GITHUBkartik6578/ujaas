# UJAAS — Owner Decision Register

**Rule (`decision_gate`):** a decision is answered only when the owner's answer is written here. A recommendation is advice, not an answer. Assumptions used meanwhile are in [open-decisions.md](./open-decisions.md).

**Priority:** P1 = blocks Phase 2 gate or a major area · P2/P3 = continue on the stated assumption.
**Status:** ❓ open · ✅ answered (owner answer recorded) · 🟡 answered, follow-up pending.
**Last updated:** 2026-11-02

## A. Decisions answered

| ID | Pri | Decision | Answer | Recorded from | Follow-up |
|---|---|---|---|---|---|
| D-09 | P1 | Palette and roles | **Take the colour palette from the design pack** `designs/UJAAS_HTML_Design_Reference_Pack/`; tokens in `docs/design-tokens.md`. | Owner instruction in the working session, 2026-11-02: "refer the designs uploaded in designs folder and add the color palette accordingly". Recorded by the agent; owner to confirm. | 🟡 Tokens are measured from AI mockups; exact brand hex values and the logo version (D-27) still open. |
| D-07 | P1 | Technology stack | **MERN with Next.js**: MongoDB (Atlas), Express, React through Next.js (server-rendered), Node.js, TypeScript. | Owner message in the working session, 2026-11-02: "yes go with MERN using Next.js". Recorded here by the agent; owner to confirm this entry. | 🟡 ADR 0001 stays **Proposed** until the spike in the ADR passes (`startcycle` gate item 3). |

## A2. Gate answered by owner instruction (2026-11-02)

Owner message: "dont wait for owners decision, proceed further". Recorded by the agent as: Phase 1 specification accepted as drafted; Phase 2 authorised; open P1 decisions **proceed on the written assumptions** in `open-decisions.md` (D-08 no PDF, D-23/D-24/D-25 not built, D-26 mobile/tablet derived from desktop, D-27 `DEV` text wordmark). These remain changeable by the owner at any time and are tagged `ASSUMPTION D-xx` in code. Legal items (D-02, D-03) are **not** assumed: no retention number and no consent text are written by the agent; the submission form stays off. Commit, push, merge and deploy are **not** authorised.

## B. Decisions open

Where the repo does not define an ID, the row says so. Definitions marked **(from skills)** are taken from how the skill files use the ID; **(not defined in repo)** means the owner must supply the question.

| ID | Pri | Decision needed | Options | Recommendation (advice only) | Blocks | Status |
|---|---|---|---|---|---|---|
| D-01 | P2 | Submission receipt method | (a) confirmation screen + reference ID (b) confirmation email (c) status updates by email (d) private status lookup with token | (a) for launch | submission confirmation | ❓ |
| D-02 | P1-legal | Data-retention period for submissions, contact messages, logs | Owner/legal sets days per data class | None invented | retention job, privacy policy, launch | ❓ |
| D-03 | P1-legal | Privacy policy text and consent wording (original-work declaration, publication permission, privacy acknowledgement) and consent text version | Owner/legal supplies text | None invented | submission form going live, policy pages | ❓ |
| D-04 | P2 | Optional image upload in submission form | none / one image JPEG-PNG-WebP ≤ 5 MB | none at launch | form, media | ❓ |
| D-05 | P2 | Admin roles: single admin or multiple editors | site_admin only / four roles | single role until approved (schema supports four) | permission model, admin users page | ❓ |
| D-06 | P2 | Notification and confirmation emails | off (manual replies) / transactional email service | off | email integration | ❓ |
| D-08 | **P1** | PDF of each issue: none, download link, or in-site viewer | none / download link / viewer | download link only if wanted, otherwise none | issue page, issue admin form, file storage | ❓ |
| D-10 | P3 | **(not defined in repo)** cited by `admin_cms_build` | — | — | admin | ❓ owner to supply the question |
| D-11 | P3 | **(not defined in repo)** | — | — | — | ❓ |
| D-12 | P2 | Extra submission-form fields, including document attachments (FR-032) | core fields only / add fields | core only | submission form, private file storage | ❓ |
| D-13 | **launch-blocking** | **(not defined in repo)**; `release_readiness` lists it as launch-blocking | — | — | launch | ❓ owner to supply the question |
| D-14, D-15 | P3 | **(not defined in repo)** | — | — | — | ❓ |
| D-16 | P2 | Magazine frequency: quarterly (documents) or monthly (mockups) | quarterly / monthly / other | store as metadata, do not hard-code | issue form, landing copy | ❓ |
| D-17 | P3 | **(not defined in repo)** | — | — | — | ❓ |
| D-18 | **launch-blocking** | **(not defined in repo)**; listed as launch-blocking in `release_readiness` | — | — | launch | ❓ owner to supply the question |
| D-19 | P3 | ISSN: show only if the owner supplies one | supply / none | hide until supplied | issue page | ❓ |
| D-20, D-21, D-22 | P3 | **(not defined in repo)** | — | — | — | ❓ |
| D-23 | **P1** | "सदस्यता जुड़ें" (membership) button | not built / built | not built; no accounts at launch | header, footers | ❓ (build without it) |
| D-24 | **P1** | Newsletter signup box | not built / built | not built | footers, contact | ❓ (build without it) |
| D-25 | **P1** | Activity registration, competitions, Zoom/events | not built / informational page only / full | informational page later (P1), no registration | activities page, home events block | ❓ (build without it) |
| D-26 | **P1** | Mobile (390 px) and tablet (768 px) layouts | derive from desktop mockups, owner approves screens before content load | derive and approve | responsive layouts | ❓ |
| D-27 | **P1** | Logo: choose one of six candidates and supply a vector file | choose / commission | owner chooses | header logo, favicon, social images | ❓ (text wordmark `DEV` until supplied) |
| D-28 | P2 | Editor-in-Chief name spelling, photo, message; use of mockup photographs | spelling "विनय मिश्र" (client documents) until confirmed | owner supplies | editorial intro page, about | ❓ |
| D-29 | P2 | Header navigation link count (client mockup: 8 links plus CTA; taste rule 20: 3–5) | keep 8 / reduce | keep client's list | header | ❓ |
| D-30 | P2 | Reader counters and "लोकप्रिय" rankings | not built / built | not built | home, lists | ❓ |
| D-31 | P2 | (logged exceptions so far: rule 12 palette, rule 19 one action, rule 20 seven nav links; see `design-direction.md` §7) Taste-rule collisions with mockups: rules 6, 8, 10, 11, 12, 14, 19, 20 (21 if needed) | keep mockup/brief / follow taste rule, per rule | keep brief; log each as an exception | design direction session | ❓ answer together with D-09 |

## C. Decisions that may be missing
If a task needs a decision not listed here, add it with options and a recommendation, then ask (`decision_gate` step 5).

## D. Phase 2 gate status (from `startcycle.md`)
| Gate item | Status |
|---|---|
| Phase 1 signed off by owner | ✅ by instruction 2026-11-02 (see A2) |
| 8 P1 decisions answered (D-07, D-08, D-09, D-23, D-24, D-25, D-26, D-27) | 2 recorded (D-07, D-09); 6 proceed on assumptions per A2 |
| ADR 0001 Accepted (spike result written) | ❓ Proposed; spike in progress |
| Phase 2 authorised in writing | ✅ by instruction 2026-11-02 (chat message; no commit/push/deploy) |
