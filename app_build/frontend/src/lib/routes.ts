/**
 * Routes that are actually built. Every visible link must have a real destination (public_site_build),
 * so navigation and buttons consult this list. Add a path here in the same change that adds its page.
 * Source of truth for the full list of planned routes: docs/sitemap.md.
 */
export const BUILT_ROUTES = new Set<string>(['/', '/sahitya', '/rachnakar', '/sangrah', '/khoj', '/rachna-bhejein', '/sampark', '/e-patrika']);
/** Dynamic routes: `/rachna/<slug>` and so on. */
export const BUILT_PREFIXES = ['/rachna/', '/sahitya/', '/rachnakar/', '/sangrah/', '/e-patrika/'];
// Admin screens are not part of the public navigation and never appear in header, footer or sitemap.

/** Design review shows planned-but-unbuilt links as disabled text so the owner can judge the layout. */
export const DESIGN_REVIEW = process.env.NEXT_PUBLIC_DESIGN_REVIEW === '1';

export const isBuilt = (href: string) => BUILT_ROUTES.has(href) || BUILT_PREFIXES.some((p) => href.startsWith(p) && href.length > p.length);
