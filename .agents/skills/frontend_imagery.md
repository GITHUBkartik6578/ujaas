# Skill: frontend_imagery

**Use when:** choosing, finding, cropping or crediting any picture on the public site.
**Sources:** taste skill `references/imagery.md` (read when installed), client doc A §17, `docs/data-model.md` (media_assets), `media_uploads`, `content_safety`, decisions D-27, D-28.

## Taste order of preference, filtered for UJAAS
| Taste order | UJAAS rule |
|---|---|
| 1. The project's own pictures | **Preferred.** Owner-supplied: logo, hero images, editor and board photos, authors' approved photos, magazine covers, event photos, cover images (A §17), each with credit and usage permission |
| 2. Generated pictures | Only for non-person, non-brand scenery, only if the owner approves, and marked as generated. **Never** a generated face, a lookalike of a real writer, or a fake editor portrait |
| 3. Real pictures from open collections (`assets.mjs`) | Network search and download. Ask first. Record licence and credit with `--credits`. Not for production unless the owner approves each picture |
| 4. Drawn-in-code subject graphics | Allowed for simple brand motifs from the approved logo only |
| 5. Dealt stock photographs | Not used |
| 6. Type and colour alone | **Accepted fallback.** A literary site can be strong with typography and a plain field; do not pad with decoration |

## Rules
- The taste floor of "at least four real pictures" is **not enforced** until owner images exist. Never add pictures only to reach a number.
- The mockup photographs are AI-generated placeholders (including portraits resembling real people). Do not reuse them on the live site unless the owner confirms in writing (D-28).
- Development placeholders are flat neutral blocks or the neutral avatar used in Home v3, labelled `DEV DATA`.
- Every public image has alt text; credit is shown where it applies; permission note stored in `media_assets`. Author photos only when the author is public (`authors.is_public`).
- One dominant image beats several small ones; consistent crops; keep proportions at 390 / 768 / 1366 / 1920 px; lazy-load below the fold; nothing overlays a headline or statement.
- No images from the six reference websites or other sites are copied.
- Credit every found picture in the report and in the site's credit field.

## Done when
Every image on a page maps to a `media_assets` row with alt, credit and permission, or is a labelled placeholder that is removed before launch (T-CLN-01).
