# Skill: magazine_issues

**Use when:** building the e-magazine landing, archive, issue page or issue admin.
**Sources:** `docs/data-model.md` (magazine_issues, issue_items), `docs/requirements.md` FR-020…FR-026, `docs/user-flows.md` F7, F8, F13, decisions D-08, D-16, D-19.
**Tests:** T-MAG-01…03.

## Rules
- An issue has number (unique), optional volume, period label in Hindi, publication date, cover with alt text, editorial intro, publication details, status, `show_in_archive`.
- Issue contents are an **ordered join** (`issue_items`: position + section label). A creation can be in many issues and in general listings **without duplicating** the record. Reordering is atomic.
- Public issue pages show only items that are currently published; the admin sees a warning for unpublished members.
- Section labels default to the 12 proposed headings (काव्य उजास, कथा के रंग, …) and are editable per issue.
- Reading is **web articles**. Prev/next within an issue; canonical article URL stays `/rachna/[slug]`.
- The landing page shows the current issue plus a newest-first archive with a year filter. Before the first issue exists show an honest “coming soon” page with no fake covers.
- **PDF**: the model has an optional file field but do not expose upload, download button or viewer until D-08 is answered. If approved, only a download link (recommended option) unless the owner chooses otherwise.
- Frequency is metadata (quarterly per documents, monthly per mockups; D-16). Do not hard-code it. ISSN shows only if supplied (D-19).
- Publishing an issue needs cover (with alt), number, date and at least one published item.

## Done when
T-MAG tests pass, including the same creation in two issues and an unpublished-item test.
