import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiOrNull, type Card } from '@/lib/api';
import { absUrl } from '@/lib/site';
import { Breadcrumbs, CardGrid, EmptyState } from '@/components/parts';

interface Col { slug: string; title: string; description: string | null; items: Card[] }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await apiOrNull<Col>(`/collections/${encodeURIComponent(slug)}`);
  if (!c) return { title: 'पृष्ठ नहीं मिला' };
  return { title: c.title, description: c.description ?? undefined, alternates: { canonical: absUrl(`/sangrah/${c.slug}`) } };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await apiOrNull<Col>(`/collections/${encodeURIComponent(slug)}`);
  if (!c) notFound();
  return (
    <div className="frame page">
      <Breadcrumbs items={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'संग्रह', href: '/sangrah' }, { label: c.title }]} />
      <h1>{c.title}</h1>
      {c.description && <p className="lead-text">{c.description}</p>}
      {c.items.length === 0 ? (
        <EmptyState title="इस संग्रह में अभी कोई रचना नहीं है">
          <p><Link href="/sangrah">सभी संग्रह</Link> देखें।</p>
        </EmptyState>
      ) : (
        <CardGrid items={c.items} />
      )}
    </div>
  );
}
