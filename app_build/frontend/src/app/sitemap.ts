import type { MetadataRoute } from 'next';
import { absUrl } from '@/lib/site';

export const dynamic = 'force-dynamic'; // an unpublished item must leave the sitemap at once

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Published public URLs only, straight from the API's single published-only helper. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed = ['/', '/sahitya', '/rachnakar', '/sangrah', '/e-patrika'].map((p) => ({ url: absUrl(p) }));
  try {
    const res = await fetch(`${API_URL}/api/v1/sitemap-data`, { cache: 'no-store' });
    if (!res.ok) return fixed;
    const data = (await res.json()) as { urls: Array<{ path: string; lastmod: string | null }> };
    return [...fixed, ...data.urls.map((u) => ({ url: absUrl(u.path), ...(u.lastmod ? { lastModified: u.lastmod } : {}) }))];
  } catch {
    return fixed;
  }
}
