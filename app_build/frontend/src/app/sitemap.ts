import type { MetadataRoute } from 'next';
import { absUrl } from '@/lib/site';

export const dynamic = 'force-dynamic'; // an unpublished item must leave the sitemap at once

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Published public URLs only, straight from the API's single published-only helper. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed = [
    '/', '/sahitya', '/rachnakar', '/sangrah', '/e-patrika', '/hamare-bare-mein', '/sampadkiya', '/gatividhiyan',
    '/niti/gopniyata', '/niti/upyog-ki-sharten', '/niti/copyright-aur-rachna-niti',
    // genre pages (the four that share a category slug are already listed by the API)
    '/sahitya/geet', '/sahitya/laghukatha', '/sahitya/sansmaran', '/sahitya/nibandh',
  ].map((p) => ({ url: absUrl(p) }));
  try {
    const res = await fetch(`${API_URL}/api/v1/sitemap-data`, { cache: 'no-store' });
    if (!res.ok) return fixed;
    const data = (await res.json()) as { urls: Array<{ path: string; lastmod: string | null }> };
    return [...fixed, ...data.urls.map((u) => ({ url: absUrl(u.path), ...(u.lastmod ? { lastModified: u.lastmod } : {}) }))];
  } catch {
    return fixed;
  }
}
