import type { Metadata } from 'next';
import Link from 'next/link';
import { api, type IssueCard, type Paged } from '@/lib/api';
import { absUrl } from '@/lib/site';
import { Breadcrumbs, EmptyState, Pagination, Picture } from '@/components/parts';

export const metadata: Metadata = {
  title: 'ई-पत्रिका',
  description: 'उजास के सभी अंक: ऑनलाइन पढ़ें।',
  alternates: { canonical: absUrl('/e-patrika') },
};
const PAGE_SIZE = 12;
interface Archive extends Paged<IssueCard> { years: number[]; current: (IssueCard & { editorial_intro: string | null }) | null }

function IssueTile({ i }: { i: IssueCard }) {
  return (
    <article className="issue-tile">
      {i.cover && (
        <Link href={`/e-patrika/${i.slug}`} className="issue-cover" tabIndex={-1} aria-hidden="true">
          <Picture cover={i.cover} sizes="(min-width: 900px) 18rem, 70vw" />
        </Link>
      )}
      <h3><Link href={`/e-patrika/${i.slug}`}>{i.title}</Link></h3>
      <p className="card-meta">अंक {i.issue_number}{i.volume ? ` · खंड ${i.volume}` : ''} · {i.period_label}</p>
    </article>
  );
}

/** The current issue first, then every issue newest first with a year filter. Before the first issue: an honest empty page. */
export default async function MagazinePage({ searchParams }: { searchParams: Promise<{ page?: string; year?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const yearNum = Number(sp.year);
  const year = Number.isInteger(yearNum) && yearNum > 1900 && yearNum < 2200 ? yearNum : undefined;
  const qs = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE), ...(year ? { year: String(year) } : {}) });
  const data = await api<Archive>(`/issues?${qs}`);
  const none = data.total === 0 && !data.current && !year;

  return (
    <div className="frame page">
      <Breadcrumbs items={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'ई-पत्रिका' }]} />
      <h1>ई-पत्रिका</h1>
      {none ? (
        <EmptyState title="पहला अंक जल्द आ रहा है">
          <p>अभी कोई अंक प्रकाशित नहीं हुआ है। तब तक <Link href="/sahitya">साहित्य</Link> पढ़ें।</p>
        </EmptyState>
      ) : (
        <>
          {data.current && !year && page === 1 && (
            <section className="current-issue" aria-labelledby="current-h">
              <h2 id="current-h">नवीनतम अंक</h2>
              <div className="current-grid">
                {data.current.cover && (
                  <Link href={`/e-patrika/${data.current.slug}`} className="issue-cover" tabIndex={-1} aria-hidden="true">
                    <Picture cover={data.current.cover} sizes="(min-width: 900px) 24rem, 90vw" priority />
                  </Link>
                )}
                <div>
                  <p className="showcase-title">{data.current.title}</p>
                  <p className="card-meta">अंक {data.current.issue_number}{data.current.volume ? ` · खंड ${data.current.volume}` : ''} · {data.current.period_label}</p>
                  {data.current.editorial_intro && <p>{data.current.editorial_intro}</p>}
                  <p><Link className="button" href={`/e-patrika/${data.current.slug}`}>अंक पढ़ें</Link></p>
                </div>
              </div>
            </section>
          )}
          <section aria-labelledby="archive-h">
            <h2 id="archive-h">सभी अंक</h2>
            {data.years.length > 0 && (
              <nav className="filters" aria-label="वर्ष">
                <ul>
                  <li>{year ? <Link href="/e-patrika">सभी वर्ष</Link> : <span aria-current="true">सभी वर्ष</span>}</li>
                  {data.years.map((y) => (
                    <li key={y}>{year === y ? <span aria-current="true">{y}</span> : <Link href={`/e-patrika?year=${y}`}>{y}</Link>}</li>
                  ))}
                </ul>
              </nav>
            )}
            {data.items.length === 0 ? (
              <EmptyState title="इस वर्ष का कोई अंक नहीं है">
                <p><Link href="/e-patrika">सभी अंक</Link> देखें।</p>
              </EmptyState>
            ) : (
              <>
                <div className="issue-grid">
                  {data.items.map((i) => <IssueTile key={i.slug} i={i} />)}
                </div>
                <Pagination basePath="/e-patrika" page={data.page} pageSize={data.page_size} total={data.total} params={{ year: year ? String(year) : undefined }} />
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
