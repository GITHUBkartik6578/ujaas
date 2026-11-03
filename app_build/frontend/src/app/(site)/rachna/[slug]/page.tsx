import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { apiOrNull, type Card, type Full } from '@/lib/api';
import { absUrl } from '@/lib/site';
import { ReadingView } from '@/components/ReadingView';

async function load(slug: string) {
  const c = await apiOrNull<Full>(`/contents/${encodeURIComponent(slug)}`);
  if (c) return c;
  // A renamed slug redirects permanently to the new address; an unknown or unpublished one is a real 404.
  const red = await apiOrNull<{ slug: string }>(`/redirects/content/${encodeURIComponent(slug)}`);
  if (red) permanentRedirect(`/rachna/${red.slug}`);
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await apiOrNull<Full>(`/contents/${encodeURIComponent(slug)}`);
  if (!c) return { title: 'पृष्ठ नहीं मिला' };
  const title = c.seo_title || c.title;
  const description = c.seo_description || c.excerpt;
  const url = absUrl(`/rachna/${c.slug}`);
  return {
    title, description,
    alternates: { canonical: url }, // the canonical address even when read through an issue
    openGraph: { type: 'article', title, description, url, locale: 'hi_IN', ...(c.cover ? { images: [absUrl(c.cover.url)] } : {}) },
  };
}

interface Neighbors { issue: { slug: string; title: string }; prev: Card | null; next: Card | null }

export default async function CreationPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ issue?: string }> }) {
  const { slug } = await params;
  const { issue } = await searchParams;
  const c = await load(slug);
  if (!c) notFound();
  // Reading through an issue shows where you are in it; a wrong or unrelated issue is simply ignored.
  const nav = issue && /^[a-z0-9-]{1,160}$/.test(issue) ? await apiOrNull<Neighbors>(`/issues/${issue}/neighbors/${encodeURIComponent(slug)}`).catch(() => null) : null;
  return <ReadingView c={c} issueNav={nav} />;
}
