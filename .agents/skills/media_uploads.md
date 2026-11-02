# Skill: media_uploads

**Use when:** handling any uploaded or displayed image/file.
**Sources:** `docs/data-model.md` (media_assets), `docs/security-and-privacy.md`, `docs/api-contract.md` (POST /media), decisions D-04, D-08, D-12.
**Tests:** T-MED-01, T-MED-02.

## Rules
- Allowed at launch: JPEG, PNG, WebP up to 5 MB, checked by **magic bytes**, not extension or declared type. Dimension cap. SVG rejected. PDF only if D-08 allows it.
- Re-encode images to strip EXIF/GPS. Store under a random key; never trust the filename; no execute permission; serve from a separate static path or domain.
- Required before public use: alt text. Credit and permission note are required for author photos and event photos (client A§17: credits and usage permission come with the images).
- Author photos are public only when the author has approved (`authors.is_public`).
- Private files (if D-12 later allows documents) go to private storage, are never served inline, and are scanned.
- Responsive images and sensible dimensions; keep proportions; lazy-load below the fold.
- No third-party image CDNs or map embeds without an owner decision.
- Failed upload keeps the editor/form state and shows a specific message (size, type, network) with retry.

## Done when
Wrong magic bytes, oversize, SVG and polyglot samples are rejected in tests, EXIF is shown stripped, and a page without alt text cannot be published.
