# Skill: content_safety

**Use when:** writing seeds, fixtures, demo data, copy, or preparing for launch.
**Sources:** `docs/content-handover.md`, `docs/reference-audit.md` §7.3 (M-16, M-17), `docs/test-plan.md` (T-CLN-01, T-SCOPE-01), decision D-28.

## Rules
- Real UJAAS content comes only from owner-supplied, approved material (`content-handover.md`). Do not invent articles, authors, bios, statistics, dates, contacts, quotes or the Editor-in-Chief's message.
- Seed and fixture data is labelled `DEV DATA` in the record itself, lives in separate seed files, and runs only in local/staging.
- Never reuse from the mockups: names or portraits of well-known writers (Ghalib, Faiz, Jaun Elia, Bachchan, Mahadevi Verma, Kumar Vishwas, Geetanjali Shree, Uday Prakash, Mamta Kalia, Ashok Vajpeyi and similar), AI-generated faces, “50K+ पाठक / 1000+ रचनाएँ / 500+ रचनाकार”, `info@ujaas.in`, `info@ujaassahitya.in`, `+91 98765 43210`, “नई दिल्ली”, working hours, 2024 dates, hero or message text.
- Names heard in earlier discussions (e.g. डॉ. रंजना चौबे, लतिका मिश्र, सुधा त्रिपाठी) are **not** an approved author list; each author needs their own permission (A§9).
- Contact, social, address, ISSN and similar fields render nothing when empty; do not fill with samples on production.
- Policy pages carry a visible draft banner and stay unlinked from the footer until legal text is approved (`legal_approved_at`).

## Taste-skill rules that apply here
- Never invent proof: customers, quotes, reviews, press, logos, statistics. This includes counters and "published works" totals unless computed from real data.
- Sample details are allowed only while developing, labelled `DEV DATA`, and listed for the owner to confirm or swap.
- Found or generated pictures follow `frontend_imagery` (credit, licence, owner approval); the taste skill's "at least four real pictures" floor is not a reason to add pictures.

## Launch cleanup (T-CLN-01)
Search production data and templates for: `DEV DATA`, `lorem`, `example.com`, the strings above, `TODO`, `00 रचनाएँ`. Zero hits, with the command and output shown.

## Done when
T-CLN-01 and T-SCOPE-01 pass and the owner's D-28 answer is recorded.
