import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiOrNull, type Card, type IssueFull } from '@/lib/api';
import { formatDate, typeLabel } from '@/lib/format';
import { absUrl, jsonLd } from '@/lib/site';
import { AuthorLinks, Breadcrumbs, Picture } from '@/components/parts';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const i = await apiOrNull<IssueFull>(`/issues/${encodeURIComponent(slug)}`);
  if (!i) return { title: 'पृष्ठ नहीं मिला' };
  const description = i.editorial_intro?.slice(0, 200) ?? `उजास अंक ${i.issue_number}: ${i.period_label}`;
  const url = absUrl(`/e-patrika/${i.slug}`);
  return {
    title: `${i.title} (अंक ${i.issue_number})`, description, alternates: { canonical: url },
    openGraph: { type: 'website', title: i.title, description, url, locale: 'hi_IN', ...(i.cover ? { images: [absUrl(i.cover.url)] } : {}) },
  };
}

/** Consecutive items with the same section label form one group under a heading. */
function groups(items: IssueFull['items']) {
  const out: Array<{ label: string | null; items: IssueFull['items'] }> = [];
  for (const it of items) {
    const last = out.at(-1);
    if (last && last.label === it.section_label) last.items.push(it);
    else out.push({ label: it.section_label, items: [it] });
  }
  return out;
}

export default async function IssuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const issue = await apiOrNull<IssueFull>(`/issues/${encodeURIComponent(slug)}`);
  if (!issue) notFound();
  const ld = {
    '@context': 'https://schema.org', '@type': 'PublicationIssue', name: issue.title, issueNumber: String(issue.issue_number),
    datePublished: issue.publication_date, inLanguage: 'hi', url: absUrl(`/e-patrika/${issue.slug}`),
    ...(issue.volume ? { isPartOf: { '@type': 'PublicationVolume', volumeNumber: issue.volume } } : {}),
    ...(issue.cover ? { image: absUrl(issue.cover.url) } : {}),
  };
  const grouped = groups(issue.items);
  const link = (c: Card) => `/rachna/${c.slug}?issue=${encodeURIComponent(issue.slug)}`;
  return (
    <div className="frame page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <Breadcrumbs items={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'ई-पत्रिका', href: '/e-patrika' }, { label: issue.title }]} />
      <div className="issue-head">
        {issue.cover && (
          <figure className="cover issue-cover-large">
            <Picture cover={issue.cover} sizes="(min-width: 900px) 22rem, 90vw" priority />
            {issue.cover.credit && <figcaption>{issue.cover.credit}</figcaption>}
          </figure>
        )}
        <div>
          <h1>{issue.title}</h1>
          <dl className="facts">
            <div><dt>अंक</dt><dd>{issue.issue_number}{issue.volume ? ` · खंड ${issue.volume}` : ''}</dd></div>
            <div><dt>अवधि</dt><dd>{issue.period_label}</dd></div>
            <div><dt>प्रकाशन तिथि</dt><dd>{formatDate(issue.publication_date)}</dd></div>
            {issue.publication_details && <div><dt>प्रकाशन विवरण</dt><dd>{issue.publication_details}</dd></div>}
          </dl>
          {issue.editorial_intro && <p className="lead-text">{issue.editorial_intro}</p>}
        </div>
      </div>

      <h2>इस अंक में</h2>
      {grouped.length === 0 ? (
        <p className="muted">इस अंक की रचनाएँ अभी उपलब्ध नहीं हैं।</p>
      ) : (
        grouped.map((g, gi) => (
          <section key={gi} className="issue-section" aria-labelledby={g.label ? `sec-${gi}` : undefined}>
            {g.label && <h3 id={`sec-${gi}`}>{g.label}</h3>}
            <ol className="contents-list">
              {g.items.map((it) => (
                <li key={it.content.slug}>
                  <h4 className="card-title"><Link href={link(it.content)}>{it.content.title}</Link></h4>
                  <p className="card-meta">
                    {typeLabel(it.content.type)}
                    {it.content.authors.length > 0 && <> · <AuthorLinks authors={it.content.authors} /></>}
                  </p>
                  <p className="card-excerpt">{it.content.excerpt}</p>
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}
