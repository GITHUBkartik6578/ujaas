# Skill: motion_restraint

**Use when:** adding any animation or transition.
**Sources:** taste skill `references/motion.md` (read when installed), client brief A §16 and B §4 ("no unnecessary animation", "not cluttered"), `seo_a11y_perf`.

## What the taste skill asks (condensed)
Motion is required; the inspector fails a page that moves fewer than 8 elements and warns under 16. It wants a signature move, staggered section entrances (60–90 ms apart, rising 16–32 px with opacity, triggered once, never hiding content if scripts fail), feedback on every control (press, hover, focus), and one moving picture. Use only `transform` and `opacity`, with reduced-motion fallbacks.

## What the client asks
A calm, elegant literary look without heavy or unnecessary animation.

## UJAAS rule: restrained motion that still meets the budget
- Use the **subtle** form of the taste motion: staggered entrances that rise 16 px (the low end of the range), short durations, once per page view. This is subtle enough for the client brief and usually reaches the inspector's minimum.
- If the minimum still cannot be met without becoming busy, **record an exception** (inspector rule, page, reason) and tell the owner. Do not add movement just to pass.
- Only `transform` and `opacity`. No parallax, no autoplay video, no looping decoration. A moving picture only if the owner supplies one.
- Content must be visible with scripts off or failed. Hidden-until-animated content is a FAIL.
- `prefers-reduced-motion`: no entrance movement; keep instant state changes and focus styles.
- Controls give feedback (press, hover, focus-visible) without layout shift.
- Carousels (home covers, authors, activities) need pause, previous/next buttons, keyboard operation, and no auto-advance by default.
- Reading pages (article, issue contents) have **no** entrance animation on the text itself.
- Scroll scenes (`references/scenes.md`) are not used unless the owner approves a specific page.

## Done when
Gate report shows motion counts, reduced-motion screenshots, a scripts-off screenshot of the same page, and any recorded exception.
