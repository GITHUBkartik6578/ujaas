import type { MetadataRoute } from 'next';
import { ALLOW_INDEXING, absUrl } from '@/lib/site';

// Read at request time, not at build time: the same build must be able to run as staging (blocked) and production (open).
export const dynamic = 'force-dynamic';

// /admin is never indexed; staging and development block everything unless ALLOW_INDEXING=1.
export default function robots(): MetadataRoute.Robots {
  if (!ALLOW_INDEXING) return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }, sitemap: absUrl('/sitemap.xml') };
}
