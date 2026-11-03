import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, apiOrNull, type Card, type Paged } from '@/lib/api';
import { absUrl } from '@/lib/site';
import { Breadcrumbs, CardGrid, EmptyState, Pagination } from '@/components/parts';

interface Cat { slug: string; name: string; description: string | null; works_count: number }
const PAGE_SIZE = 12;

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const c = await apiOrNull<Cat>(`/categories/${encodeURIComponent(category)}`);
  if (!c) return { title: 'पृष्ठ नहीं मिला' };
  return {
    title: c.name,
    description: c.description ?? `उजास पर ${c.name} श्रेणी की रचनाएँ।`,
    alternates: { canonical: absUrl(`/sahitya/${c.slug}`) },
  };
}

export default async function CategoryPage({
  params, searchParams,
}: { params: Promise<{ category: string }>; searchParams: Promise<{ page?: string }> }) {
  const { category } = await params;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const c = await apiOrNull<Cat>(`/categories/${encodeURIComponent(category)}`);
  if (!c) notFound();
  const list = await api<Paged<Card>>(`/categories/${encodeURIComponent(category)}/contents?page=${page}&page_size=${PAGE_SIZE}`);
  return (
    <div className="frame page">
      <Breadcrumbs items={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'साहित्य', href: '/sahitya' }, { label: c.name }]} />
      <h1>{c.name}</h1>
      {c.description && <p className="lead-text">{c.description}</p>}
      {list.items.length === 0 ? (
        <EmptyState title="इस श्रेणी में अभी कोई रचना नहीं है">
          <p>
            <Link href="/sahitya">सभी साहित्य</Link> देखें या <Link href="/khoj">खोज</Link> आज़माएँ।
          </p>
        </EmptyState>
      ) : (
        <>
          <CardGrid items={list.items} />
          <Pagination basePath={`/sahitya/${c.slug}`} page={list.page} pageSize={list.page_size} total={list.total} />
        </>
      )}
    </div>
  );
}
