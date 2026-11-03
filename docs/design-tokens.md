# UJAAS — Design Tokens: Colour Palette

**Status:** Draft, taken from the design pack · **Date:** 2026-11-02
**Source:** `designs/UJAAS_HTML_Design_Reference_Pack/assets/` (42 mockup images). Owner instruction: take the palette from the designs folder (this answers D-09, see `decisions/owner-decision-register.md`).
**Method:** pixel measurement with Pillow on all 42 images (script kept out of the repo), plus exact sampling of named regions in the submit mockup (`a_clean_modern_warmly_lit_hindi_website_homepage.png`: header, footer, buttons, panels, notice box). Values are measured from AI-generated flattened screenshots, so they carry ±2–4 per channel of noise and gradients; treat as design values, not brand-guide values.

## 1. What the mockups use

Share of all pixels within a small colour distance (all 42 images pooled), and how many images contain it:

| Colour family | Measured | Share of pixels | Images (of 42) |
|---|---|---|---|
| Cream / off-white ground | `#FDF9F3` – `#FEF6EE` | about 33–35 % | 41 |
| Maroon (footer, buttons, headlines) | `#620206` – `#6A0206` (gradient `#5C040C` to `#720206`) | about 8.5 % | 35 |
| Saffron tint (notice boxes, soft panels) | `#FEE9CC` | about 8.7 % | 41 |
| Blush | `#F4E2D1` | about 7.8 % | 42 |
| Saffron / gold accent | `#F5BF89` (logo gold reaches `#F4740C`) | 0.7 % | 40 |
| Dark brown | `#362815` | 0.6 % | 37 |
| Sand | `#CEB194` | 0.6 % | 37 |
| Copper | `#925D43` | 0.5 % | 39 |
| Rust | `#793423` | 0.5 % | 40 |

Observed in the submit mockup: headline `#7B0309`–`#870309` (a lit maroon), sub-headline about `#930303`, body text near-black (anti-aliased pixels sample as `#081833`, a rendering tint, not a brand colour), active nav link red `#F3151B`-range, tile icons in orange/red (`#BC443C`, `#EC841C`). White `#FFFFFF` is used inside form fields. There is **no green, blue or violet** in the interface (matches the client rule "no green").

## 2. Token set (proposal for the design direction session)

Brand colours and roles. Define once as CSS custom properties; never scatter hex values (`design_principles`).

| Token | Hex | Role | Notes |
|---|---|---|---|
| `--color-cream` | `#FDF9F3` | Page ground | dominant surface |
| `--color-panel` | `#FEF6EE` | Panels, guideline cards (tone step) | measured in guidelines panel |
| `--color-blush` | `#F4E2D1` | Tone step 1: bands, tiles | |
| `--color-sand` | `#CEB194` | Tone step 2: borders on tinted areas, decoration | **never text** |
| `--color-notice` | `#FEE9CC` | Callout / notice background | measured; saffron tint |
| `--color-white` | `#FFFFFF` | Form field fill | |
| `--color-ink` | `#362815` | Body text and headings on cream | brand dark brown |
| `--color-maroon` | `#620206` | Accent: header CTA, buttons, footer, links, focus on light | footer gradient `#5C0404`–`#720206` in mockups; we use one flat value (taste rules 10/11, D-31) |
| `--color-copper` | `#925D43` | Muted text on cream, secondary accent | text on cream only |
| `--color-rust` | `#793423` | Error text, strong secondary accent | text on cream |
| `--color-saffron` | `#F5BF89` | Accent on maroon (focus ring, links in footer), logo gold | **on maroon only** |

Derived, not new colours: hover/pressed maroon = `color-mix(in srgb, var(--color-maroon) 88%, black)`; disabled = ink at reduced opacity with a text label.

```css
:root {
  --color-cream:   #FDF9F3;
  --color-panel:   #FEF6EE;
  --color-blush:   #F4E2D1;
  --color-sand:    #CEB194;
  --color-notice:  #FEE9CC;
  --color-white:   #FFFFFF;
  --color-ink:     #362815;
  --color-maroon:  #620206;
  --color-copper:  #925D43;
  --color-rust:    #793423;
  --color-saffron: #F5BF89;

  /* roles */
  --bg:            var(--color-cream);
  --surface:       var(--color-panel);
  --tone-1:        var(--color-blush);
  --tone-2:        var(--color-sand);
  --text:          var(--color-ink);
  --text-muted:    var(--color-copper);
  --accent:        var(--color-maroon);
  --on-accent:     var(--color-cream);
  --focus-ring:    var(--color-maroon);   /* on maroon surfaces use --color-saffron */
  --error-text:    var(--color-rust);
}
```

## 3. Contrast (WCAG, computed from the hex values above)

| Pair | Ratio | Use |
|---|---|---|
| ink on cream | 13.6 | body text ✔ |
| ink on blush | 11.3 | text on bands ✔ |
| ink on panel | 13.3 | ✔ |
| ink on notice | 12.1 | ✔ |
| maroon on cream | 13.1 | headings, links ✔ |
| maroon on blush | 10.9 | ✔ |
| maroon on notice | 11.6 | ✔ |
| cream on maroon | 13.1 | button and footer text ✔ |
| white on maroon | 13.7 | ✔ |
| saffron on maroon | 8.3 | footer accents ✔ |
| blush on maroon | 10.9 | footer text ✔ |
| rust on cream | 8.6 | error text ✔ |
| copper on cream | 5.2 | muted text ✔ (AA, normal size) |
| copper on blush | 4.3 | **large text only** |
| ink on sand | 7.0 | ✔ |
| sand on maroon | 6.8 | decoration or large text |
| sand on cream | 1.9 | **decoration only, never text** |

Text over photographs (hero) is **not measured** here and must be measured when real images exist (`seo_a11y_perf`).

## 4. Usage rules
1. One ground (cream), one ink (dark brown), one accent (maroon); tone steps blush and sand separate surfaces. Copper, rust and saffron are secondary and used sparingly (each under 1 % of the surface in the mockups).
2. Rust, copper and saffron collide with taste rule 12 (terracotta/rust palettes). They stay because they are in the client designs; recorded as exceptions under D-31 (`taste_house_rules` #12).
3. No gradients, shadows or glows on the built UI (taste rules 10, 11); the mockup's maroon gradient is replaced by flat `--color-maroon`.
4. Status colours are not in the designs. No green. Errors use `--error-text` plus an icon and a Hindi text label; success and warning use ink text with an icon, so colour is never the only signal. A dedicated admin status palette needs the designer's input (open).
5. Focus ring ≥ 2 px, visible on every surface (maroon on light, saffron on maroon).
6. Never copy the AI photographs' colours or the lit hero imagery into tokens; photos come from owner-supplied images only.

## 5. Limits and open points
- Measured from flattened AI images, so exact brand hex values still need the client's brand sheet (documents A/B/C are not in the repo).
- Logo gold and orange (`#F4740C` range, six logo candidates) are part of the logo artwork and are **not** UI tokens until a logo is chosen (D-27).
- Dark mode: not in the brief.
