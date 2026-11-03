import 'server-only';
import { headers } from 'next/headers';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(`API ${status} ${code}`);
  }
}

/**
 * Server-side GET against the Express API. Never cached: unpublishing must show at once.
 * The visitor's address is forwarded so the API's per-IP rate limits apply to the visitor,
 * not to this server (the API runs with TRUST_PROXY=1 behind it; docs/deployment.md).
 */
export async function api<T>(path: string): Promise<T> {
  const h = await headers();
  const fwd = h.get('x-forwarded-for');
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      cache: 'no-store',
      headers: fwd ? { 'x-forwarded-for': fwd } : {},
    });
  } catch {
    throw new ApiError(503, 'unreachable');
  }
  if (!res.ok) {
    let code = 'error';
    try {
      code = ((await res.json()) as { error?: { code?: string } }).error?.code ?? code;
    } catch { /* body was not JSON */ }
    throw new ApiError(res.status, code);
  }
  return (await res.json()) as T;
}

/** Like api(), but a 404 becomes null so the page can call notFound() or try a redirect. */
export async function apiOrNull<T>(path: string): Promise<T | null> {
  try {
    return await api<T>(path);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export interface Cover { url: string; alt: string; credit: string | null; width: number; height: number }
export interface AuthorRef { name: string; slug: string | null; role: string }
export interface Card {
  slug: string; title: string; excerpt: string; type: string;
  category: { slug: string; name: string } | null; authors: AuthorRef[]; cover: Cover | null; published_at: string | null;
}
export interface Full extends Card {
  body: string; body_format: 'verse' | 'prose'; source_note: string | null; translator_note: string | null;
  seo_title: string | null; seo_description: string | null;
}
export interface Paged<T> { items: T[]; page: number; page_size: number; total: number }
export interface AuthorCard {
  slug: string; name: string; bio: string | null; birth_year: number | null; birthplace: string | null; photo: Cover | null; works_count?: number;
}
export interface CategoryRow { slug: string; name: string; description: string | null; works_count: number }
export interface IssueCard {
  slug: string; title: string; issue_number: number; volume: string | null; period_label: string; publication_date: string; cover: Cover | null;
}
export interface IssueFull extends IssueCard {
  editorial_intro: string | null; publication_details: string | null;
  items: Array<{ position: number; section_label: string | null; content: Card }>;
}
export interface HomeBlocks {
  issue?: IssueCard & { editorial_intro: string | null };
  picks?: Array<Card & { lines: string[] }>;
  latest?: Array<Card & { lines: string[] }>;
  authors?: AuthorCard[];
}
