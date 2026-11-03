import type { Metadata } from 'next';
import Link from 'next/link';
import { api, type AuthorCard, type Paged } from '@/lib/api';
import { ALPHABET, TYPE_LABEL } from '@/lib/format';
import { absUrl } from '@/lib/site';
import { AuthorTile, Breadcrumbs, EmptyState, Pagination } from '@/components/parts';

export const metadata: Metadata = {
  title: 'रचनाकार',
  description: 'उजास के रचनाकारों की सूची।',
  alternates: { canonical: absUrl('/rachnakar') },
};
const PAGE_SIZE = 24;

export default async function AuthorsPage({
  searchParams,
}: { searchParams: Promise<{ page?: string; startswith?: string; type?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const startswith = sp.startswith && ALPHABET.includes(sp.startswith) ? sp.startswith : undefined;
  const type = sp.type && sp.type in TYPE_LABEL ? sp.type : undefined;
  const qs = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
  if (startswith) qs.set('startswith', startswith);
  if (type) qs.set('type', type);
  const list = await api<Paged<AuthorCard>>(`/authors?${qs}`);
  const link = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { startswith, type, ...extra };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/rachnakar?${s}` : '/rachnakar';
  };
  return (
    <div className="frame page">
      <Breadcrumbs items={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'रचनाकार' }]} />
      <h1>रचनाकार</h1>
      <p className="lead-text">उजास पर प्रकाशित रचनाओं के रचनाकार। वर्ण या रचना के प्रकार से चुनें।</p>
      <nav className="filters alphabet" aria-label="वर्णानुक्रम">
        <ul>
          <li>{startswith ? <Link href={link({ startswith: undefined })}>सभी</Link> : <span aria-current="true">सभी</span>}</li>
          {ALPHABET.map((l) => (
            <li key={l}>{startswith === l ? <span aria-current="true">{l}</span> : <Link href={link({ startswith: l })}>{l}</Link>}</li>
          ))}
        </ul>
      </nav>
      <nav className="filters" aria-label="रचना का प्रकार">
        <ul>
          <li>{type ? <Link href={link({ type: undefined })}>सभी प्रकार</Link> : <span aria-current="true">सभी प्रकार</span>}</li>
          {Object.entries(TYPE_LABEL).map(([k, label]) => (
            <li key={k}>{type === k ? <span aria-current="true">{label}</span> : <Link href={link({ type: k })}>{label}</Link>}</li>
          ))}
        </ul>
      </nav>
      {list.items.length === 0 ? (
        <EmptyState title="कोई रचनाकार नहीं मिला">
          <p><Link href="/rachnakar">पूरी सूची</Link> देखें।</p>
        </EmptyState>
      ) : (
        <>
          <ul className="author-grid">
            {list.items.map((a) => (
              <AuthorTile key={a.slug} a={a} />
            ))}
          </ul>
          <Pagination basePath="/rachnakar" page={list.page} pageSize={list.page_size} total={list.total} params={{ startswith, type }} />
        </>
      )}
    </div>
  );
}
