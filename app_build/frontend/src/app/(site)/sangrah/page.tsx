import type { Metadata } from 'next';
import Link from 'next/link';
import { api, type Paged } from '@/lib/api';
import { absUrl } from '@/lib/site';
import { Breadcrumbs, EmptyState, Pagination } from '@/components/parts';

export const metadata: Metadata = {
  title: 'संग्रह',
  description: 'उजास के चुने हुए संग्रह।',
  alternates: { canonical: absUrl('/sangrah') },
};
interface Row { slug: string; title: string; description: string | null; works_count: number }
const PAGE_SIZE = 12;

export default async function CollectionsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const list = await api<Paged<Row>>(`/collections?page=${page}&page_size=${PAGE_SIZE}`);
  return (
    <div className="frame page">
      <Breadcrumbs items={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'संग्रह' }]} />
      <h1>संग्रह</h1>
      <p className="lead-text">संपादकों के चुने हुए रचना-संग्रह।</p>
      {list.items.length === 0 ? (
        <EmptyState title="अभी कोई संग्रह प्रकाशित नहीं है">
          <p><Link href="/sahitya">साहित्य</Link> देखें।</p>
        </EmptyState>
      ) : (
        <>
          <ul className="collection-list">
            {list.items.map((c) => (
              <li key={c.slug}>
                <h2><Link href={`/sangrah/${c.slug}`}>{c.title}</Link></h2>
                {c.description && <p>{c.description}</p>}
                <p className="card-meta">{c.works_count} रचनाएँ</p>
              </li>
            ))}
          </ul>
          <Pagination basePath="/sangrah" page={list.page} pageSize={list.page_size} total={list.total} />
        </>
      )}
    </div>
  );
}
