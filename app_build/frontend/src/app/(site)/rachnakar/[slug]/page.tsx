import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api, apiOrNull, type AuthorCard, type Card, type Paged } from '@/lib/api';
import { absUrl, jsonLd } from '@/lib/site';
import { Breadcrumbs, CardGrid, EmptyState, Pagination, Picture } from '@/components/parts';

const PAGE_SIZE = 12;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = await apiOrNull<AuthorCard>(`/authors/${encodeURIComponent(slug)}`);
  if (!a) return { title: 'पृष्ठ नहीं मिला' };
  return {
    title: a.name,
    description: a.bio ?? `${a.name} की रचनाएँ उजास पर।`,
    alternates: { canonical: absUrl(`/rachnakar/${a.slug}`) },
  };
}

export default async function AuthorPage({
  params, searchParams,
}: { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> }) {
  const { slug } = await params;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const a = await apiOrNull<AuthorCard>(`/authors/${encodeURIComponent(slug)}`);
  if (!a) notFound(); // a non-public author is indistinguishable from a missing one
  const works = await api<Paged<Card>>(`/authors/${encodeURIComponent(slug)}/contents?page=${page}&page_size=${PAGE_SIZE}`);
  const ld = { '@context': 'https://schema.org', '@type': 'Person', name: a.name, url: absUrl(`/rachnakar/${a.slug}`), ...(a.bio ? { description: a.bio } : {}) };
  return (
    <div className="frame page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <Breadcrumbs items={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'रचनाकार', href: '/rachnakar' }, { label: a.name }]} />
      <div className="profile">
        {a.photo && (
          <div className="profile-photo">
            <Picture cover={a.photo} sizes="16rem" />
            {a.photo.credit && <p className="photo-credit">{a.photo.credit}</p>}
          </div>
        )}
        <div>
          <h1>{a.name}</h1>
          {(a.birth_year || a.birthplace) && (
            <p className="card-meta">{[a.birth_year, a.birthplace].filter(Boolean).join(' · ')}</p>
          )}
          {a.bio && <p className="lead-text">{a.bio}</p>}
        </div>
      </div>
      <h2>रचनाएँ</h2>
      {works.items.length === 0 ? (
        <EmptyState title="अभी कोई प्रकाशित रचना नहीं है" />
      ) : (
        <>
          <CardGrid items={works.items} level={3} />
          <Pagination basePath={`/rachnakar/${a.slug}`} page={works.page} pageSize={works.page_size} total={works.total} />
        </>
      )}
    </div>
  );
}
