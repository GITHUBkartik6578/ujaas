import type { Metadata } from 'next';
import Link from 'next/link';
import { api, type CategoryRow, type Card, type Paged } from '@/lib/api';
import { TYPE_LABEL } from '@/lib/format';
import { absUrl } from '@/lib/site';
import { Breadcrumbs, CardGrid, EmptyState, Pagination } from '@/components/parts';

export const metadata: Metadata = {
  title: 'साहित्य',
  description: 'उजास पर प्रकाशित कविता, कहानी, ग़ज़ल, विचार और अन्य रचनाएँ।',
  alternates: { canonical: absUrl('/sahitya') },
};

const PAGE_SIZE = 12;

export default async function LiteraturePage({ searchParams }: { searchParams: Promise<{ page?: string; type?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const type = sp.type && sp.type in TYPE_LABEL ? sp.type : undefined;
  const qs = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE), ...(type ? { type } : {}) });
  const [list, cats] = await Promise.all([
    api<Paged<Card>>(`/contents?${qs}`),
    api<{ items: CategoryRow[] }>('/categories'),
  ]);
  return (
    <div className="frame page">
      <Breadcrumbs items={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'साहित्य' }]} />
      <h1>साहित्य</h1>
      <p className="lead-text">कविता, कहानी, ग़ज़ल, विचार और अन्य प्रकाशित रचनाएँ।</p>
      <nav className="filters" aria-label="श्रेणियाँ">
        <ul>
          {cats.items.map((c) => (
            <li key={c.slug}>
              <Link href={`/sahitya/${c.slug}`}>{c.name} ({c.works_count})</Link>
            </li>
          ))}
        </ul>
      </nav>
      <nav className="filters" aria-label="रचना का प्रकार">
        <ul>
          <li>{type ? <Link href="/sahitya">सभी</Link> : <span aria-current="true">सभी</span>}</li>
          {Object.entries(TYPE_LABEL).map(([k, label]) => (
            <li key={k}>{type === k ? <span aria-current="true">{label}</span> : <Link href={`/sahitya?type=${k}`}>{label}</Link>}</li>
          ))}
        </ul>
      </nav>
      {list.items.length === 0 ? (
        <EmptyState title="अभी कोई रचना प्रकाशित नहीं है">
          <p>कृपया बाद में देखें, या <Link href="/khoj">खोज</Link> आज़माएँ।</p>
        </EmptyState>
      ) : (
        <>
          <CardGrid items={list.items} />
          <Pagination basePath="/sahitya" page={list.page} pageSize={list.page_size} total={list.total} params={{ type }} />
        </>
      )}
    </div>
  );
}
